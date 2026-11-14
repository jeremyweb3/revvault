# Component inventory and mock data contract

Goal: build the whole UI against a **mock adapter** with the exact shape the contract views will return, so swapping to testnet is a single module change.

## Components
**Primitives (shadcn base):** Button, Card, Badge/StatusChip, Input, Slider, Tabs, Dialog/Drawer, Tooltip/Popover, Table, Skeleton, Toast.
**Domain:**
- `AmountDisplay` (tabular mono, token symbol, compact/full)
- `AccountId` (mono, truncate, copy, explorer link)
- `CreditGauge` (used vs available vs limit)
- `DebtProgressBar` (principal+fee, repaid, remaining; accepts `onSplit` animation trigger)
- `PaymentSplitAnimation` (signature animation)
- `RevenueChart` (30d routed revenue, hover tooltip, limit overlay)
- `LimitExplainer` (formula in plain words with live numbers)
- `ActivityFeed` / `EventRow` (icon, text, amount, time, tx link)
- `DrawDrawer` (stepper), `VendorSelect`, `RepayPreview` (est. days to clear)
- `PayLinkForm`, `PayLinkCheckout`, `QRBlock`
- `VaultStatCard`, `UtilisationChart`, `LoanBookTable`, `RiskPanel`
- `ConstraintsPanel`
- `DemoControls`, `NetworkBadge` (Mock / Testnet)
- `WalletButton` (stub first)

## Mock adapter interface (TypeScript sketch)
```ts
type Amt = string // u128 as string, 6 decimals; format in UI only

interface Credit { limit: Amt; available: Amt; outstanding: Amt; trailingRevenue: Amt;
  advanceRateBps: number; status: 'active'|'delinquent'|'paused'; noHistory: boolean }
interface Loan { id: string; business: string; vendor: string; principal: Amt; fee: Amt;
  repaid: Amt; openedAt: number; dueAt: number; memo: string; status: 'open'|'closed'|'delinquent' }
interface RevenueBucket { day: string; amount: Amt }
interface VaultStats { tvl: Amt; cash: Amt; reserve: Amt; utilisationBps: number;
  illustrativeApyBps: number; openLoans: number; delinquent: number }
interface Event { id: string; type: 'payment_routed'|'repay_applied'|'draw_opened'|'vendor_paid'|
  'loan_closed'|'lp_deposit'|'lp_withdraw'|'business_delinquent'; ts: number; amount?: Amt; ref?: string; tx?: string }

interface RevVaultApi {
  getCredit(acct: string): Promise<Credit>
  getLoans(acct: string): Promise<Loan[]>
  getLedger(acct: string, days: number): Promise<RevenueBucket[]>
  getVaultStats(): Promise<VaultStats>
  getLp(acct: string): Promise<{ shares: Amt; value: Amt; earned: Amt }>
  getEvents(acct?: string): Promise<Event[]>
  requestDraw(i:{amount:Amt; vendor:string; memo:string}): Promise<{loanId:string; tx:string}>
  routePayment(i:{biz:string; amount:Amt; ref:string}): Promise<{tx:string; repaid:Amt; toBiz:Amt}>
  lpDeposit(amount: Amt): Promise<{tx:string}>; lpWithdraw(shares: Amt): Promise<{tx:string}>
}
```
Mock implementation holds state in memory (+ localStorage), applies the same math as contracts-spec so the UI behaviour is faithful. `/demo` controls call `routePayment` and a mock clock.

## Seed data (demo)
- Business `biz-agent.testnet`: 30 days of routed revenue ramping 40 → 120/day, no loan at start, advance rate 40%.
- Vault: TVL 25,000, 3 other businesses with open loans at various repay % (one 'delinquent' for the risk story, optional).
- Vendors: GPU-Provider, LLM-API, Data-Feed.

## Build order for the UI
1. Tokens/theme + layout shell + mock adapter.
2. Business dashboard (S2) + payment split animation.
3. Draw drawer (S3) + demo controls (S7).
4. LP vault (S5) + loan detail (S6).
5. Pay link (S4) + landing (S1).
6. Polish pass, responsive, reduced motion, demo-video run-through.
