# Open questions to verify (spikes, in priority order)

Each item: question -> how to resolve -> blocker for what.

1. **1Click API access**: do we get an API key quickly? Is testnet supported or mainnet only? -> docs.near-intents.org (llms.txt index fetched; request-a-quote page: `POST https://1click.chaindefuser.com/v0/quote`, `X-API-Key`). Spike: dry quote for a small amount. *Blocks: real vendor payout.*
2. **Pay into Intents account vs `ft_transfer`**: `depositType` ORIGIN_CHAIN vs INTENTS; can a NEAR contract pay a vendor through the Verifier (`intents.near`) via `ft_transfer_call`? -> Verifier Deposits page. *Blocks: contract-side Intents integration.*
3. **Stablecoin on testnet**: use own mock USDC FT (recommended) vs bridged. *Blocks: demo setup.*
4. **near-sdk version and NEP-141 receiver patterns** (`ft_on_transfer` returns unused amount; promise callbacks). Check current near-sdk docs; no source found this session for near-sdk 5 specifics. *Blocks: contract coding.*
5. **Sub-account creation from contract + function-call key addition** for per-business router and agent keys. *Blocks: per-business router; fallback is shared router.*
6. **Gasless (NEP-366) relayer**: reference relayer in NEAR docs; is it worth 1 day? Likely cut to "nice to have". *Blocks: nothing critical.*
7. **Wallet connection for the UI**: current recommended library (near-connect / wallet-selector) and testnet wallets. *Blocks: UI wallet button; mock until then.*
8. **Indexer source** for history boost: NEAR Lake / FastNEAR / NearBlocks API rate limits. *Blocks: attested score only (cuttable).*
9. **Next.js version**: AGENTS.md warns this Next.js has breaking changes. When scaffolding, read `node_modules/next/dist/docs/` first. *Blocks: UI scaffold.*
10. **Verify competitor claims** (attn.markets, Yumi, Hobba, Clipstake, bond.credit live status on NEAR) from primary sites. *Blocks: pitch wording.*
11. **Roke.to and Ping Subscription** claims in the pitch. *Blocks: pitch wording.*

## Decisions needed from Candra
- Team size / who writes Rust? (Affects contract scope and whether UI runs fully on mock for the first days.)
- Enter Track 01 as well as 04 + 08? (Costs nothing in code; affects README framing.)
- Mock-first for UI is assumed (see ui/02). Confirm.
