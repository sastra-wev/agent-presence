// Compile contracts/*.sol with solc (optimizer on, 200 runs) and write
// ABI + bytecode artifacts to artifacts/.
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const root = path.join(__dirname, "..");
const contractsDir = path.join(root, "contracts");
const artifactsDir = path.join(root, "artifacts");

const files = fs.readdirSync(contractsDir).filter((f) => f.endsWith(".sol"));
const sources = {};
for (const f of files) {
  sources[f] = { content: fs.readFileSync(path.join(contractsDir, f), "utf8") };
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    // Pinned to shanghai: broadly supported (BSC + local ganache) and avoids
    // newer opcodes (e.g. MCOPY) that some local chains reject.
    evmVersion: "shanghai",
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

let failed = false;
for (const e of output.errors || []) {
  console.log(`${e.severity}: ${e.formattedMessage}`);
  if (e.severity === "error") failed = true;
}
if (failed) process.exit(1);

fs.mkdirSync(artifactsDir, { recursive: true });
for (const [file, contracts] of Object.entries(output.contracts)) {
  for (const [name, c] of Object.entries(contracts)) {
    if (!c.evm.bytecode.object) continue; // interfaces have no bytecode
    const artifact = {
      contractName: name,
      source: file,
      abi: c.abi,
      bytecode: "0x" + c.evm.bytecode.object,
      deployedBytecode: "0x" + c.evm.deployedBytecode.object,
      bytecodeSizeBytes: c.evm.bytecode.object.length / 2,
      deployedBytecodeSizeBytes: c.evm.deployedBytecode.object.length / 2,
      compiler: solc.version(),
    };
    fs.writeFileSync(path.join(artifactsDir, `${name}.json`), JSON.stringify(artifact, null, 2));
    console.log(
      `${name}: creation bytecode ${artifact.bytecodeSizeBytes} bytes, deployed ${artifact.deployedBytecodeSizeBytes} bytes`
    );
  }
}
console.log("Artifacts written to artifacts/");
