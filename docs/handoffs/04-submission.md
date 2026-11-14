# 04 — Submission: README, root files, video script, claims audit (R4)

Runs late (Thu 12 to Sat 14 Nov), after P0 of R1-R3. You cannot ask the user questions.

**No tests (owner instruction 2026-11-08).** README and Makefile must not promise `cargo test`; verification commands are `cargo check`, `cargo clippy`, `eslint`, the web build and the mock demo flow.

## Context — read first
- `CLAUDE.md`, `docs/handoffs/00-overview.md`, `docs/handoffs/contracts.md` (section 0, 15).
- `docs/brainstorm/2026-11-08-prd-alignment.md`: section 6 (README edit list, truth table, pitch beats and Q&A), section 7 (schedule), acceptance criteria.
- `docs/research/00-hackathon-brief.md` (submission checklist, judging), `01-competitive-landscape.md`, `02-novelty-and-risks.md`; `docs/brainstorm/2026-11-04-revvault-10-day-plan/pitch-and-demo.md`.
- Each role's report text blocks (given to you by the PM).

## Tools — skills and MCP
`code-review` and `security-review` on the final diff (findings to the PM). `x-post`: **draft text only, never queue or post.** No MCP servers installed.

## Owned paths
`README.md`, `LICENSE`, `Makefile`, `.gitignore`, `.env.example`, `.github/**`, `demo-assets/**`, `docs/README.md`. Not yours: everything else. No `git init`, no commits, no push.

## Responsibilities
Make a fresh clone understandable and runnable by a Claude Code or Codex screener: README that matches what exists, every limitation stated, the 90-second video script, the X post draft, a claims audit.

## Scope
### In scope
README per alignment section 6 (new tagline, status, revenue notes and LP shares section, who it is for, PRD module map with real versus mock, tech truth table, honesty bullets, seeded history and mock USDC and not audited, commands that exist); Makefile targets that call only existing commands; `.env.example` with names only; video script with note, creator (8 s) and underwriting beats and the three Q&A answers; X post draft in `demo-assets/x-post.md`; claims audit table.
### Out of scope
Posting, pushing, emailing, creating Monkies tasks, Vercel deploy (each needs the owner's explicit yes); editing code in other roles' paths; recording the video (the owner records).

## Objectives
README passes a fresh-clone dry run before end of Fri 13 Nov.

## Requirements
| # | Pri | Requirement |
|---|---|---|
| 1 | P0 | README with only commands that were actually run by you and their real output; mock versus testnet stated; no claim without evidence in the repo. |
| 2 | P0 | Claims audit: grep README, `prototype/`, `web/src`, `demo-assets` for "first", "Intents", "yield", "security", "audited", "live history", "Colosseum", "Ping Subscription"; table of each hit and verdict. |
| 3 | P0 | Video script (90 s) and Q&A answers. |
| 4 | P1 | Makefile (`check`, `lint`, `demo`, `agent`, `verify`) and `.env.example`. |
| 5 | P1 | X post draft (says "built at NEAR HACKATHON"; no "first", no yield, no Intents payout). |
| 6 | P2 | GitHub Actions running `cargo check`, `cargo clippy`, eslint and the web build. |

## Dependencies
R1, R2, R3 reports.

## Constraints
Honesty per `CLAUDE.md` and `contracts.md` section 15; "first" only as the PRD words it. English. Never read `.env*`. No `git` write commands.

## Deliverables
`README.md`, `demo-assets/{video-script.md,x-post.md,claims-audit.md}`, Makefile and `.env.example` (P1).

## Acceptance criteria
1. Every README command was executed and works from the repo root on a clean state, or is labelled as not run.
2. Claims audit has zero unresolved hits.
3. README contains the six honesty bullets plus notes-are-economic-claims and score-sets-rate-only.

## If behind schedule — cut first
CI, Makefile polish, X draft. Never cut: README honesty section, claims audit.
