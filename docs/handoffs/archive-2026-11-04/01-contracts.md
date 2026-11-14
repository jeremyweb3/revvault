# 01 — Contracts (R1)

## Context — read first
- `docs/handoffs/00-overview.md` (demo path, cut order, conventions) and `docs/handoffs/contracts.md` (**your spec**: §2 params, §3 methods, §4 math and worked example, §5 views, §6 events, §7 mock USDC, §15 honesty).
- `docs/research/02-tech-stack.md`: all of Findings "near-sdk and NEP-141", "near-workspaces and testing", "cargo-near", and Recommendations "ft_on_transfer routing sketch" and "Callback and rollback sketch". These are prose guidance; the cited docs are authoritative.
- `docs/research/05-synthesis.md` (D1, D3, D4, D5, D6, D10, D13 and assumptions 1, 2).
- `docs/research/04-repo-audit.md`: Recommendations R1 (layout), R5 (toolchain), R10 (ownership).
- `docs/tech/contracts-spec.md` and `docs/tech/architecture.md` (background; `contracts.md` overrides). `docs/research/02-novelty-and-risks.md` R3 (default risk) and R4.

## Tools — skills and MCP
Installed only after the user approves `docs/research/06-tooling.md`. If a skill is not present, use the NEAR docs instead.
- `near-smart-contracts` (near/agent-skills): before writing any contract code (state, `#[near]` macros, callbacks, storage, ft_on_transfer rules). **Overrides you must follow:** tests use **near-workspaces 0.24.0**, not near-api-rs/near-sandbox as the skill suggests; never run the skill's Prerequisites `curl | sh` installers; the user installs toolchains.
- `near-contract-audit`: run it as a checklist on the finished contract before the testnet deploy and again before Day 9; record findings fixed in your report.
- `near-cli-rs`: only to compose deploy/account commands for R3 and the README; never execute `export-account` or plaintext key signing.
- Optional `context7` MCP: docs lookup for near-sdk 5.30 and near-workspaces 0.24.

## Owned paths
`contracts/revvault/**`, `contracts/mock-usdc/**`, `contracts/tests/**`, `contracts/fixtures/**`, `contracts/INTERFACE.md`, `docs/tech/**`. Leaf `Cargo.toml` files under `contracts/*` are yours **except dependency additions**, which go through `docs/handoffs/DEPS.md`. You do not edit the root `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `Makefile`, `.github/**`, or anything under `app/` or `scripts/`.

## Responsibilities
Implement the `revvault` contract and the `mock-usdc` token exactly as specified in `contracts.md`; prove them with near-workspaces tests that run under a bare `cargo test` from the repo root; publish golden math vectors; keep `contracts/INTERFACE.md` in sync with `contracts.md` (methods, JSON shapes, event names).

## Scope
### In scope
- `revvault` single contract with modules router, vault, credit, loans; storage collections with unique prefixes; NEP-297 events.
- `mock-usdc` NEP-141 + `storage_deposit` + open capped `mint`.
- `ft_on_transfer` dispatch (`lp_deposit`, `pay`), optimistic update + manual rollback callback, refund-by-return-value.
- Credit limit, draw, repay split, fee, delinquency, LP shares/NAV/reserve, withdraw that panics on illiquidity.
- near-workspaces tests for the six invariants; unit tests (near-sdk `unit-testing`) for pure math; `fast_forward` for time.
- `contracts/fixtures/math-vectors.json` including the worked example in `contracts.md` §4.
### Out of scope
- Per-business sub-accounts, function-call-key provisioning (R3 does it in seed), Chain Signatures.
- Any NEAR Intents code (D3). The contract only does `ft_transfer`; `route` is always `"direct-ft"`.
- Relayer / NEP-366, attested score, indexer, LP withdraw queue, tranches, light/dark anything.
- Deploy scripts, seed scripts, account creation (R3). Frontend or TS types (R2).
- Installing toolchains yourself via `curl | sh`.

## Objectives
1. `cargo test` from the repo root passes with no keys, no wallet, no prebuilt artefact.
2. The demo loop in `contracts.md` §4 passes as a test with the exact numbers.
3. A reviewer reading the tests sees each of the six invariants named.

## Requirements
| # | Priority | Requirement |
|---|---|---|
| 1 | P0 | **Day-1 spike (15 min):** can a test compile the wasm and fetch the 35.6 MB sandbox with a bare `cargo test` and no `cargo-near` on PATH (pattern: near-sdk examples/fungible-token tests, `cargo_near_build::build_with_cli` or `near_workspaces::compile_project`)? Record the result in your report. If it needs the CLI, tell the PM; the fallback is a documented `make test` that builds the wasm first. Also confirm `cargo test` passes on Rust 1.95.0 with the pinned toolchain. |
| 2 | P0 | `mock-usdc`: 6 decimals, `storage_deposit`, open `mint` (cap 10,000 USDC/call), standard `ft_transfer`/`ft_transfer_call`. |
| 3 | P0 | `ft_on_transfer`: predecessor must equal `token`; unknown/malformed `msg` returns full refund; never panics on payer input. |
| 4 | P0 | Pay routing: bucket credit, `repay = min(ceil(amount×share/1e4), debt_left)`, `to_business = amount − repay`, state before outgoing `ft_transfer`, callback reverts on failure and returns `amount` as unused. |
| 5 | P0 | `request_draw`: all checks in §4, fee rounded up, one open loan, `Pending` guard, `ft_transfer` to vendor, `on_vendor_paid` finalises or voids (`vendor_failed`). |
| 6 | P0 | Views `get_credit`, `get_loans`, `get_loan`, `get_ledger`, `get_vault_stats`, `get_lp`, `get_params` with shapes from §5. |
| 7 | P0 | LP: `lp_deposit` via `ft_on_transfer`, NAV shares, `lp_withdraw` that panics `"insufficient liquidity: available <amt>"` when illiquid, reserve accounting. |
| 8 | P0 | Events per §6, each emitted at the right step. |
| 9 | P0 | Tests: happy path (the §4 vector, exact numbers), partial repay, multi-draw rejected (one loan), delinquency via `fast_forward` + `mark_delinquent`, LP in/out, 1-unit dust, failing vendor (unregistered account) reverts and voids, failing business transfer refunds payer and reverts ledger, unknown `msg` refunds, wrong predecessor rejected, invariants 1-6 each as a named test. |
| 10 | P0 | `contracts/fixtures/math-vectors.json` by end of Day 3 (R2/R3 consume it). |
| 11 | P0 | `contracts/INTERFACE.md` by end of Day 3 mirroring `contracts.md` §3-§6. |
| 12 | P0 | Wasm builds with `wasm32-unknown-unknown`; contract and token ready for R3 deploy by Day 5 (path to artefacts reported). |
| 13 | P1 | `near-contract-audit` checklist run; findings fixed or listed. |
| 14 | P1 | On-chain ring buffer of last 50 events + `get_recent_events`. |
| 15 | P1 | `demo-time` cargo feature with `demo_advance_days` (off by default; off in testnet unless PM says). |
| 16 | P1 | `docs/tech/contracts-spec.md` updated to match what is built (split default 20%, flat fee, panic-on-illiquid, no queue). |
| 17 | P2 | `per-business` parameter overrides; `pause_business` UI-facing view tweaks. |

## Dependencies
- R4 Day-1 skeleton: root `Cargo.toml` workspace with members `contracts/revvault`, `contracts/mock-usdc`, `contracts/tests`; `rust-toolchain.toml` (1.95.0 + wasm target). R4 leaves minimal placeholder `Cargo.toml` and empty `src/lib.rs` in each of the three crates so the workspace resolves; overwrite them freely, they are yours. If a needed crate is missing from the lockfile, request it via DEPS.md (near-sdk =5.30.0, near-contract-standards =5.30.0, near-workspaces =0.24.0 with `unstable`, tokio, anyhow, serde_json, cargo-near-build are pre-approved and R4 adds them on Day 1).
- Feeds: R2 (fixtures Day 3, INTERFACE.md Day 3), R3 (wasm + fixtures + params Day 5).
- The first `cargo test` downloads the sandbox binary (network required; `NEAR_SANDBOX_BIN_PATH` overrides offline).

## Constraints
- Honesty (verbatim): only routed revenue counts as collateral; Meta Transactions do not redirect revenue; not first-of-its-kind on NEAR (bond.credit lists NEAR); APY is illustrative; repayment is economic, not legal; the demo uses mock data until contracts are wired. Contract doc strings do not exist (no comments), but `INTERFACE.md` and any README text you hand to R4 must obey this.
- No comments in code. No `unwrap`/`expect` on paths reachable by callers; `checked_*` or `saturating_*` on u128; round in the protocol's favour; no floats.
- Exact dependency versions (no `^`).
- Never read or write `.env*`, keys, `~/.near-credentials`. Use only sandbox accounts.
- Never `git commit/push`; never `git add -A`/`.`.
- Do not run `curl | sh` installers from any skill. If `cargo-near` is needed and absent, ask the PM.
- English identifiers and strings.

## Deliverables
| Item | Priority |
|---|---|
| `contracts/mock-usdc/` crate | P0 |
| `contracts/revvault/` crate with modules router, vault, credit, loans | P0 |
| `contracts/tests/` near-workspaces suite, named invariant tests | P0 |
| `contracts/fixtures/math-vectors.json` | P0 |
| `contracts/INTERFACE.md` | P0 |
| Report: spike result, Rust version verified, wasm artefact paths, deviations, README block (test table mapping tests to invariants) | P0 |
| Audit findings list | P1 |
| `get_recent_events` | P1 |
| `docs/tech/contracts-spec.md` refresh | P1 |

## Acceptance criteria
1. `cargo test --workspace --locked` from the repo root exits 0 on a clean checkout with only the pinned toolchain (state the Rust version and runtime).
2. The tests named for each of invariants 1-6 exist and pass; `cargo test -- --list` shows them.
3. A test reproduces `contracts.md` §4 numbers exactly: limit 960 → available 445 after draw 500 (fee 15, debt 515) → debt_left 415, 215, 0 after payments 500/1,000/1,500 → limit 2,000.
4. Failing-vendor test: after the failed `ft_transfer`, loan is void, cash restored, no `vendor_paid` event, `vendor_failed` emitted.
5. Payer-refund test: when the business `ft_transfer` fails, the payer's token balance returns to its pre-payment value and the ledger/debt are unchanged.
6. `cargo clippy --workspace --all-targets --locked -- -D warnings` and `cargo fmt --all --check` pass.
7. `grep -rn "unsafe\|unwrap()\|//" contracts/revvault/src contracts/mock-usdc/src` finds no comments, no `unsafe`, no `unwrap()` on caller-reachable paths (document any test-only use).
8. `math-vectors.json` parses and the Rust tests assert at least the worked example, a dust case and a cap case from it.
9. `INTERFACE.md` lists every method and event in `contracts.md`; no extra public method exists unlisted.
10. Wasm builds: `cargo build -p revvault --target wasm32-unknown-unknown --release` succeeds; size reported.

## If behind schedule — cut first
1. P2s. 2. Ring-buffer events (P1). 3. `demo-time` feature. 4. Audit pass depth. Never cut: invariants tests, failing-callback tests, the §4 vector, fixtures, INTERFACE.md.
