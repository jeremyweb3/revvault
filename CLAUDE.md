# RevVault: rules for agents working in this repo

Read `README.md`, `docs/handoffs/00-overview.md` and `docs/handoffs/contracts.md` before touching code.

## Safety rules (apply to every agent and sub-agent)
- **Never run `curl ... | sh` or any remote installer.** The `near-smart-contracts` skill lists three (rustup, cargo-near, near-cli-rs). They are already installed through `cargo install`. Ask the user instead.
- **Never read, print or commit `.env`, key files or `~/.near-credentials`.** Refer to env var names only (`NEAR_ACCOUNT_ID`, `NEAR_PRIVATE_KEY`, `ONE_CLICK_API_KEY`).
- **Testnet only, throwaway accounts only.** No mainnet transaction, no real funds, no signing with a personal wallet. The mainnet Intents quote preview is a dry quote script and moves no funds.
- **Do not install new skills, MCP servers or global packages** without the user approving that exact item. Changes to dependencies go through `docs/handoffs/DEPS.md`.
- **Do not create tasks in Monkies, post to X, send email, or push to a public repo** without the user's explicit yes at that step.
- **Build limits:** the machine has 14 GB RAM. Run builds through the existing `cargo`/`npm` shims (4 cores). Do not run two heavy builds at once.

## Stack decisions
- Contracts: Rust, near-sdk 5.x, no test suites (owner decision 2026-11-08); checks are `cargo check`/`clippy`, eslint/`tsc --noEmit`, plus the live testnet loop (`scripts/deploy.ts --live`, `scripts/seed.ts --live`). Chain client in `scripts/` is `near-api-js` 7.4.0 (local to `scripts/`).
- The `near-dapp` skill: use Path B only (`near-connect-hooks`, `@hot-labs/near-connect`), never `create-near-app`.
- NEAR Intents has no testnet. Never claim a testnet Intents payout in the UI, README or video.

## Honesty constraints (repeat in README, UI copy and the pitch)
- Only revenue routed through the RevVault pay link counts as collateral.
- Meta transactions do not redirect revenue.
- Positioning (owner decision 2026-11-08): the project keeps the "first" framing from `PRD.md`, worded as the PRD words it: "berpotensi first-of-its-kind", "belum ditemukan di ekosistem/dApps publik". Do not state "first" as proven fact, do not claim "no competitor exists", and do not cite the Colosseum or Ping Subscription claims as verified. bond.credit lists NEAR; leave it in the competitor table.
- APY is illustrative. Repayment is economic, not legal. The demo uses mock data until contracts are wired.
