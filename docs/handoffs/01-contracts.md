# 01 — Contracts (R1)

**No tests (owner instruction 2026-11-08).** Do not write or run unit, integration, near-workspaces or e2e tests, and do not add test dependencies. Checks are compile and lint only: `cargo check` and `cargo clippy` (one heavy build at a time) for Rust, `eslint` and `tsc --noEmit` for JS/TS, plus a manual demo flow in the mock UI.

Plan authority: `docs/brainstorm/2026-11-08-prd-alignment.md`. Spec authority: `docs/handoffs/contracts.md`, **section 0 first**. You cannot ask the user questions; everything is here, in `contracts.md` and the linked files.

## Context — read first
- `CLAUDE.md` (safety rules bind you), `docs/handoffs/00-overview.md`, `docs/handoffs/contracts.md` (all; section 0 wins).
- `docs/brainstorm/2026-11-08-prd-alignment.md`: Decision, sections 2 (tokenization), 3 (creators), 4a/4b, 5 (split math), 7 (build order, cut line), 8 (contract deltas).
- `docs/research/02-tech-stack.md`: findings on near-sdk and NEP-141, callback and rollback sketch. Prose guidance only; docs.near.org and the near-sdk crate docs are authoritative. Versions in it (near-sdk 5.30.0) are the pins to try first.
- `docs/research/02-novelty-and-risks.md` R2-R4.
- `docs/tech/contracts-spec.md` (background; you refresh it at the end).

## Tools — skills and MCP
- `near-smart-contracts`: before writing contract state, macros, callbacks. Override: write no tests (owner instruction); ignore its testing advice. Never run its `curl | sh` prerequisites.
- `near-contract-audit`: run as a checklist before reporting P1 done.
- `near-cli-rs`: only to compose command text for docs; the CLI is not installed. No MCP servers are installed.

## Owned paths
`Cargo.toml` (root workspace), `Cargo.lock`, `rust-toolchain.toml` (only if needed; the machine has Rust 1.99.1 and targets `wasm32-unknown-unknown`, `wasm32v1-none` installed, do not require a download), `contracts/**` (`revvault`, `mock-usdc`, `underwriting`, `fixtures`, `INTERFACE.md`), `docs/tech/**`. Not yours: `web/`, `prototype/`, `scripts/`, `tools/`, `deployments/`, `README.md`, `Makefile`. Dependency additions beyond the pins above go through `docs/handoffs/DEPS.md`.

## Responsibilities
Implement `mock-usdc`, `revvault` (router, lockbox ledger, credit, loans, vault, notes, kind, rvUSDC) and the pure `underwriting` crate exactly as `contracts.md` specifies; make them compile clean (`cargo check`, `cargo clippy`); publish golden vectors as fixture data and enforce invariants by careful implementation and a written self-review; keep `INTERFACE.md` in sync.

## Scope
### In scope
Single contract, modules; the loop; notes; `Kind`; rvUSDC; `poke`/write-off; `underwriting` crate and its vectors; wasm build with plain cargo; `post_attestation` (P1).
### Out of scope
Deploy and seed scripts, account creation (R3); any TypeScript; Intents code; NEP-366 relayer; Chain Signatures; note transfer and buy at par; NEP-245; withdrawal queue; tranches; sub-account-per-business deployment; `cargo install` of anything (cargo-near fails to link on this machine; do not retry); `curl | sh`.

## Objectives
1. Gate G1 (redefined): the full loop plus note lifecycle implemented, `cargo check --workspace --locked` and `cargo clippy --workspace --all-targets --locked -- -D warnings` clean, wasm builds, by end of Tue 10 Nov.
2. Wasm artefacts for `revvault` and `mock-usdc` built with `cargo build --target wasm32-unknown-unknown --release`.

## Requirements
Order is binding: finish the loop (P0 a-f) and get it compiling and clippy-clean before starting notes.
| # | Pri | Requirement |
|---|---|---|
| a | P0 | **Spike first (30 min max):** root workspace, `mock-usdc` minimal, a plain `cargo build --target wasm32-unknown-unknown --release` with no `cargo-near`. Record the Rust version and inspect the wasm with `wasm-tools` (installed) for features the NEAR VM rejects (known risk with newer rustc: if present try `RUSTFLAGS='-C target-cpu=mvp'` or the `wasm32v1-none` target and report what worked). Do not run a sandbox. If nothing works, stop and report to the PM. |
| b | P0 | Pure `underwriting` crate: `limit`, `est_days_to_clear`, `score`; golden vectors as fixture data (no test code) in `contracts/fixtures/` (`math-vectors.json` including the 960/500/515/100-200-215/2000 vector, dust, cap, and the creator 720 vector; `underwriting-vectors.json`). |
| c | P0 | `mock-usdc`: NEP-141, `storage_deposit`, open `mint` capped 10,000 USDC per call. |
| d | P0 | Router: `ft_on_transfer` for `lp_deposit` and `pay`, bucket ledger, split, state-before-transfer, `#[private]` rollback callback, refund-by-return-value, unknown `msg` refunds. |
| e | P0 | `request_draw`, vendor callback (finalise or void), one open loan, fee rounded up, borrower guard, `register_business({kind})`, per-kind advance, no starter limit, term 60 days, past-due step-up and 14-day grace, `poke`, write-off. |
| f | P0 | Vault: LP deposit and withdraw (panic `"insufficient liquidity: available <amt>"`), NAV, reserve 50% of collected fees, views from `contracts.md` section 5 plus section 0 additions, events. |
| g | P0 | **G1 self-review** (replaces the test suite): a written checklist in your report mapping invariants 1-11 to the code lines that enforce them, covering the happy path vector, failing vendor, failing business transfer refunding the payer, wrong predecessor, dust. Clippy clean. |
| h | P0 | Notes: `Note` struct, mint at draw, settle at last payment, void on vendor failure, NEP-171 views, `nft_transfer` panics, `get_notes`, `get_note`, events; enforce invariants 7, 9, 11 in code and list them in the self-review. |
| i | P0 | `INTERFACE.md` mirroring `contracts.md` (every public method, event, JSON shape); wasm artefact paths reported. |
| j | P1 | rvUSDC as real NEP-141 in the same contract (invariant 8). Fallback per `contracts.md` section 0. |
| k | P1 | `post_attestation` with ed25519 verify, clamp, expiry, nonce (invariant 10). |
| l | P1 | `near-contract-audit` checklist run; findings fixed or listed. Refresh `docs/tech/contracts-spec.md` to what is built. Gas budgets for draw plus callback plus mint estimated from the attached-gas constants (no measurement run). |
| m | P2 | `get_recent_events` ring buffer; `demo-time` feature. |

## Dependencies
Nobody blocks you. You feed R2 (fixtures and `INTERFACE.md`, by end of Mon 9 Nov for the loop, notes JSON shapes by Tue 10 Nov) and R3 (wasm artefacts and `underwriting` crate).

## Constraints
- Honesty (`contracts.md` section 15) applies to `INTERFACE.md` and any text you hand to R4.
- No comments in code (sole exception: `// TEMPORARY — <what>; delete with <what>`). No `unsafe`; no `unwrap`/`expect` on caller-reachable paths; `checked_*` or saturating on u128; round in the protocol's favour; no floats; exact dependency versions.
- Tests are forbidden (see top). Memory: one heavy build at a time through the cargo shim (4 cores). If a build is killed for memory, report and retry with `-j2`; do not run tests in parallel with other builds. Disk is tight: keep one `target/` at the repo root; run `cargo clean -p` rather than deleting caches elsewhere.
- Testnet and sandbox only. Never read `.env*`, keys, `~/.near-credentials`. No `git` write commands.
- Do not touch paths you do not own. A needed change to `contracts.md` is reported, not made, except section 0 clarifications that do not change behaviour (state them in your report).

## Deliverables
`contracts/{mock-usdc,revvault,underwriting,fixtures}` (no tests dir), `contracts/INTERFACE.md`, root `Cargo.toml` and `Cargo.lock` (all P0 except where marked); P1 items j, k, l as tagged. Report: spike result, Rust and dependency versions, wasm paths and sizes, invariant-to-code self-review for 1-11, estimated gas, deviations, what was cut and why, and a README text block for R4.

## Acceptance criteria
1. `cargo check --workspace --locked` exits 0 (state Rust version).
2. The self-review maps invariants 1-7, 9, 11 (8 and 10 if their P1 items are done) to code.
3. By reading the code and the fixture, the golden vector at 20% split, term 60, reserve 50% holds: limit 960, available 445 after draw, repay 100/200/215, debt_left 415/215/0, note settled, limit 2,000; creator limit 720.
4. By code reading: `nft_token("ln_001")` shows the vault as owner while the loan is open; `nft_transfer` panics with the stated message; a failed vendor transfer leaves no note.
5. `cargo clippy --workspace --all-targets --locked -- -D warnings` and `cargo fmt --all --check` pass.
6. `rg -n '//|unsafe|unwrap\(\)' contracts/*/src` shows no comments, no `unsafe`, no caller-reachable `unwrap`.
7. `cargo build -p revvault -p mock-usdc --target wasm32-unknown-unknown --release` succeeds; `wasm-tools validate` passes; size reported.
8. `INTERFACE.md` lists every public method and event; no unlisted public method exists.

## If behind schedule — cut first
Per the plan's cut line: note transfer (already out), `post_attestation` on-chain, rvUSDC as a true NEP-141 (fallback read-only ledger), P2s. Never cut: loop, note mint and settle with NEP-171 views, clippy-clean compile. If G1 is not met by end of Tue 10 Nov, the PM cuts items 1-5 at once.
