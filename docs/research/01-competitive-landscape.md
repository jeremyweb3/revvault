# Competitive landscape

Confidence key: **V** verified in a source this session, **U** unverified / directory-only, must check primary sites before citing publicly.

## Solana analogues (inspiration)
| Project | What it does | Take for RevVault | Conf. |
|---|---|---|---|
| attn.markets | Revenue-backed credit line; repayments auto-taken from an agreed share of incoming revenue (e.g. creator fees) | Closest analogue. Copy the mental model: "borrow against future revenue, repaid by a revenue split" | U (directories, Breakpoint write-up) |
| Yumi Finance | BNPL: pay-in-4 checkout SDK, B2B Net-30 invoice financing, private LP capital, underwriting -> origination | Borrow the **checkout/merchant-style UX** and the idea of LPs taking default risk | U |
| Hobba | Self-repaying loans: collateral yield pays down debt; "In Development" on a directory | Different mechanism (collateral yield, not revenue). Cite only for the "self-repaying" term | U |
| Clipstake | Not found in any search result | Do not cite until verified | U |

Primary sources to check before the pitch: attn.markets, hobba.io, Colosseum winners blog (linked in the pitch).

## NEAR-side prior art
| Item | Relevance | Conf. |
|---|---|---|
| bond.credit | Lists NEAR among chains; "credit rails for autonomous agents", trust-backed agent credit lines, USDC/CCTP. Closest NEAR-adjacent competitor. Live status on NEAR unknown | V (listing) / U (live) |
| Vibe Lending (ZcashxNEAR hackathon) | Idea page: private lending via Intents + AI credit scoring | V (idea only) |
| Roke.to | One-way token streaming (from the pitch) | U |
| Ping Subscription Shade Agent | Recurring payments (from the pitch) | U |
| near.com super-app | Intents-powered swaps 35+ chains; plans virtual accounts, cards, tokenized RWA. No financing mentioned | V |

Search result: **no NEAR-native revenue-based financing / BNPL product for agents was found** (2026-11-04 search, thin sources). So "no one has shipped this on NEAR" is plausible but unproven. See 02.

## Positioning sentence (safe version)
"RevVault is the first revenue-routed credit line for autonomous agent businesses on NEAR: credit limits come from revenue that already flowed through the vault, and repayment is a programmable split of every future payment."

## UI references to collect (for the UI phase)
- Fintech credit dashboards: Ramp, Brex (credit line + repayment schedule), Mercury, Credit Karma-style limit gauges.
- DeFi vault pages: Morpho, Maple, Goldfinch (pool, tranche, APY, loan book), Pendle (yield notes).
- Mobbin MCP is available for flows: search "credit limit", "repayment schedule", "invoice", "checkout".
- Collect 8–12 refs into docs/ui/refs/ during UI phase.
