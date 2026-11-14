> **SUPERSEDED 2026-11-08** by `docs/brainstorm/2026-11-08-prd-alignment.md` and `docs/handoffs/00-overview.md`. Where this file disagrees (Next.js port, starter limit, split 25%, term 30, reserve 10%), the 2026-11-08 plan wins.

# 05 — Synthesis (PM, 2026-11-04)

Inputs read in full: 01-design-system, 02-tech-stack, 04-repo-audit, 06-tooling (proposal), plus docs/PRD.md and the docs it cites. Domain track was skipped: 00-hackathon-brief, 01-competitive-landscape and 02-novelty-and-risks cover it.

## Decisions

| # | Decision | Driven by | Rejected |
|---|---|---|---|
| D1 | Backend = **one Rust near-sdk 5.30.0 contract** (`revvault`, modules router/vault/credit/loans) + separate `mock-usdc` NEP-141 crate. Shared router, no per-business sub-accounts. | 02-tech-stack (effort table: ~6.5 of 10 days; sub-account/FCAK path unverified); contracts-spec recommendation | Vault+router split; per-business sub-account routers; Chain Signatures |
| D2 | There is **no separate backend server**. Reads are plain JSON-RPC `call_function` from the browser to `https://test.rpc.fastnear.com` (CORS open, no key). Off-chain code is limited to Node/TS scripts (seed, deploy, demo agent, Intents preview). | 02-tech-stack (RPC probe 2026-11-04) | Express/Next API proxy; indexer; relayer server |
| D3 | **Vendor payout on testnet = real `ft_transfer` of mock USDC.** NEAR Intents has no testnet and no plan for one; 1Click is mainnet only. Intents appears as a labelled **mainnet dry-quote preview** produced by a script. UI/README never say funds moved via Intents on testnet. | 02-tech-stack 1Click verdict [S16][S17] | Real Intents payout inside the contract; spending real mainnet funds |
| D4 | **Gasless relayer (NEP-366) is cut.** Payer needs 1 yoctoNEAR on `ft_transfer_call`; relayer cannot supply deposits. "Relayer pays gas for payers" is removed from claims. | 02-tech-stack relayer verdict [S12] | Building pagoda-relayer-rs |
| D5 | **Attested score and indexer are cut** (first on the cut order). Credit = router-native only. | PRD cut order | NEAR Lake / attestations |
| D6 | **Repay split default = 20%** (2000 bps), per PRD and screens doc; the frontend changes its 25% seed and landing copy. The split is a per-business parameter that may only increase while a loan is open. | 01-design-system contradiction row; PRD:25 | Keeping 25% |
| D7 | Frontend = **Next.js 16.4.5 + React 19.3.1 + TypeScript strict, plain CSS ported from the prototype**. No Tailwind, no shadcn, no chart or motion library (prototype uses none). Dependencies allowed: next, react, react-dom, typescript, eslint tooling, `@hot-labs/near-connect`. Anything else goes through DEPS.md. | 01-design-system (prototype is plain CSS, no libs); standing rule "no new dependency without asking" | Tailwind/shadcn per docs/ui/00 (prototype wins per PRD) |
| D8 | Wallet = `@hot-labs/near-connect` 0.12.0, `network: "testnet"`, client-only. A demo-key fallback guarantees the live path never blocks on a wallet. | 02-tech-stack wallet section | wallet-selector (in transition) |
| D9 | Shared credit math: R2 owns a framework-free TS engine at `app/lib/engine/`; the demo agent imports it read-only. R1 owns `contracts/fixtures/math-vectors.json`; both the Rust tests and the TS engine tests assert the same vectors. | 04-repo-audit open question 1 | Duplicating math without fixtures |
| D10 | Toolchain: `rust-toolchain.toml` pins **1.95.0** (near-sdk 5.30.0 MSRV) with `wasm32-unknown-unknown`; contracts role verifies and reports. Virtual Cargo workspace at repo root so bare `cargo test` works. pnpm workspace (`app`, `scripts`). One `Makefile` command surface. | 02-tech-stack; 04-repo-audit R1-R5 | Workspace under `contracts/` only |
| D11 | Prototype stays at `prototype/` until the port is accepted (Day 9), then R4 moves it to `docs/design/prototype/`. | 04-repo-audit R2 | Moving it now |
| D12 | **Four roles**: R1 contracts, R2 frontend port, R3 demo agent + Intents preview + scripts, R4 submission/README/video/CI + all root files. R4 does a short Day-1 skeleton first. | 04-repo-audit R10 | A separate relayer or indexer role |
| D13 | Skills from `near/agent-skills` (proposal in 06-tooling) are installed only after the user approves; handoffs name them as conditional. | User instruction: propose, install after asking | Installing before the gate |

## Contradictions resolved

1. **Relayer for payers** (architecture.md) vs NEP-366 docs: docs win. Claim dropped (D4).
2. **Real Intents payout** (brief, build plan) vs "no testnet" (Intents FAQ): evidence wins. The cut order's item 2 ("real Intents payout, keep logged/mocked") is applied in advance: ft_transfer + labelled preview (D3). Cut order below is unchanged, but it now trims the *preview*, not a payout.
3. **Split 25% (prototype) vs 20% (PRD)**: PRD wins for the contract default; prototype wins for everything visual (D6).
4. **Rust version**: 02-tech-stack read `rustc 1.95.0`; the machine reports `1.99.1` (Arch `/usr/bin/rustc` precedes rustup). Both satisfy MSRV 1.95. Pin 1.95.0 and let R1 confirm; 04-repo-audit A3 (newest rustc wasm acceptance) is thereby avoided.
5. **Design doc vs prototype** (Geist/#00EC97/Tailwind vs Mona Sans/#7C98FF/plain CSS): prototype wins per PRD:15.
6. **Skill advice vs stack**: `near-smart-contracts` says near-api-rs replaces near-workspaces; the stack is fixed to near-workspaces 0.24.0 (still maintained).
7. **"Draw 500, send three payments, watch the loan close"** (prototype /demo copy, demo story) is arithmetically impossible: debt is 515, the demo buttons are 120/250/400 (770 total), at 20% that repays 154 (at 25%, 192). Closing at 20% needs ≥ 2,575 routed. Resolution: the demo-control payment buttons become **500 / 1,000 / 1,500** (three clicks = 3,000 routed, repay 515 exactly capped, loan closes, trailing revenue 2,400→5,400 so the limit rises from 960 to the 2,000 cap, which is the "limit grows" beat). Worked example is in contracts.md.
8. **Draw flow** modal (prototype) vs drawer (docs): modal on desktop, bottom sheet at ≤640px.
9. **Demo copy overclaims**: marquee "Meta transactions" (L:316), "Verified agent business" (I:453), "No collateral locked" (L:320), "Funds never touch the borrower" and "via NEAR Intents" must be conditional on mode or reworded. R2 owns the fix, R4 checks it.

## The stack, fixed

- Chain/network: NEAR testnet. Mock USDC (6 decimals, own FT). Mainnet used only for read-only 1Click `GET /v0/tokens` and `dry:true` quotes.
- Contracts: Rust 1.95.0, edition 2024, near-sdk =5.30.0, near-contract-standards =5.30.0, near-workspaces =0.24.0 (feature `unstable`), tokio, anyhow, cargo-near 0.22.0 (install needs user approval).
- App: Next.js 16.4.5, React 19.3.1, TypeScript ≥5.1 strict, pnpm 11.4.0, Node ≥22.22.2 (pin `.nvmrc` 24 after R2 confirms), `@hot-labs/near-connect` 0.12.0.
- Scripts: TypeScript on Node via tsx (R3 requests via DEPS.md), `near-api-js` 7.4.0, optional `@defuse-protocol/one-click-sdk-typescript` 0.1.26.
- Services: Vercel for the mock-mode hosted demo (needs the user's account); FastNEAR testnet RPC; no database, no server.
- Skills (conditional on approval): near-smart-contracts, near-contract-audit, near-cli-rs (contracts); near-dapp (frontend); near-intents, near-api-js (demo agent). Optional MCP: context7.

## Unverified assumptions that still stand (for the gate)

1. Bare `cargo test` can compile the wasm and fetch the 35.6 MB sandbox without `cargo-near` on PATH (15-minute spike in R1; fallback `make test` runs `cargo near build non-reproducible-wasm` first, and the README says so).
2. `ft_on_transfer` returning a Promise chain whose final callback returns the unused amount refunds correctly under gas limits (R1 proves with a failing-vendor test).
3. Which near-connect wallets work on testnet; works in a Next 16 client component with `ssr:false` (R2 verifies early, demo-key fallback exists).
4. Sub-account / function-call-key behaviours (open question 5): not needed for the shared-router design; the agent key restriction (no deposit) is standard NEAR but not re-read.
5. 1Click dry-quote call format (one probe returned HTTP 500); API key lead time. R3 spike.
6. Licence/provenance of `pixel-fantasy-bg.webp` and the Pawket-matching hero; MIT acceptable to the hackathon; Mona Sans self-hosting licence.
7. Competitor claims (open-questions 10, 11: Hobba, Clipstake, Roke.to, Ping, bond.credit live status) remain unverified; README must use only the safe positioning sentence.
8. Team size / who writes Rust is unknown; the plan assumes four parallel agents.
9. A hosted demo URL on Vercel needs the user's account and approval.
