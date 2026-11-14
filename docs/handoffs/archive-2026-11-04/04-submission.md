# 04 — Submission, root files, CI (R4)

You cannot ask the user questions; everything is in this file, `contracts.md` and the linked research. You run twice: **Day 1 skeleton** (first, alone, hours), then **Day 9-10** after R1-R3 report P0 done.

## Context — read first
- `docs/handoffs/00-overview.md` and `docs/handoffs/contracts.md` (esp. §12 env names, §13 make targets, §15 honesty).
- `docs/research/04-repo-audit.md`: **all** (layout R1, prototype move R2, commands R3, `.env.example` R4, toolchain R5, CI R6, LICENSE R7, `.gitignore` R8, README skeleton R9, ownership R10, DEPS rule R11).
- `docs/research/05-synthesis.md`: **all** (decisions, resolved contradictions, assumptions to disclose).
- `docs/research/02-tech-stack.md`: Implications: submission; Findings "Local machine"; "NEAR Intents / 1Click" (for README honesty).
- `docs/research/01-design-system.md`: Implications per role -> submission (capture sizes, overclaims to check).
- `docs/research/00-hackathon-brief.md` (submission checklist, judging), `docs/research/01-competitive-landscape.md` and `02-novelty-and-risks.md` (claims to correct; the safe positioning sentence).
- `docs/PRD.md`, `docs/03-build-plan.md` (definition of done), `README.md` (current research README, to be moved).

## Tools — skills and MCP
- `prd`/`product-brief`: not needed (PRD exists).
- `code-review` and `security-review`: before the final dry run, on the whole diff of R1-R3 output (read-only findings go to the PM).
- `x-post`: **only to draft** the X post text; it queues through Buffer, so do not run its queue/post steps; the user posts. Draft must say "built at NEAR HACKATHON", tag @NEARProtocol and #NEARHackathon.
- `vercel:deploy`, `vercel:nextjs`, `plugin:vercel:vercel` MCP: Day 9 hosted mock-mode demo, **only after the user confirms the Vercel account/project**; env `NEXT_PUBLIC_REVVAULT_MODE=mock` set explicitly.
- `near-contract-audit` (if approved): read its findings for the README security notes.
- `drive-upload`: not needed unless the user asks for the video in Drive.
- Video capture: no skill required; record from the running `make demo` at 1920x1080 using tools available on the machine (report which); caption honestly (Mock vs Testnet).

## Owned paths
`README.md`, `LICENSE`, `Makefile`, `Cargo.toml` (root workspace), `Cargo.lock`, `rust-toolchain.toml`, `package.json` (root), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.nvmrc`, `.gitignore`, `.env.example`, `.github/**`, `.git/`, `docs/README.md`, `docs/PRD.md`, `docs/03-build-plan.md`, `docs/research/**` (append-only), `docs/handoffs/**` (incl. `STATUS.md`, `DEPS.md`), `docs/design/**` (after the prototype move), `prototype/**` (moves only, content frozen), `demo-assets/**` (screenshots, video, X post copy). You may not edit `contracts/**`, `app/**`, `scripts/**`, `deployments/**`, `docs/tech/**`, `docs/ui/**`; for leaf manifests (`app/package.json`, `scripts/package.json`, `contracts/*/Cargo.toml`) you only add dependencies requested in DEPS.md.

## Responsibilities
Make the public repo judge-friendly: clone, one command to set up, `cargo test`, one command to see the demo, README that matches reality and states every limitation. Own every shared file and apply dependency requests so parallel roles never overwrite each other. Produce the submission package.

## Scope
### In scope
- Day 1 skeleton, Day 5/7 DEPS application, Day 9-10 README, screenshots, 90 s video, X post draft, submission-form text, clean-clone dry run, prototype move.
- CI workflow (contracts, app, demo-smoke jobs per audit R6), no secrets.
- Correcting overclaims in README/docs wording (not in code owned by others: report those to the PM).
### Out of scope
- Writing contract, frontend or script code; fixing failing tests (report to the PM, who re-dispatches).
- Posting to X, submitting the form, creating the public remote: these need the user ("ready to post" is your deliverable, not the act). `git commit`/`git push` only if the user asks; `git init` is allowed on Day 1.
- Intents mainnet transactions; Vercel deploys without the user's confirmation.

## Objectives
1. A stranger (or Claude Code / Codex) can run `make setup`, `cargo test`, `make demo` from a fresh clone with no env and no wallet and see what the README says.
2. Every README claim is true on the day of submission; every limitation is stated.
3. Nobody blocks anybody on a root file.

## Requirements
| # | Priority | Requirement |
|---|---|---|
| 1 | P0 | **Day 1 skeleton**: `git init` (no remote, no commits); root virtual Cargo workspace `members = ["contracts/revvault","contracts/mock-usdc","contracts/tests"]` (Cargo requires each member to exist: on Day 1 only, create a minimal `Cargo.toml` and an empty `src/lib.rs` for each of the three member crates, no logic; ownership of those files passes to R1 the moment R1 starts, and you never touch them again); `rust-toolchain.toml` channel `1.95.0`, components rustfmt+clippy, target `wasm32-unknown-unknown`, profile minimal; root `package.json` (private, `packageManager` pnpm exact from `pnpm -v`, engines node >=22.22.2, script proxies), `pnpm-workspace.yaml` (`app`, `scripts`), `.nvmrc` (24 pending R2 confirmation), `.gitignore` (audit R8), `.env.example` (names from contracts.md §12, no values), `LICENSE` MIT (flag assumption A1), `Makefile` with the nine fixed targets from contracts.md §13 calling scripts R3 owns (stubs that print "not implemented yet" are allowed until R3 delivers), move `README.md` to `docs/README.md` and write a short placeholder root README stating "work in progress, see docs/README.md". |
| 2 | P0 | Pre-approved Day-1 dependencies applied in the leaf manifests and lockfiles: Rust: near-sdk =5.30.0, near-contract-standards =5.30.0, near-workspaces =0.24.0 (feature `unstable`), tokio, anyhow, serde_json, cargo-near-build; npm: next@16.4.5, react@19.3.1, react-dom@19.3.1, typescript, eslint + eslint-config-next, vitest, `@hot-labs/near-connect@0.12.0`, tsx, near-api-js@7.4.0. Exact versions (no `^`). Run installs yourself; others use frozen lockfiles. |
| 3 | P0 | Apply `docs/handoffs/DEPS.md` rows within the same day; blocking rows first; reject heavy additions with the reason in the row (audit R11). |
| 4 | P0 | CI `.github/workflows/ci.yml` (audit R6): contracts job, app job (no env), demo-smoke job; no secrets read. |
| 5 | P0 | **README** per audit R9 skeleton: pitch, what it is, 60-second quickstart (`make setup`, `cargo test`, `make demo`, each with expected last line), demo steps (the overview's demo path), testnet ids table (from `deployments/testnet.json`; "TBD" until real, never invented), how it works (money flow + math from contracts.md), repo layout, tests mapped to invariants (from R1's report), **Honesty and limitations** (six constraints verbatim + testnet only, unaudited, mock USDC, Intents has no testnet so testnet payout is `ft_transfer` and Intents is a labelled mainnet preview, relayer and attested score not built), hackathon tracks 04 and 08 (stretch 01) with one-line mapping each, links to X post and video, docs index, licence. Positioning sentence only: "the first revenue-routed credit line for autonomous agent businesses on NEAR". |
| 6 | P0 | **Clean-clone dry run** (Day 10): copy the tracked files to a fresh directory (or fresh clone), run `make setup`, `cargo test`, `make demo` + `scripts/smoke.sh`, `make agent`, `make verify`; paste outputs in the report; fix README to match what actually happened. |
| 7 | P0 | Submission pack: form text (≤2000 chars, ≥20), track list, repo link placeholder, X post draft (built at NEAR HACKATHON, @NEARProtocol, #NEARHackathon, video/screenshots), wallet-address placeholder for the user. Never invent URLs or addresses. |
| 8 | P1 | 90 s video + 6-8 screenshots (1280px dashboard, 390px pay page, split animation frames, LP vault, `cargo test` output, `make agent` output) in `demo-assets/`, following the overview's demo path; captions show the Mock/Testnet chip honestly. |
| 9 | P1 | Day 9: after the user accepts the frontend port, `git mv prototype docs/design/prototype`, keep `index.html`, `landing.html`, `assets/` together, grep-replace cited `prototype/` paths in docs; confirm the app does not reference `docs/design/`. |
| 10 | P1 | Hosted mock-mode demo URL on Vercel (only with the user's confirmation); README links it, and still says `make demo` is the canonical path. |
| 11 | P1 | `code-review` and `security-review` run over R1-R3 output; findings reported, not fixed. |
| 12 | P1 | Fix wording in `docs/tech/architecture.md`-derived README text: no "relayer pays gas for payers", no "pays vendor via NEAR Intents" as a current feature. (Source docs are R1's; report needed edits to the PM.) |
| 13 | P2 | README badges, architecture diagram image, `docs/README.md` decision log of changes since the pitch. |
| 14 | P2 | Second sub-line in submission for Track 01 stretch. |

## Dependencies
- Day 1: nobody. Day 9-10: R1 report (test table, ids), R2 screenshots/README block, R3 tx hashes/README block, and all P0 green.
- The user: Vercel account/confirmation, public repo creation and push, X post, form, wallet address.

## Constraints
- Honesty (verbatim): only routed revenue counts as collateral; Meta Transactions do not redirect revenue; not first-of-its-kind on NEAR (bond.credit lists NEAR); APY is illustrative; repayment is economic, not legal; the demo uses mock data until contracts are wired. Do not put the internal "9.0/10 win score" or unverified competitor claims (Hobba, Clipstake, Roke.to, Ping) in the README.
- Never read, write or echo `.env*` (except creating `.env.example` with names only) or any secret; the user's home-level CLAUDE.md contains credentials that must never be copied into this repo.
- Never `git commit`, `git push`, remote setup or destructive git unless the user asks; never `git add -A` or `git add .`.
- No comments in code/config you write (Makefile, YAML, shell, TOML) except the single-line `# TEMPORARY — <what>; delete with <what>` form where truly temporary.
- Exact dependency versions; lockfiles committed; installs in CI frozen.
- README states only what you verified running; unverified items are labelled.
- English everywhere.

## Deliverables
| Item | Priority |
|---|---|
| Day-1 skeleton (root manifests, toolchain, Makefile, .gitignore, .env.example, LICENSE, workspace files, README move) | P0 |
| Dependencies applied + DEPS.md processed | P0 |
| `.github/workflows/ci.yml` | P0 |
| Root `README.md` per R9 skeleton | P0 |
| Clean-clone dry-run report | P0 |
| Submission pack text + X post draft | P0 |
| Screenshots + 90 s video in `demo-assets/` | P1 |
| Prototype move to `docs/design/prototype/` | P1 |
| Vercel hosted mock demo (with user confirmation) | P1 |
| Review reports (code-review, security-review) | P1 |

## Acceptance criteria
1. After Day 1: `cargo metadata --locked --no-deps` and `pnpm -v` succeed; `make -n setup test demo agent verify deploy seed agent-testnet env` all resolve (no "No rule"); `git status` shows an initialised repo with no commits and no secrets; `.env.example` has names only (`grep -n "=." .env.example` shows no values).
2. Fresh-directory dry run on Day 10 succeeds in order: `make setup`, `cargo test --workspace --locked`, `make verify`, `make demo` (then `curl -f localhost:3000/demo`), `make agent` (exit 0); outputs pasted.
3. Every command in README exists in the Makefile or `package.json`, and every path in the README exists (`grep` check, reported).
4. README contains the six honesty constraints verbatim plus the testnet/Intents paragraph; `grep -i "first" README.md` shows only the allowed positioning sentence; `grep -in "meta tx\|meta-tx\|relayer" README.md` shows only "does not redirect revenue"/"not built" statements.
5. CI workflow file passes `actionlint` if available, uses no secrets, and its commands equal `make verify` steps.
6. No `.env*` other than `.env.example` is tracked or staged; no key-like strings in tracked files (`grep -rIn "PRIVATE_KEY=\|ed25519:" .` returns only names/docs).
7. After the prototype move: `grep -rn "prototype/" docs README.md` shows no stale path; `app/` has no reference to `docs/design`.
8. Submission pack complete with explicit placeholders for repo link, post link, wallet; nothing invented.

## If behind schedule — cut first
1. P2s. 2. Hosted Vercel URL. 3. Video polish (ship screenshots + terminal recording). 4. Prototype move (leave in place, README says it is the design reference). 5. Review reports. Never cut: skeleton, DEPS processing, README honesty section, clean-clone dry run, CI.
