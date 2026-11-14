> **SUPERSEDED 2026-11-08** by `docs/brainstorm/2026-11-08-prd-alignment.md` and `docs/handoffs/00-overview.md`. Where this file disagrees (Next.js port, starter limit, split 25%, term 30, reserve 10%), the 2026-11-08 plan wins.

# Build plan (4 Nov -> 14 Nov 23:59 UTC)

Candra focuses on UI first; tech stays research until UI is approved. The mock adapter (ui/02) lets UI be finished independently.

| Day | Date | UI track | Tech/research track |
|---|---|---|---|
| 1 | 4 Nov | Review these docs, approve direction | Resolve open-questions 1, 2, 10, 11 (API key, primary-source claim checks) |
| 2 | 5 Nov | Scaffold, tokens, shell, mock adapter | Decide single contract vs split; contract skeleton |
| 3 | 6 Nov | Business dashboard + split animation | Router + ledger + credit math + unit tests |
| 4 | 7 Nov | Draw drawer + demo controls | Draw + repay + vault accounting tests |
| 5 | 8 Nov | LP vault + loan detail | Testnet deploy, mock USDC |
| 6 | 9 Nov | Pay link + landing | Swap mock adapter for real RPC views; vendor payout (Intents spike result) |
| 7 | 10 Nov | Responsive + polish | Demo agent script (sells service, draws, repays) |
| 8 | 11 Nov | Wallet connect, error states | Hardening, edge cases |
| 9 | 12 Nov | README, screenshots, 90 s video | Deploy UI, final testnet state |
| 10 | 13 Nov | X post, submission dry run | Buffer day |
| - | 14 Nov | Submit before 23:59 UTC (aim: by 12:00) | |

## Cut list (in order)
Attested score -> real Intents payout (keep logged/mocked, say so) -> gasless relayer -> LP withdraw queue -> light theme.

## Definition of done (what the screener checks)
- README: what it is, honest limitations, `one command` setup, `cargo test`, demo URL, testnet contract ids, track mapping.
- `/demo` works with no wallet; real testnet path documented.
- Public repo, X post with video, form submitted with both links, wallet address ready.

## Next step proposal
1. You review ui/00 and ui/01 (look + screens). Tell me what to change.
2. I run a UI reference sweep (Mobbin MCP + dataviz skill) into docs/ui/refs/ and draft a Figma or code prototype.
3. Parallel: I verify open-questions 1, 2, 10, 11 from primary sources.
