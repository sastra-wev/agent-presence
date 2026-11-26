# AgentPresence — Hackathon Submission Materials

Binance Wallet Agent ID Hackathon — Project Awards (submission period ends
2026-12-09 08:00 UTC / 15:00 WIB). Submit via the "Submit Project Now" button on
the official announcement in the Binance app / Binance Square. Every field
below is ready to copy-paste.

## Project name
AgentPresence

## One-liner
Daily check-in for Binance Agent ID holders on BNB Chain — prove your agent is
alive, build streaks, earn soulbound Presence Badges.

## Website
https://sastra-wev.github.io/agent-presence/

## Open-source repository
https://github.com/sastra-wev/agent-presence

## Contract address (BNB Chain, verified)
0x20D9DD9a57E775A0000B5b7965F7dD0E5514C588
- BscScan: https://bscscan.com/address/0x20D9DD9a57E775A0000B5b7965F7dD0E5514C588
- Sourcify: exact match (creation + runtime), verified 2026-11-26
- Deploy tx: 0x2c0c42839bc389732136bcefa10058983dfa49934d4497fa0645e40521b5b34c

## Reward receiving address
0xcab17C71143178ea035a7b5f0E2C3b8D91F40186 (Binance Agentic Wallet, BNB Chain)

## Agent ID usage description (for the form)
AgentPresence is a live daily check-in dApp built entirely around Binance
Agent ID. The AgentPresence contract (BNB Chain) reads the official Agent ID
registry (0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F) on every interaction:
only an address that holds an Agent ID can check in — Agent ID is the identity
gate, the rate limiter (one check-in per identity per UTC day), and the
account system all at once, with no sign-up, no server, and no credentials
collected.

Each check-in records the agent's total check-ins, current streak, and longest
streak on-chain. At 3, 7, 14, and 30 lifetime check-ins, the holder can claim a
soulbound (non-transferable) Presence Badge — an ERC-721 that can only ever be
earned by an Agent ID identity showing up over time, mirroring the
non-transferable nature of Agent ID itself.

The contract exposes public counters (distinct Agent ID addresses that have
interacted, total check-ins), so the ecosystem can measure real Agent ID
activity transparently. The product is live: the contract is deployed and
source-verified (Sourcify exact match), the code is open-source (MIT), and the
dApp is hosted on GitHub Pages. There are no fees, no deposits, no approvals,
and no asset operations of any kind — check-in costs only a small amount of
BNB Chain gas.

Owner permissions (disclosed): the contract owner can only set the metadata
URI strings for badge tiers (setTierURI) and transfer/renounce ownership. The
owner cannot mint badges directly, cannot move or freeze user assets (the
contract never holds any), cannot pause check-ins, and cannot change the
Agent ID registry gate after deployment.

## Tracks targeted
- Agent ID Ecosystem Pioneer Award (ranked by interacting Agent ID addresses
  and transaction count — the check-in mechanic is built for daily repeat
  interaction)
- Agent Application Innovation Award (live product; eligibility needs >= 30
  distinct Agent ID addresses interacting during the submission period)

## Builder
Sastra Wiguna — Agent ID: sastra10.ai — GitHub: sastra-wev
