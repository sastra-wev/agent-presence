// Local end-to-end tests for AgentPresence on an in-process ganache chain.
// Throwaway unlocked ganache accounts only — no real keys, no live network.
const fs = require("fs");
const path = require("path");
const ganache = require("ganache");
const { ethers } = require("ethers");

const DAY = 86400;
let passed = 0;
let failed = 0;

function pass(name) {
  passed++;
  console.log(`PASS  ${name}`);
}
function fail(name, extra) {
  failed++;
  console.log(`FAIL  ${name}${extra ? " — " + extra : ""}`);
}
function check(name, cond, extra) {
  if (cond) pass(name);
  else fail(name, extra);
}
async function expectRevert(name, promise) {
  try {
    const res = await promise;
    // A send can resolve even when the mined tx reverts (pre-flight gas
    // estimation may run against a slightly stale block), so confirm via
    // the receipt as well: wait() throws on a status-0 receipt.
    if (res && typeof res.wait === "function") await res.wait();
    fail(name, "did not revert");
  } catch (e) {
    pass(name);
  }
}

function loadArtifact(name) {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "artifacts", `${name}.json`), "utf8")
  );
}

async function main() {
  const server = ganache.server({ logging: { quiet: true }, chain: { chainId: 31337 } });
  await server.listen(0);
  const port = server.address().port;
  const provider = new ethers.JsonRpcProvider(`http://127.0.0.1:${port}`);

  const deployer = await provider.getSigner(0);
  const alice = await provider.getSigner(1);
  const bob = await provider.getSigner(2);
  const carol = await provider.getSigner(3); // never holds an Agent ID
  const deployerAddr = await deployer.getAddress();
  const aliceAddr = await alice.getAddress();
  const bobAddr = await bob.getAddress();

  // --- Deploy -------------------------------------------------------------
  const mockArt = loadArtifact("MockAgentIdRegistry");
  const mock = await new ethers.ContractFactory(mockArt.abi, mockArt.bytecode, deployer).deploy();
  await mock.waitForDeployment();

  const apArt = loadArtifact("AgentPresence");
  const apFactory = new ethers.ContractFactory(apArt.abi, apArt.bytecode, deployer);
  const presence = await apFactory.deploy(await mock.getAddress(), deployerAddr);
  const deployReceipt = await presence.deploymentTransaction().wait();
  await presence.waitForDeployment();
  const presenceAddr = await presence.getAddress();
  console.log(`AgentPresence deployed at ${presenceAddr}`);
  console.log(`Deploy gas used: ${deployReceipt.gasUsed}`);
  console.log(
    `Creation bytecode size: ${apArt.bytecodeSizeBytes} bytes; deployed size: ${apArt.deployedBytecodeSizeBytes} bytes`
  );

  const apAlice = presence.connect(alice);
  const apBob = presence.connect(bob);
  const apCarol = presence.connect(carol);

  // Give Alice and Bob a (mock) Agent ID. Carol gets none.
  await (await mock.mint(aliceAddr)).wait();
  await (await mock.mint(bobAddr)).wait();
  check("hasAgentId true for holder", (await presence.hasAgentId(aliceAddr)) === true);
  check("hasAgentId false for non-holder", (await presence.hasAgentId(await carol.getAddress())) === false);

  // --- Check-in rules -------------------------------------------------------
  await expectRevert("non-holder cannot check in", apCarol.checkIn());

  await (await apAlice.checkIn()).wait();
  let stats = await presence.getAgentStats(aliceAddr);
  check(
    "holder check-in: total=1, streak=1",
    stats[0] === 1n && stats[1] === 1n,
    `got total=${stats[0]} streak=${stats[1]}`
  );

  await expectRevert("second check-in same day reverts", apAlice.checkIn());

  // Next UTC day: streak increments.
  await provider.send("evm_increaseTime", [DAY]);
  await provider.send("evm_mine", []);
  await (await apAlice.checkIn()).wait();
  stats = await presence.getAgentStats(aliceAddr);
  check(
    "next-day check-in: total=2, streak=2",
    stats[0] === 2n && stats[1] === 2n,
    `got total=${stats[0]} streak=${stats[1]}`
  );

  // Skip two days: streak resets to 1, total reaches 3.
  await provider.send("evm_increaseTime", [3 * DAY]);
  await provider.send("evm_mine", []);
  await (await apAlice.checkIn()).wait();
  stats = await presence.getAgentStats(aliceAddr);
  check(
    "after gap: total=3, streak reset to 1, longest streak kept at 2",
    stats[0] === 3n && stats[1] === 1n && stats[2] === 2n,
    `got total=${stats[0]} streak=${stats[1]} longest=${stats[2]}`
  );

  // --- Badge rules ----------------------------------------------------------
  await (await apBob.checkIn()).wait(); // Bob: total = 1
  await expectRevert("badge claim before threshold reverts", apBob.claimBadge(1));

  await (await apAlice.claimBadge(1)).wait(); // Alice: total = 3
  check("badge balance after tier-1 claim", (await presence.balanceOf(aliceAddr)) === 1n);
  check("badge owner is Alice", (await presence.ownerOf(1)) === aliceAddr);
  check("badge tier recorded", (await presence.tokenTier(1)) === 1n);
  stats = await presence.getAgentStats(aliceAddr);
  check("badge mask bit 0 set", stats[4] === 1n, `mask=${stats[4]}`);

  await expectRevert("second claim of same tier reverts", apAlice.claimBadge(1));
  await expectRevert(
    "badge transfer reverts (soulbound)",
    apAlice.transferFrom(aliceAddr, bobAddr, 1)
  );
  await expectRevert(
    "badge safeTransferFrom reverts (soulbound)",
    apAlice["safeTransferFrom(address,address,uint256)"](aliceAddr, bobAddr, 1)
  );
  await expectRevert("badge approve reverts (soulbound)", apAlice.approve(bobAddr, 1));

  // --- Global counters --------------------------------------------------------
  let distinct = await presence.distinctAgentCount();
  let total = await presence.totalCheckInCount();
  check(
    "counters after 2 agents: distinct=2, total=4",
    distinct === 2n && total === 4n,
    `got distinct=${distinct} total=${total}`
  );

  // Third holder joins.
  const dave = await provider.getSigner(4);
  const daveAddr = await dave.getAddress();
  await (await mock.mint(daveAddr)).wait();
  await (await presence.connect(dave).checkIn()).wait();
  distinct = await presence.distinctAgentCount();
  total = await presence.totalCheckInCount();
  check(
    "counters after 3rd agent: distinct=3, total=5",
    distinct === 3n && total === 5n,
    `got distinct=${distinct} total=${total}`
  );

  // ERC-165 surface.
  check("supports ERC-721 interface", (await presence.supportsInterface("0x80ac58cd")) === true);
  check("supports ERC-165 interface", (await presence.supportsInterface("0x01ffc9a7")) === true);
  check("name/symbol", (await presence.name()) === "Presence Badge" && (await presence.symbol()) === "PRES");

  await server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("FATAL", e);
  process.exit(1);
});
