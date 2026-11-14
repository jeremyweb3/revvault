# 00 — Overview (PM), rebuilt 2026-11-08

RevVault: a revenue-routed credit line for autonomous AI businesses and digital creators on NEAR testnet. Deadline 14 Nov 2026 23:59 UTC; aim to submit Fri 13 or Sat 14 Nov by 12:00 UTC. Screening is by Claude Code or Codex: the public repo must run and match the README.

**The plan of record is `docs/brainstorm/2026-11-08-prd-alignment.md`** plus `docs/brainstorm/2026-11-08-ui-restyle-backgrounds-supply.md`. The 2026-11-04 handoffs (Next.js port, starter limit 100, reserve 10%, term 30) are archived in `docs/handoffs/archive-2026-11-04/` and superseded. Read order for any role: `CLAUDE.md`, this file, `contracts.md` (section 0 wins), your role file.

## Owner decisions (confirmed 2026-11-08)
Agents write the code and Candra reviews tests; app is a Vite wrap of the prototype. Per-draw NEP-171 revenue note held by the pool (not transferable in the MVP); LP shares rvUSDC as NEP-141 in the same contract (fallback: read-only share ledger). `Kind { Agent, Creator }`, advance 40% agent and 30% creator. Rust `underwriting` crate and `underwrite` CLI are P1, promoted only if the core loop is green by end of Tue 10 Nov. 1Click JWT status unknown: Intents is a mainnet dry quote or documented only. Split 20%, term 60 days, reserve 50% of fees, past-due step-up 50%, grace 14 days, no starter limit. "First" framing kept as the PRD words it. UI: drop the Pawket identity, pure black, blue scale `#3E68FE`, `tokens.css`; order restyle P0, copy pass, Vite wrap.

## Role map
| Role | File | Agent | Owns | Starts |
|---|---|---|---|---|
| R1 Contracts | `01-contracts.md` | general-purpose | `contracts/**`, root `Cargo.*`, `docs/tech/**` | now |
| R2 Frontend (restyle, copy, Vite wrap) | `02-frontend.md` | me:frontend | `prototype/**`, `web/**`, `docs/ui/**` | now (Parts A, B are static; Part C waits for the PM) |
| R3 Demo agent, underwrite CLI, scripts | `03-demo-agent.md` | general-purpose | `scripts/**`, `tools/underwrite/**`, `deployments/**` | after G1 |
| R4 Submission | `04-submission.md` | general-purpose | `README.md`, `Makefile`, `.env.example`, `.gitignore`, `LICENSE`, `.github/**`, `demo-assets/**` | Thu 12 Nov |

No role edits another's paths. PM owns `docs/handoffs/**` and `docs/brainstorm/**`.

## Dependency graph and dispatch order
R1 and R2 run concurrently (R2 Parts A and B are static HTML, no builds; only R1 runs heavy compiles). R2 Part C starts when the PM says no compile is running. R1 G1 then feeds R3 and R2 Part C fixtures. R3, R2, R1 then feed R4.

**No tests (owner instruction 2026-11-08):** nobody writes or runs tests. Checks are `cargo check` and `cargo clippy` (one heavy build at a time), `eslint` and `tsc --noEmit`, plus a manual mock-UI demo flow. Effort goes to the contract, backend/scripts and UI.

## Gates (redefined, test-free)
G0 workspace compiles and wasm builds; G1 full loop plus note lifecycle implemented, `cargo check` and `cargo clippy -D warnings` clean (end of Tue 10 Nov; else cut items 1-5 of the cut line); G2 UI shows real testnet notes (manual check) (Wed 11 Nov, requires an owner-funded throwaway testnet account); feature freeze EOD Thu 12 Nov; G3 video approved and G4 README fresh-clone pass (commands run by hand; no test commands) (Fri 13 Nov).

## Demo path (defines P0)
Mock mode, 90 seconds, offline.
1. Landing: hero (credit that repays itself; agents and creators), Open demo.
2. Business view `biz-agent`: kind chip Agent, split 20%, available 960 from 2,400 routed in 30 days at 40%.
3. Draw 500 to GPU-Provider: review shows fee 15, repay 515, est days to clear, warning if beyond the 60-day term. Confirm: vendor receipt "Paid (mock)", loan open, **note ln_001 minted**, debt bar 515.
4. Demo controls: Customer pays 500, 1,000, 1,500 (or Simulate a week of sales): each splits 20% to repay and 80% to the business, debt 415, 215, 0.
5. Last payment: loan closed, **note settled**, available 960 to 2,000.
6. Notes and Vault view: pool stats, your rvUSDC share, notes table with one agent note, one creator note (`luna`, 8 s beat), one past due, one settled.
7. Underwriting beat (R3 P1): terminal `underwrite biz-agent.testnet` prints components, "source: fixture", rate-only attestation.
8. Pay link page at 390 px.
Testnet path (P1): deployed contracts, seeded history, UI reading real notes.

## Priorities and cut line
P0 on the demo path; P1 credibility; P2 if time remains. No role starts P1 while a P0 it owns or feeds is red. Cut order (first cut first): note transfer (already out); `underwrite --source rpc`; on-chain `post_attestation`; live creator writes; rvUSDC as a true NEP-141 (share ledger fallback); real Intents proof; live LP writes; the `underwrite` CLI entirely; last resort mock app plus contract tests plus read-only testnet, said plainly. Never cut: loop, note mint and settle with NEP-171 views, honest copy, clippy-clean compile.

## Environment limits
14 GB RAM: one heavy build at a time through the cargo and npm shims (4 cores). About 13 GB disk free: one root `target/`. `cargo-near` and `near-cli-rs` are not installed and `cargo install cargo-near` fails to link: use plain `cargo build --target wasm32-unknown-unknown --release`. Testnet deploy needs a throwaway funded account and a CLI, both from the owner. No git repo exists; nobody pushes, posts, emails, deploys to Vercel or creates Monkies tasks without an explicit yes.

## Shared conventions
English everywhere. No comments in code (sole exception `// TEMPORARY — <what>; delete with <what>`). TypeScript strict, no `any`, no `@ts-ignore`. Rust: no `unsafe`, no caller-path `unwrap`, `checked_*` math. Money is integers. Reduced motion honoured. Never read `.env*` or keys. No `git add -A`. Dependencies through `DEPS.md`. Report: done, criteria run with output, deviations, README text block.

## Honesty constraints
See `contracts.md` section 15 and `CLAUDE.md`. Summary: only routed revenue is collateral; meta-tx does not redirect revenue; "first" only as the PRD words it and never as proven fact; notes are pool-held economic claims, not securities; score sets the rate only; APY illustrative; repayment economic not legal; testnet, unaudited, mock USDC; no testnet Intents.

## Research index
| File | Who reads |
|---|---|
| `docs/research/02-tech-stack.md` | R1 all, R3 Intents and sub-account sections |
| `docs/research/01-design-system.md` | R2 (prototype inventory; tokens superseded by restyle plan) |
| `docs/research/00-hackathon-brief.md`, `01-competitive-landscape.md`, `02-novelty-and-risks.md` | R4, R1 (risks) |
| `docs/research/05-synthesis.md`, `06-tooling.md` | historical; 2026-11-08 plan wins (06 installs were never approved or done) |
