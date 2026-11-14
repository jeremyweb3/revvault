# 00 — Overview (PM)

RevVault: revenue-routed credit line for autonomous AI businesses on NEAR testnet. Deadline 14 Nov 2026 23:59 UTC (aim to submit by 12:00). Tracks 04 Autonomous Business and 08 Real-World Money (stretch 01). Screening is by Claude Code / Codex: the public repo must run and match the README.

Read order for any role: this file -> `contracts.md` -> your role file -> the research files it names.

## Role map

| Role | File | Owns | Depends on |
|---|---|---|---|
| R4 Submission, root files, CI | `04-submission.md` | root manifests, Makefile, README, CI, LICENSE, `.git`, `docs/handoffs/**` housekeeping, video, X post | nobody for Day 1 skeleton; everyone for Day 9-10 |
| R1 Contracts | `01-contracts.md` | `contracts/**`, `docs/tech/**` | R4 Day-1 skeleton (root `Cargo.toml`, toolchain) |
| R2 Frontend port | `02-frontend.md` | `app/**`, `docs/ui/**` | R4 Day-1 skeleton (pnpm workspace); R1 fixtures (Day 3) and testnet ids (Day 5-6) |
| R3 Demo agent, Intents preview, scripts | `03-demo-agent.md` | `scripts/**`, `deployments/**` | R4 skeleton; R2 engine (Day 3); R1 deployable wasm (Day 5) |

Dispatch order (after the user says "yes" and approves tooling):
1. **R4 Day-1 skeleton alone** (hours): `git init`, root manifests, `rust-toolchain.toml`, pnpm workspace, `.gitignore`, `.env.example`, `Makefile` skeleton, LICENSE, move current README to `docs/README.md`. Gate: `cargo metadata` and `pnpm -v` work.
2. **R1, R2, R3 concurrently.** R2 and R3 start on the mock path and need nothing from R1 except `contracts/fixtures/math-vectors.json` (R1 Day 3) and, later, testnet ids.
3. **R4 resumes Day 9-10** (README, video, dry run) once R1-R3 report P0 done.

## Dependency graph
R4 skeleton -> {R1, R2, R3}. R1 fixtures -> R2 engine tests, R3 agent tests. R2 engine -> R3 mock agent. R1 deploy-ready wasm -> R3 deploy/seed -> R2 testnet adapter, R3 testnet agent. All -> R4 README/video.

## Timeline (from docs/03-build-plan.md, adjusted)
| Day | Date | R1 | R2 | R3 | R4 |
|---|---|---|---|---|---|
| 1 | 4 Nov | spike: `cargo test` builds wasm without cargo-near? | scaffold, tokens | 1Click spike (tokens + dry quote) | skeleton |
| 2 | 5 Nov | mock-usdc + contract skeleton, router | shell, mock adapter, engine | `scripts/agent --mock` on engine stub | CI draft |
| 3 | 6 Nov | credit math + tests, **fixtures** | business dashboard + split animation | setup.sh, smoke.sh | - |
| 4 | 7 Nov | draw, repay, vault tests | draw modal + `/demo` | agent mock loop | - |
| 5 | 8 Nov | testnet deploy-ready, audit pass | LP vault, loan detail | deploy + seed scripts | applies DEPS rows |
| 6 | 9 Nov | hardening | pay link page, landing | testnet agent, intents preview | - |
| 7 | 10 Nov | P1 ring-buffer events | responsive, polish, RPC adapter | agent-testnet hardening | - |
| 8 | 11 Nov | buffer | wallet connect, error states | buffer | - |
| 9 | 12 Nov | final testnet state | deploy mock-mode URL (with R4) | - | README, screenshots, video, prototype move |
| 10 | 13 Nov | - | - | - | X post, clean-clone dry run |
| - | 14 Nov | - | - | - | submit by 12:00 UTC |

## Priority rules
P0 = on the demo path, must work end to end. P1 = makes it credible. P2 = only if time remains. No role starts a P1 while any P0 on the demo path is red (own P0 or a P0 owned by a role it feeds).

## Demo path (defines P0)
Mock mode, no wallet, 90 seconds. Every step must be reproducible by `make demo`.
1. Landing `/`: hero "Credit that repays itself", track badges, "Open demo" -> `/app/business`. Chip reads **Mock**.
2. `/app/business`: header `biz-agent.testnet`, status Active, repay split 20%. Hero card: **available 960**, "based on 2,400 routed in 30 days, advance rate 40%", gauge, revenue chart with limit overlay, no active loan.
3. Click **Draw credit**: modal (bottom sheet <=640px). Amount 500 -> vendor `GPU-Provider` -> review: principal 500, fee 15, repay **515**, split 20%, "est. clear in ~N days at current pace" -> Confirm.
4. Success: vendor receipt "Paid (mock)", loan `ln_…` open, debt bar shows 515, feed shows `draw_opened`, `vendor_paid`.
5. `/demo` (or the in-page control): click **Customer pays 500**, then **1,000**, then **1,500**. Each click plays the split animation (<=1.2 s, skippable): 20% to repay, 80% to business; debt bar shrinks 515 -> 415 -> 215 -> 0.
6. Third payment: `loan_closed`; available goes **960 -> 2,000** (limit grew because routed revenue grew to 5,400, capped).
7. `/app/lp`: TVL, utilisation, illustrative APY (labelled), reserve, loan book with one delinquent borrower, risk panel, deposit card.
8. `/pay/biz-agent.testnet` on a 390px viewport: the customer-side pay page with the "How it works" disclosure.
Terminal alternative: `make agent` prints the same story from the same engine. Testnet path (P1 for the UI, P0 for deployed contracts and tests): `make deploy`, `make seed`, `make agent-testnet`, README lists ids and tx hashes.

## Technology decisions (reasoning in docs/research/05-synthesis.md)
Single Rust near-sdk 5.30.0 contract + mock USDC; no backend server (browser JSON-RPC to FastNEAR); Next.js 16.4.5, plain CSS from the prototype, no extra UI libs; near-connect for wallet; relayer and attested score cut; vendor payout on testnet is a real `ft_transfer`, Intents is a labelled mainnet quote preview because Intents has no testnet. Repay split default 20%.

## Cut order (if behind)
1. Attested score and indexer (already cut).
2. Intents quote preview (the payout itself is already a plain `ft_transfer`; say so).
3. Gasless relayer (already cut).
4. LP withdraw queue (already not built; withdraw panics with an illiquidity message).
5. Light theme (already not built).
Then, beyond the user's list, in this order: P2 items per role, P1 `get_recent_events`, wallet connect (keep demo-key path), loan detail page, landing polish. Never cut: router + draw + self-repay + LP deposit + dashboard + `/demo` + `cargo test` + README honesty section.

## Shared conventions
- English everywhere. No comments in code (sole exception: `// TEMPORARY — <what>; delete with <what>`). TypeScript strict, no `any`, no `@ts-ignore`, no non-null `!` to silence real nullables. Rust: no `unsafe`, no `unwrap` on user-controlled paths, `checked_*` math.
- Server Components by default in Next.js; `'use client'` only on interactive leaves. Every animation respects `prefers-reduced-motion`.
- No new dependency without asking: append a row to `docs/handoffs/DEPS.md`.
- Never read, write or echo `.env*` or secrets. Never `git commit`/`push` or destructive git; never `git add -A` or `git add .`. Only R4 touches `.git`, and only when the user asks.
- Money is integers (bigint / u128). Never floats.
- Skills: invoke the skills in your `Tools` section before the code they cover; they are installed only after the user approves 06-tooling.md, otherwise use the NEAR docs and the research files.
- Report back with: what is done, which acceptance criteria you ran and their output, deviations, and a README text block for R4 (README is R4's file).

## Honesty constraints (repeated in every handoff, binding on UI copy and README)
Only routed revenue counts as collateral. Meta Transactions do not redirect revenue. Not first-of-its-kind on NEAR (bond.credit lists NEAR); the only priority claim allowed is "the first revenue-routed credit line for autonomous agent businesses on NEAR". APY is illustrative. Repayment is economic, not legal. Demo uses mock data until contracts are wired. Plus: testnet only, unaudited, mock USDC is not money, Intents has no testnet.

## Research index — who reads what
| File | Conclusion | R1 | R2 | R3 | R4 |
|---|---|---|---|---|---|
| `docs/PRD.md` | synthesised PRD | skim | skim | skim | read |
| `docs/research/00-brief.md` | tracks and questions | - | - | - | skim |
| `01-design-system.md` | prototype inventory, 28 contradictions | - | **all** | Findings 15 vendor/demo rows | Implications: submission |
| `02-tech-stack.md` | versions, callback pattern, 1Click mainnet only, relayer cut | **all** | Wallet, RPC, Next.js sections | Intents, 1Click sections | Implications: submission |
| `04-repo-audit.md` | layout, commands, ownership, CI | Layout + ownership | Layout + ownership | Layout + ownership | **all** |
| `05-synthesis.md` | decisions and resolved contradictions | all | all | all | all |
| `06-tooling.md` | skills proposal | contracts rows | frontend row | intents rows | skim |
| `docs/research/00-hackathon-brief.md`, `01-competitive-landscape.md`, `02-novelty-and-risks.md` | domain | R1: risks R3/R4 | - | skim | R4: all (claims to correct) |
| `docs/tech/*`, `docs/ui/*`, `docs/03-build-plan.md` | source docs | tech | ui | tech | build plan |

## Design-system inventory
The full inventory (tokens, type, components, motion, states, structure, route mapping, contradictions) lives in `docs/research/01-design-system.md` and is embedded verbatim as Appendix A of `02-frontend.md`. The prototype wins over `docs/ui/00-design-direction.md` wherever they differ.
