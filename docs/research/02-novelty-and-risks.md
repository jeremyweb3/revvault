# Novelty claims and risks (honest review of the pitch)

## Claims to correct before submitting
1. **"First-of-its-kind on NEAR"** — bond.credit lists NEAR for agent credit lines. Reword to the revenue-routing angle. Never state "no one has built this" without the caveat.
2. **"Hobba = revenue-based self-repaying"** — sources describe collateral-yield repayment. Don't misattribute.
3. **"Clipstake"** — unverified. Drop or verify.
4. **Roke.to / Ping descriptions** — taken from the pitch; verify on the cited pages before quoting.
5. **Potential 9.0/10 win score** — an internal guess, not evidence. Don't put it in the README.

## Design risks (these decide the architecture)

### R1. Revenue interception (critical)
The pitch says income arriving "through Meta Transactions" is redirected into a lockbox. It isn't how NEAR works: a meta transaction (NEP-366) lets a relayer pay gas for a user-signed action; it does not reroute incoming funds. Funds land in whatever account the payer sends to.
**Resolution:** the business receives money only through a **RevVault Pay Link / Router** contract (the payee is the router). Router splits each payment: X% repay, rest to business. Revenue not routed through RevVault is invisible and not collateral. This is also how attn.markets-style products work. Frame it as a feature: "route your revenue through RevVault to unlock credit".

### R2. Underwriting on-chain (high)
Contracts can't query historical txs. Options:
- (a) **Router-native credit**: limit = f(routed revenue over trailing window, tracked in contract storage). Fully on-chain, verifiable, but cold-start needs history. Mitigate with a small starter limit.
- (b) **Indexer + attestation**: off-chain indexer (NEAR Lake / FastNEAR / NearBlocks API) computes a score from incoming FT transfers to biz account, signs it (ed25519); contract verifies the signature. Adds trust in the scorer. Label honestly in UI ("score attested by RevVault Oracle").
**MVP:** (a) + optional (b) displayed as a "history boost" that is clearly labelled attested.

### R3. Default risk (high, judges will ask)
If revenue dries up, LPs lose. Mitigations that fit MVP: conservative advance rate (e.g. ≤ 40% of trailing 30-day routed revenue), repay split sized so loan clears in ≤ N days, per-business cap, LP first-loss reserve funded by a protocol fee, auto-pause new draws when repayment lags. Show these numbers in the UI risk panel.

### R4. Diverting revenue
A business could stop routing payments through RevVault. Mitigations: draw is only released against routed revenue history; vendor payout goes directly to the vendor (never to the borrower); delinquency flag and reduced limit. State it plainly as a known limitation: enforcement is economic + reputational, not legal.

### R5. Intents integration risk (medium)
Vendor payouts via NEAR Intents 1Click API need an API key, a deposit-address flow, status polling. Cross-chain payout on testnet is not guaranteed. Fallback: payout in NEAR-native stablecoin (e.g. USDC on NEAR) via `ft_transfer`, with Intents as the real path demonstrated on mainnet with a tiny amount, or recorded in the demo video. Decide after an API-key spike (tech/open-questions).

### R6. Regulatory framing (low for hackathon, judges may ask)
Lending to businesses with LP pools resembles a securities/credit product. Frame as an experimental testnet protocol; do not promise yield; show "illustrative APY".

### R7. Scope vs 10 days (high)
Three modules + indexer + Intents + polished UI is a lot. Cut order if behind: Chain Signatures (already cut) -> indexer attestation -> real Intents payout (keep as mock+log) -> LP tranche logic. Keep: router, credit line draw, self-repay, LP deposit/yield, dashboard.

## What stays distinctive
Credit that is *bounded by revenue that actually flowed through the vault*, repaid by a programmable split, serving *autonomous agent businesses* (no human treasurer), with vendor payments settled through NEAR Intents. That is credible, demoable, and maps directly onto Track 04's "revenue sharing" and Track 08's "usable tomorrow".
