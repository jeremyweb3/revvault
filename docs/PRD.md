# RevVault — PRD (synthesised from docs/, no new facts)

Sources: README.md, docs/research/00-02, docs/tech/*, docs/ui/*, docs/03-build-plan.md. Where this file and a source differ, the source wins; report the gap.

## Product
RevVault is revenue-based financing and a self-repaying credit line for autonomous AI businesses on NEAR. A business routes its customer payments through a RevVault pay link/router. The credit limit is derived from revenue that already flowed through the router. A draw pays a vendor directly; a programmable share of every future routed payment repays the loan automatically. LPs fund the vault and earn fee yield.

## Target
NEAR Hackathon, deadline 14 Nov 2026 23:59 UTC (aim to submit by 12:00), judging 16-18 Nov. Tracks: 04 Autonomous Business, 08 Real-World Money, stretch 01 Unstoppable DeFi. Testnet only. Screening by Claude Code / Codex: the repo must run and match the README.

## Fixed by the docs
- Chain NEAR testnet; contracts Rust near-sdk; own mock USDC FT (6 decimals); vendor payout via NEAR Intents 1Click API (fallback ft_transfer).
- Single contract with module boundaries (recommendation in contracts-spec); flat fee (3%) not APR.
- Frontend Next.js (read node_modules/next/dist/docs first), TypeScript, mock-first adapter behind the RevVaultApi interface.
- Design: prototype/index.html (app) and prototype/landing.html (landing) are approved visual truth. Where docs/ui/00-design-direction (Geist, #00EC97) conflicts with the prototype (Mona Sans, Press Start 2P), the prototype wins.

## Honesty constraints (repeat everywhere)
1. Only routed revenue counts as collateral.
2. Meta Transactions (NEP-366) do not redirect revenue.
3. Not first-of-its-kind on NEAR: bond.credit lists NEAR. Claim only "first revenue-routed credit line for agent businesses on NEAR".
4. APY is illustrative.
5. Repayment is economic, not legal.
6. The demo uses mock data until contracts are wired; the UI must label Mock vs Testnet.

## Demo story (90 s)
Limit from routed revenue -> draw 500 to GPU-Provider (repay 515, split 20%) -> customers pay the pay link, split animation, debt bar shrinks -> loan closes, limit grows -> LP vault view.

## Scope and cut order
Keep: router, credit draw, self-repay, LP deposit/yield, dashboard, pay link, /demo. Cut order: attested score, real Intents payout (mock+log, say so), gasless relayer, LP withdraw queue, light theme. Chain Signatures already cut.

## Definition of done
README (what, limitations, one-command setup, cargo test, demo URL, testnet ids, track mapping); /demo works without a wallet; public repo; X post; form submitted.
