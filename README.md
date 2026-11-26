# AgentPresence

**Daily check-in for Binance Agent ID holders on BNB Chain.**

Check in once per UTC day, build your streak, and claim soulbound
**Presence Badges** at 3 / 7 / 14 / 30 total check-ins. Presence is proven,
not bought: badges cannot be transferred or sold, ever.

- 🌐 Live site: TBD (GitHub Pages, `site/index.html`)
- 📜 Contract (BNB Chain): **TBD** — address published here after deployment
- 🆔 Agent ID registry: `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` (official, BSC)

## How Agent ID is used

Agent ID is the gate, the identity, and the scoreboard of this product:

1. **Registry gate** — `checkIn()` calls `balanceOf` on the official Agent ID
   registry (`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`). Wallets without an
   Agent ID cannot check in at all. No sign-up, no allowlist, no admin key:
   holding the identity *is* the account.
2. **Per-day identity-bound check-in** — one check-in per Agent ID per UTC
   day (`block.timestamp / 86400`). Streaks increment on consecutive days and
   reset after a gap, all keyed to the Agent ID holder's address.
3. **Soulbound badges** — at 3 / 7 / 14 / 30 lifetime check-ins the agent
   claims a Presence Badge (ERC-721 `PRES`). Every transfer and approval
   function reverts, so a badge can only ever be *earned* by the identity
   that holds it.
4. **Public counters** — `distinctAgentCount()` and `totalCheckInCount()`
   are readable by anyone, so participation is verifiable on-chain in real
   time.

## Architecture

| Piece | File | Notes |
|---|---|---|
| Check-in + badge contract | `contracts/AgentPresence.sol` | One self-contained Solidity file (`^0.8.24`, no imports). Hand-rolled minimal ERC-721 surface; the only external call is the registry `balanceOf`. Owner can only set badge metadata URIs. No payable functions. |
| Mock registry (tests only) | `contracts/MockAgentIdRegistry.sol` | Minimal ERC-721 stand-in for the Agent ID registry. **Never deploy to a live network.** |
| Web app | `site/index.html` | Single static page (ethers v6 via CDN): live counters, wallet connect, BSC network switch, check-in, stats, badge claims, and a clear "you need an Agent ID" state for non-holders. |
| Build | `scripts/compile.js` | Compiles with `solc` (optimizer 200 runs, EVM `shanghai`) into `artifacts/`. |
| Tests | `test/local-test.js` | Full flow on a local ganache chain (see below). |

Badge metadata URIs are stored per tier on-chain (`setTierURI`, owner-only)
and returned by `tokenURI`.

## Build & test locally

Requirements: Node.js 18+.

```bash
npm install        # solc, ganache, ethers (dev tooling only)
npm run compile    # writes artifacts/AgentPresence.json + MockAgentIdRegistry.json
npm test           # deploys to a LOCAL ganache chain and runs 21 checks
```

The test suite covers: non-holders cannot check in; one check-in per day;
streak increments on consecutive days and resets after a gap; badge claims
revert before the threshold and after a duplicate claim; badge transfers and
approvals revert (soulbound); and the global counters stay correct as more
agents join. All tests run locally — no live network, no real keys.

## Deployment (BNB Chain)

1. Deploy `AgentPresence` with constructor arguments
   `(0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F, <owner address>)`.
2. Verify the source (Sourcify / BscScan) — the contract is a single file
   with no dependencies, so verification is straightforward.
3. Set `CONTRACT_ADDRESS` in `site/index.html`, publish `site/` (e.g. GitHub
   Pages), and optionally set per-tier badge metadata with `setTierURI`.

Estimated deploy cost: ~1.06M gas (≈ 0.00005 BNB at 0.05 gwei), measured on a
local chain with the exact deployment bytecode in `artifacts/`.

## Binance Wallet Agent ID Hackathon

AgentPresence is an entry to the **Binance Wallet Agent ID Hackathon**
(60,000 USDC total prize pool), submitted for the **Project Awards** —
including the **Agent Application Innovation Award** track, which rewards
live products that Agent ID holders actually use. The contract's public
counters (distinct agents, total check-ins) exist precisely so that usage
is transparent and auditable during the judging window.

- Submission period ends: **9 December 2026, 15:00 WIB** (08:00 UTC)
- Contract address: **TBD**
- Live site: **TBD**

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Sastra Wiguna.
