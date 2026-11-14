# 03 — Demo agent, Intents preview, scripts (R3)

You cannot ask the user questions; everything is in this file, `contracts.md` and the linked research.

## Context — read first
- `docs/handoffs/00-overview.md` (demo path, timeline), `docs/handoffs/contracts.md` (**all**: §3-§7 contract surface, §10 vendor labelling, §11 preview artifact, §12 env names, §13 make targets, §15 honesty).
- `docs/research/02-tech-stack.md`: Findings "NEAR Intents / 1Click (open questions 1 and 2)" (**mainnet only; no testnet**), "Sub-accounts, function-call keys", "cargo-near"; Recommendations "1Click verdict and honest fallback", "Effort"; Implications: demo-agent+intents.
- `docs/research/05-synthesis.md`: D2, D3, D4, D9, D10, assumption 5.
- `docs/research/04-repo-audit.md`: Recommendations R3 (commands), R4 (`.env.example`), R10-R11 (ownership, DEPS rule), R6 (CI smoke).
- `docs/research/01-design-system.md`: Implications per role -> demo-agent+intents (vendor list, `ref` shape `inv_NNNN`, `/demo` script) and Findings 15 row `demo`.
- `docs/tech/architecture.md` ("Demo agent" under Off-chain pieces) and `docs/research/02-novelty-and-risks.md` R5 (Intents risk and fallback).

## Tools — skills and MCP
Installed only after the user approves `docs/research/06-tooling.md`; otherwise use docs.near.org and docs.near-intents.org.
- `near-api-js` (near/agent-skills): before writing any script that views/calls contracts, signs transactions, calls `ft_transfer_call`, `storage_deposit`.
- `near-intents` (near/agent-skills): before writing the 1Click preview (`/v0/tokens` -> dry quote). **Preview only: never run a wet quote, never deposit, never submit a deposit tx, never move real funds.** Use `dry: true`.
- `near-cli-rs`: only to compose commands for the README/deploy docs. Use keychain signing; never `export-account` or plaintext key signing.
- Optional `context7` MCP.
- Do not use the `curl | sh` Prerequisites of any skill.

## Owned paths
`scripts/**` (including `scripts/package.json`, `scripts/setup.sh`, `scripts/smoke.sh`, `scripts/agent/**`, `scripts/intents/**`, `scripts/seed.*`, `scripts/deploy.*`, tests under `scripts/**`), `deployments/**` (`testnet.json`, `intents-preview.json`). You import read-only from `app/lib/engine/` and `app/lib/api/types.ts` (R2) and `contracts/fixtures/**` (R1). You do not edit root files (`package.json`, lockfiles, `Makefile`, `.env.example`, `.gitignore`, `README.md`, `.github/**`), `app/**`, or `contracts/**`; request dependencies/env/make targets through `docs/handoffs/DEPS.md`.

## Responsibilities
Provide every script the root `Makefile` calls: setup, smoke, deploy, seed, the autonomous demo agent (mock and testnet), and the NEAR Intents mainnet quote preview. Make the mock path need no env, no network and no wallet.

## Scope
### In scope
- `scripts/setup.sh` (called by `make setup`): verifies `rustup`/`corepack`, runs `rustup show` (installs the pinned toolchain + wasm target from `rust-toolchain.toml`), `corepack enable`, `pnpm install --frozen-lockfile`, prints next steps. It prints (not runs) a hint if `cargo-near` is missing; it never uses `curl | sh`.
- `scripts/smoke.sh`: start `next start` for the built app, wait for the port, `curl -f` `/`, `/demo`, `/app/business`, `/app/lp`, kill the server, non-zero exit on failure; then `pnpm --filter scripts agent --mock` must exit 0.
- `scripts/agent/`: TypeScript demo agent, "the autonomous business". `--mock`: runs the demo loop on `app/lib/engine/` and prints the story (limit 960 -> draw 500 to GPU-Provider -> repay 515 -> payments 500/1,000/1,500 -> loan closed -> limit 2,000) with the same `inv_NNNN` refs and event names as the UI. Testnet mode: uses a function-call key limited to `request_draw`/`set_repay_share` for draws, and a separate funded testnet account to pay the pay link via `ft_transfer_call` (1 yoctoNEAR) with `msg {"action":"pay",...}`.
- `scripts/deploy.*` and `scripts/seed.*`: create/derive testnet accounts (documented, keys from env only), deploy `mock-usdc` and `revvault` wasm (built by R1; use `cargo near build non-reproducible-wasm` or plain `cargo build --target wasm32-unknown-unknown --release`), `new(...)` with the contracts.md §2 defaults, `storage_deposit` for vault/business/vendors/LPs, mint mock USDC, seed vault liquidity (LP deposit 25,000), seed 30 days of routed revenue by real pay calls where practical or document why the testnet history starts small, add the agent function-call key, write `deployments/testnet.json` (ids, tx hashes, timestamp).
- `scripts/intents/`: mainnet read-only preview. `GET /v0/tokens`, one `dry: true` quote built from the OpenAPI schema (`https://1click.chaindefuser.com/docs/v0/openapi.yaml`) or `@defuse-protocol/one-click-sdk-typescript` (request via DEPS.md if used); writes `deployments/intents-preview.json` per contracts.md §11; on error writes `quote: null` and `error`. Works unauthenticated; `ONECLICK_API_KEY` optional.
### Out of scope
- Any real Intents payout or wet quote; funds on mainnet; a relayer; a persistent agent server; LLM calls; an indexer or attested score.
- Contract code, frontend code, root files, README, CI, video.
- Per-business sub-accounts.

## Objectives
1. `make agent` tells the whole demo story offline with exit 0.
2. `make deploy && make seed && make agent-testnet` reproduces one full loop on testnet and records ids and tx hashes.
3. The Intents preview is honest: dry quote, "no funds moved", or a clear failure.

## Requirements
| # | Priority | Requirement |
|---|---|---|
| 1 | P0 | Day-1 Intents spike: `GET /v0/tokens` works; build one valid `dry:true` quote (the researcher's hand-built probe returned HTTP 500: use schema examples or the SDK). Report whether it works unauthenticated, the fee shown, and key lead time at https://partners.near-intents.org/. |
| 2 | P0 | `scripts/package.json` (private) with scripts `agent` (`--mock` flag), `typecheck`, `lint`, `test`; TypeScript strict. Dependencies via DEPS.md Day 1: `tsx`, `typescript`, `near-api-js@7.4.0`. |
| 3 | P0 | `agent --mock` story as above, deterministic output, asserts its own numbers against `contracts.md` §4 and exits non-zero on mismatch. No env, no network. |
| 4 | P0 | `scripts/setup.sh` and `scripts/smoke.sh` as above, executable, `set -euo pipefail`. |
| 5 | P0 | `deploy` + `seed` scripts producing `deployments/testnet.json` (no private keys in it). Needs R1's wasm (Day 5). Keys only from env names in contracts.md §12. |
| 6 | P0 | `agent-testnet`: one full loop on testnet: draw 500 to `GPU-Provider`, three pay-link payments (500/1,000/1,500 mock USDC), loan closes; prints tx hashes and explorer links; appends them to `deployments/testnet.json`. |
| 7 | P1 | `intents` preview script + `deployments/intents-preview.json` (a real run, or an honest `error`). |
| 8 | P1 | Agent testnet mode uses the function-call key for `request_draw` and proves the key cannot attach a deposit or call `lp_withdraw` (negative test script, output logged). |
| 9 | P1 | `agent --mock --seed-delinquent` shows the delinquent path (past due -> limit 0). |
| 10 | P1 | Unit tests for the agent's numbers using `contracts/fixtures/math-vectors.json`. |
| 11 | P2 | Optional `--loop N` mode running several draw/repay cycles. |
| 12 | P2 | `demo-time` build helper script if R1 ships the feature and the PM approves a labelled demo deployment. |

## Dependencies
- R4 Day-1 skeleton (pnpm workspace includes `scripts`, `Makefile` targets call your scripts).
- R2: `app/lib/engine/` and `app/lib/api/types.ts` (Day 3); until then, stub against the worked example in contracts.md §4.
- R1: wasm artefact paths and `contracts/fixtures` (Day 3-5).
- The user: a funded throwaway testnet deployer (env names only). If testnet faucet access is missing, report it; do not try to obtain keys.

## Constraints
- Honesty (verbatim, applies to all console output and docs you write): only routed revenue counts as collateral; Meta Transactions do not redirect revenue; not first-of-its-kind on NEAR (bond.credit lists NEAR); APY is illustrative; repayment is economic, not legal; the demo uses mock data until contracts are wired. Plus: Intents has no testnet, so testnet vendor payout is `ft_transfer`; Intents output is always labelled "Mainnet quote preview — no funds moved".
- Never read, write or echo `.env*` or private keys; never log env values; `deployments/*.json` must contain no secrets. Throwaway testnet accounts only; never mainnet keys.
- Never wet-quote, deposit or swap on mainnet.
- No comments in code, TS strict, no `any`, no `@ts-ignore`, no `!` to silence nullables. Shell scripts: no comments either, `set -euo pipefail`.
- Money is bigint/strings. Reuse R2's engine; do not re-implement the math.
- No new dependency without DEPS.md. Do not edit lockfiles; use `--frozen-lockfile`.
- Never `git commit/push`/`git add -A`/`.`.
- English everywhere.

## Deliverables
| Item | Priority |
|---|---|
| `scripts/package.json`, `scripts/setup.sh`, `scripts/smoke.sh` | P0 |
| `scripts/agent/` with `--mock` | P0 |
| `scripts/deploy.*`, `scripts/seed.*`, `deployments/testnet.json` | P0 |
| `agent-testnet` loop with logged tx hashes | P0 |
| `scripts/intents/` + `deployments/intents-preview.json` | P1 |
| Function-call-key negative test log | P1 |
| Report: spike results, ids, tx hashes, README block (commands, expected output, Intents honesty paragraph) | P0 |

## Acceptance criteria
1. From a clean checkout with the toolchain: `pnpm --filter scripts agent --mock` exits 0, prints the demo story with numbers 960 / 500 / 515 / 415 / 215 / 0 / 2,000 and `inv_` refs, and uses no network (run with networking disabled or confirm no outbound calls).
2. `bash scripts/smoke.sh` exits 0 against a built app and fails (non-zero) when a route returns non-200 (demonstrate by pointing at a wrong port).
3. `shellcheck scripts/*.sh` (if available) reports no errors; `pnpm --filter scripts typecheck` and `lint` exit 0.
4. `deployments/testnet.json` exists with revvault and mock-usdc ids, deployer, vendors, timestamps and tx hashes; `grep -i "private\|secret\|key" deployments/*.json` shows no secret material; each tx hash resolves on a testnet explorer (state which you checked).
5. `agent-testnet` run shows draw 500 -> three payments -> `loan_closed`, each with a tx hash; final `get_credit` shows `available` 2,000.
6. `deployments/intents-preview.json` validates against contracts.md §11 and has `noFundsMoved: true`; no wet quote or deposit call exists in `scripts/intents/` (`grep -rn "dry" scripts/intents` shows `dry: true` on every quote request).
7. `make setup`, `make agent` work on the R4 Makefile without env vars; `make deploy`/`seed`/`agent-testnet` fail with a clear message listing missing env names (not values) when unset.

## If behind schedule — cut first
1. P2s. 2. Function-call-key negative test. 3. Intents preview (write `quote: null, error: "not run"` so consumers hide it and say so). 4. Delinquent mode. Never cut: `--mock` story, setup/smoke scripts, deploy/seed, one testnet loop with tx hashes.
