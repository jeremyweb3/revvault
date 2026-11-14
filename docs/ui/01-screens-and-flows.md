# Screens and flows

Three audiences, one app. Route sketch:

| Route | Audience | Purpose |
|---|---|---|
| `/` | Judges / visitors | Landing: one-line pitch, the loop diagram, "Open demo" |
| `/app/business` | Borrower (agent business) | Credit line, draw, repay progress, revenue, agent feed |
| `/app/business/draw` | Borrower | Draw flow (modal/drawer from above) |
| `/app/lp` | Liquidity provider | Vault stats, deposit/withdraw, loan book, risk |
| `/pay/[bizId]` | Customer / agent payer | Pay Link checkout (mobile-first) |
| `/app/loans/[id]` | Anyone | Loan detail: terms, schedule, events, tx links (transparency page) |
| `/demo` | Presenter | Control panel: simulate payments, speed up time, reset |

## Core demo story (90 s video, drives priorities)
1. (0–10) Business `biz-agent.testnet` shows a **credit limit**: derived from routed revenue ("Based on 30d routed revenue 2,400 → limit 960").
2. (10–30) Agent needs GPU compute: **Draw 500** to vendor "GPU-Provider". Vendor gets paid instantly (Intents or ft_transfer). Loan opens: repay 515, split 20%.
3. (30–60) Customers pay the **Pay Link**; each payment visibly splits: 20% repay, 80% to business. Debt bar shrinks.
4. (60–75) Loan hits 0 -> closed, limit restored, **limit grows** because routed revenue grew.
5. (75–90) LP view: pool utilisation, yield earned, loan book, risk panel.
Design every screen so these five beats read in one take.

## Screen specs

### S1 Landing `/`
- Hero: "Credit that repays itself from your revenue." Sub: one sentence. CTA: Open demo / View repo.
- 4-step loop diagram (Route revenue -> Get limit -> Draw to vendor -> Self-repay).
- Track badges (Autonomous Business, Real-World Money). Testnet disclaimer. Keep short.

### S2 Business dashboard `/app/business`
Data: `get_credit`, `get_loans`, `get_ledger`, events.
- **Header strip**: account id (mono), status chip (Active / Delinquent), repay split chip (editable).
- **Hero card**: Available credit (big), limit, outstanding, gauge showing used vs available.
- **Revenue card**: 30d routed revenue chart + "How your limit is calculated" popover (formula in plain words).
- **Active loan card**: principal, fee, repaid, remaining, due date, **debt progress bar** with the split animation on new payments.
- **Agent activity feed**: timeline of events ("Payment 120 routed → 24 repaid, 96 to business", "Draw 500 → GPU-Provider", "Vendor paid").
- **Constraints panel** ("Humans set only the constraints"): max draw, vendor allowlist, repay split, auto-draw rule. Read-only in MVP or simple toggles writing to local state.
- Actions: **Draw credit**, **Create pay link**, Repay early (optional).
- States: no history (starter limit banner), no loan, loan active, delinquent (red banner, limit 0), loading skeleton, error.

### S3 Draw flow (drawer)
Steps: amount (slider + input, capped at available) -> vendor (allowlist select or custom, shows network/asset) -> review (principal, fee, total to repay, repay split, est. days to clear at current revenue pace) -> confirm -> success with tx link + vendor receipt state (Pending / Paid via Intents).
- Live preview "est. clear in ~6 days at 80/day" is a strong trust element.
- Error states: exceeds limit, pool illiquid, delinquent.

### S4 Pay Link `/pay/[bizId]`
Mobile-first, almost no chrome: business name, amount (fixed or custom), reference, token (USDC), wallet pay button, success receipt. Fine print: "X% of this payment goes toward the seller's credit repayment" is optional; judges like seeing it, real customers wouldn't care, show as small "How it works" disclosure.
- Create-pay-link modal on the business side: amount, memo, copy link / QR.

### S5 LP vault `/app/lp`
Data: `get_vault_stats`, `get_lp`.
- Header stats: TVL, Utilisation, Illustrative APY (labelled), Reserve (first-loss), Open loans, Delinquent.
- Deposit/Withdraw card (balance, shares, value, earned, liquidity-available note).
- **Loan book table**: business, principal, repaid %, due, status; row opens S6.
- **Risk panel**: advance rate, repay split distribution, concentration (largest borrower %), reserve coverage, "what happens on default" in 3 lines.
- Utilisation / yield chart.

### S6 Loan detail `/app/loans/[id]`
Terms, schedule of repayments received (each with payment ref and tx link), live status, parties. Doubles as the "proof it's on-chain" page.

### S7 Demo control `/demo`
Presenter-only: "Simulate customer payment" (amount), "Fast-forward time", "Reset seed", network indicator (mock vs testnet). Hidden from nav, linked in README. Needed so judges (and the Codex screener) can see the loop without waiting.

## Empty/first-run
Business with no history: explain "Route revenue through your pay link to unlock credit", show starter limit. LP with no deposit: simple deposit CTA.

## Content/tone
Plain finance words: "credit line", "repays itself", "advance". Avoid jargon (RWA, tokenize) in primary UI; keep in README.
