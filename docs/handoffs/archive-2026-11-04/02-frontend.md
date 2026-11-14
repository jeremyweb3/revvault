# 02 — Frontend port (R2)

You cannot ask the user questions; everything you need is in this file, `contracts.md`, and the research it links. Report deviations instead of guessing.

## Context — read first
- `docs/handoffs/00-overview.md` (demo path = your P0), `docs/handoffs/contracts.md` (**all of it**: §8 adapter types, §9 engine, §10 vendor labelling, §12 env names, §14 routes, §15 honesty).
- `docs/research/01-design-system.md`: **everything**. Its Findings are embedded verbatim as Appendix A below so you never re-derive a token; the file also holds Recommendations 1-10, Implications (frontend) and Assumptions.
- `docs/research/02-tech-stack.md`: Findings "Wallet connection", "RPC endpoints and browser view calls", "Next.js (open question 9)"; Recommendations table; Implications: frontend.
- `docs/research/04-repo-audit.md`: R1 layout, R3 commands, R5 toolchain, R10 ownership.
- `docs/research/05-synthesis.md`: D2, D6, D7, D8, D9, D11 and contradictions 7-9.
- `docs/ui/01-screens-and-flows.md` (screen specs S1-S7) and `docs/ui/02-component-inventory.md` (component names, seed data). The prototype overrides `docs/ui/00-design-direction.md`.
- The prototype itself: `prototype/index.html` and `prototype/landing.html` (read fully; do not edit; it stays at `prototype/` until Day 9).
- **First action after `pnpm install`:** read `app/node_modules/next/dist/docs/` (AGENTS.md: this Next.js has breaking changes; the research lists the 16 changes: async `params`, `proxy.ts`, Turbopack default, no `next lint`, `NEXT_PUBLIC_` env only).

## Tools — skills and MCP
- `work:nextjs-app-router` and `vercel:nextjs`: before writing routes, layouts, Server/Client boundaries, metadata, fonts.
- `work:reuse-first`: before each new component (inventory first).
- `work:typescript-types`, `work:react-components`, `work:ui-architecture`: component APIs and types.
- `pixel-perfect` and `design-review`: after each screen, compare to the prototype at 1280px and 390px.
- `awwwards-motion` / `work:animation-qa`: only to check reduced-motion and 60fps of the split animation and landing scroll; no GSAP/Motion dependency is approved.
- `near-dapp` (near/agent-skills; only if the user approved the install): wallet connection, **Path B only** (`npm install` of `@hot-labs/near-connect`; never run `npx create-near-app`); set `network: 'testnet'`.
- Optional `context7` MCP for Next 16 and near-connect docs.
- Do not use the Solana/Stellar/Soroban skills.

## Owned paths
`app/**` (including `app/package.json`, `app/public/`, `app/lib/api/`, `app/lib/engine/`, tests under `app/**`), `docs/ui/**`. You read `prototype/**`, `contracts/fixtures/**`, `docs/handoffs/**`. You do not edit root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.nvmrc`, `Makefile`, `.env.example`, `.gitignore`, `README.md`, `.github/**`, `scripts/**`, `contracts/**`. Dependencies, env names and scripts go through `docs/handoffs/DEPS.md`.

## Responsibilities
Port the approved HTML prototype to a Next.js App Router app, pixel-faithful, mock-first behind the `RevVaultApi` adapter (contracts.md §8), with a real testnet RPC adapter and optional wallet connect. Design in-system the screens the prototype lacks. Own the TS credit engine that mirrors the contract math.

## Scope
### In scope
- Tokens and global CSS ported from the prototype (plain CSS; names verbatim per Appendix A and Recommendation 1 of 01-design-system.md).
- Routes in contracts.md §14. Shared app shell with floating pill nav for `/app/*`.
- `app/lib/engine/` (bigint, pure), `app/lib/api/{types,mock,testnet,index}.ts`, mode switch by `NEXT_PUBLIC_REVVAULT_MODE`.
- Components named per `docs/ui/02-component-inventory.md` (AmountDisplay, AccountId, CreditGauge, DebtProgressBar, PaymentSplitAnimation, RevenueChart, LimitExplainer, ActivityFeed/EventRow, DrawDrawer, VendorSelect, RepayPreview, PayLinkForm, PayLinkCheckout, QRBlock, VaultStatCard, UtilisationChart, LoanBookTable, RiskPanel, ConstraintsPanel, DemoControls, NetworkBadge, WalletButton, Toast, Skeleton).
- Honesty copy fixes (Appendix A, row "Honesty copy"; contracts.md §10).
- Self-hosted fonts, no external requests at runtime.
- A hosted mock-mode build must pass with **no env vars**.
### Out of scope
- Any contract, script, Makefile, CI, README text (send R4 a README block instead).
- Tailwind, shadcn, chart libraries, GSAP/Motion, icon libraries (icons are the prototype's inline SVGs).
- Server API routes, a backend, indexers, NEP-366/relayer UI, attested-score UI, LP withdraw queue UI, light theme.
- Editing `prototype/`. Moving it is R4's job on Day 9.
- Reading `.env*`.

## Objectives
1. The demo path in `00-overview.md` runs in mock mode, click for click, at 1280px and 390px.
2. The UI cannot blur Mock and Testnet; no copy overclaims.
3. Swapping mock for testnet is a one-module change (`app/lib/api/index.ts`).

## Requirements
| # | Priority | Requirement |
|---|---|---|
| 1 | P0 | Scaffold `app/` (Next 16.4.5, React 19.3.1, TS strict, ESLint run directly, scripts `dev`, `build`, `start`, `typecheck`, `lint`, `test`). Read the bundled docs first. Request the exact deps in DEPS.md on Day 1; stub until R4 applies. |
| 2 | P0 | `tokens.css` + global styles from the prototype (Appendix A §1-8); Mona Sans + Press Start 2P self-hosted (verify availability; if `next/font/google` cannot serve Mona Sans, use `next/font/local` with the official OFL files committed in `app/public/fonts/`). |
| 3 | P0 | `app/lib/engine/` bigint engine + tests asserting the worked example in contracts.md §4 (and `contracts/fixtures/math-vectors.json` once R1 publishes it, Day 3). Default repay split **20%**. |
| 4 | P0 | Mock adapter implementing all of `RevVaultApi`, seeded per `docs/ui/02` and the prototype seed with split 20%; state in memory + localStorage; `demo.fastForward/reset`. |
| 5 | P0 | `/app/business`: header strip (account id with copy, status chip, editable repay-split chip, NetworkBadge), hero available-credit card + gauge, revenue chart (30d, limit overlay, tooltip), LimitExplainer popover with live numbers, active-loan card + DebtProgressBar that **stays mounted and animates** width changes, activity feed, constraints panel, actions. States: no-history starter banner, no loan, loan active, delinquent (red banner, limit 0), loading skeleton, error. |
| 6 | P0 | Draw flow: centred modal on desktop, bottom sheet ≤640px; steps amount -> vendor -> review (principal, fee, repay total, split, est. days) -> confirm -> success (receipt "Paid (mock)" or testnet tx link). Errors: exceeds limit, pool illiquid, delinquent. Focus trap, Esc closes. |
| 7 | P0 | PaymentSplitAnimation: ≤1.2 s, skippable, reduced motion shows final widths; triggers on `routePayment`. |
| 8 | P0 | `/demo`: buttons **Customer pays 500 / 1,000 / 1,500**, +7 days, +31 days (go past due), Reset, NetworkBadge; suggested-take copy corrected to match (draw 500 -> three payments -> loan closes, limit 960 -> 2,000). Hidden from nav. Works with no wallet. |
| 9 | P0 | `/app/lp`: stats (TVL, utilisation, illustrative APY labelled "Illustrative", reserve, open loans, delinquent), deposit/withdraw card (withdraw shows "available liquidity" error), loan book table with one delinquent borrower, RiskPanel (advance rate, split, concentration, reserve cover, default in 3 lines). |
| 10 | P0 | Honesty copy: marquee "Meta transactions" removed or reworded; "Verified agent business" reworded; "No collateral locked"/"Funds never touch the borrower" qualified; "via NEAR Intents" only inside a block labelled "Mainnet quote preview — no funds moved"; keep "Illustrative APY… Not a promise of yield", "Repayment is enforced by economics, not by law", footer "Prototype on mock data", the four "Honest limits". Mock/Testnet chip always visible on `/app/*`. |
| 11 | P0 | `npm`-equivalent `pnpm --filter app build` passes with no env vars; `typecheck`, `lint`, `test` scripts exit 0. |
| 12 | P1 | `/pay/[bizId]` full mobile-first page: business name, amount (fixed/custom), reference, USDC, pay button (mock: calls `routePayment`; testnet: `ft_transfer_call` via wallet/demo key), receipt, "How it works" disclosure; create-pay-link modal on the business page with QRBlock (hand-rolled SVG QR or request a dep via DEPS.md; do not add a library silently). |
| 13 | P1 | Landing `/`: port all prototype sections as client leaf components with one scroll controller; add track badges (Autonomous Business, Real-World Money); testnet disclaimer; CTA "Open demo" -> `/app/business`; hero stays matched to the Pawket hero as approved. |
| 14 | P1 | `/app/loans`, `/app/loans/[id]` (terms, repayment schedule with refs and tx links, parties), `/app/activity`. |
| 15 | P1 | Testnet RPC adapter (`call_function` via `fetch` to `NEXT_PUBLIC_NEAR_RPC_URL`, poll 3-5 s, cache + debounce), view-only, per contracts.md §5; NetworkBadge "Testnet". |
| 16 | P1 | Wallet connect (`@hot-labs/near-connect`, client-only, `ssr:false`/effect-created, `network:'testnet'`, `signIn.contractId` + non-deposit methods) + write paths (`requestDraw`, `routePayment` via `ft_transfer_call` 1 yocto, `lpDeposit`, `setRepayShare`); demo-key fallback; verify which wallets work on testnet and note it in the report. |
| 17 | P1 | Responsive pass: 1280, 1024, 768, 390; a11y fixes (modal focus trap, table captions, contrast of `--faint` measured and fixed if <4.5:1 on body text). |
| 18 | P1 | Intents preview card on `/app/lp` or draw success, reading `deployments/intents-preview.json` if present (contracts.md §11); absent -> hidden. |
| 19 | P2 | Count-up on first load; skeleton polish; error boundary pages; Open Graph image. |
| 20 | P2 | Loans/activity filters; keyboard shortcuts. |

## Dependencies
- R4 Day-1: pnpm workspace, root `package.json`; deps you need are pre-approved and applied by R4: `next@16.4.5`, `react@19.3.1`, `react-dom@19.3.1`, `typescript`, `eslint` + `eslint-config-next` matching, a test runner (`vitest`), `@hot-labs/near-connect@0.12.0`. Anything beyond: DEPS.md.
- R1: `contracts/fixtures/math-vectors.json` (Day 3), `contracts/INTERFACE.md` (Day 3), testnet ids in `deployments/testnet.json` from R3 (Day 5-6).
- Feeds: R3 imports `app/lib/engine/` and `app/lib/api/types.ts` read-only: keep both free of React/Next/DOM imports and stable; announce breaking changes to the PM.
- Hosted mock URL (Day 9) with R4 and the user's Vercel account.

## Constraints
- Honesty (verbatim, must appear as UI copy where relevant): only routed revenue counts as collateral; Meta Transactions do not redirect revenue; not first-of-its-kind on NEAR (bond.credit lists NEAR) so claim only "the first revenue-routed credit line for autonomous agent businesses on NEAR"; APY is illustrative; repayment is economic, not legal; the demo uses mock data until contracts are wired (show Mock vs Testnet).
- Money is bigint/strings, never floats. Format only at the edge.
- Server Components by default; `'use client'` on interactive leaves only (never on a layout or page for one button). Wallet and scroll code are client leaves.
- Every animation respects `prefers-reduced-motion`.
- No comments in code, TS strict, no `any`, no `@ts-ignore`, no non-null `!` to silence a real nullable, no inline `onclick` string handlers, no `dangerouslySetInnerHTML` for templates.
- No new dependency without DEPS.md. No `NEXT_PUBLIC_` secrets. Never read `.env*`.
- Do not import `near-api-js` in server code. Do not touch `prototype/` or any path you do not own.
- Never `git commit/push`/`git add -A`/`.`.
- English everywhere.

## Deliverables
| Item | Priority |
|---|---|
| `app/` scaffold + tokens + shell + fonts | P0 |
| `app/lib/engine/` + tests | P0 |
| `app/lib/api/` types, mock adapter, mode switch | P0 |
| `/app/business`, draw modal, split animation, `/demo`, `/app/lp` | P0 |
| Honesty copy pass | P0 |
| `/pay/[bizId]`, create-link modal + QR | P1 |
| Landing `/` | P1 |
| `/app/loans`, `/app/loans/[id]`, `/app/activity` | P1 |
| Testnet RPC adapter, wallet connect + writes | P1 |
| README block for R4 (screens, modes, how to flip to testnet), screenshots list | P1 |
| `docs/ui` addendum: "prototype overrides 00-design-direction" | P1 |

## Acceptance criteria
1. With no env vars: `pnpm --filter app build` and `pnpm --filter app start`, then `curl -f` of `/`, `/demo`, `/app/business`, `/app/lp` returns 200 (R4's `scripts/smoke.sh` does this).
2. `pnpm typecheck`, `pnpm lint`, `pnpm --filter app test` exit 0; engine tests assert the §4 worked example (limit 960, fee 15, debt 515, repay 100/200/215, limit 2,000).
3. Walk the demo path in a browser at 1280px and 390px; the split animation plays ≤1.2 s, can be skipped, and with `prefers-reduced-motion: reduce` shows final state with no motion; screenshots saved for R4 (list in the report).
4. Compare each P0 screen with the prototype using `pixel-perfect`: tokens identical to Appendix A; report residual diffs.
5. `grep -rn "any\b\|@ts-ignore\|dangerouslySetInnerHTML" app --include=*.ts --include=*.tsx` finds nothing (excluding node_modules and `.next`); `grep -rn "Meta transactions\|Verified agent" app` finds nothing unqualified.
6. Mock/Testnet chip visible on every `/app/*` page; "via NEAR Intents" appears only inside the preview-labelled block.
7. Bundle sanity: no `near-api-js` in server bundles (`next build` output, state any warning).
8. Failure states reachable via `/demo` (past due -> delinquent banner and limit 0) and via draw errors (over limit).
9. Network tab on `/demo` in mock mode shows no third-party requests (fonts self-hosted).

## If behind schedule — cut first
1. P2s. 2. Landing polish (ship a reduced landing: hero, loop diagram, honest limits, CTA). 3. `/app/loans/[id]`, `/app/activity`. 4. Wallet connect (keep testnet read-only adapter + demo key). 5. Testnet adapter writes. 6. QR code. Never cut: engine, mock adapter, business dashboard, draw modal, split animation, `/demo`, LP page, honesty copy, no-env build.

---

# Appendix A — Design-system inventory (verbatim from docs/research/01-design-system.md, Findings)

Citation key: `I:n` = prototype/index.html line n, `L:n` = prototype/landing.html line n, `D0/D1/D2` = docs/ui/00, 01, 02, `PRD:n` = docs/PRD.md. The prototype is approved visual truth.


### 1. Tokens: CSS custom properties

App `:root` (I:12-20):

| Token | Value | Used for (cite) | var() uses in I |
|---|---|---|---|
| `--page` | `#10131A` | html/body bg (I:22); segmented pressed bg (I:121); input bg (I:196,224); active steps? no | 4 |
| `--card` | `#1A1E27` | `.card` (I:65), `.menu` (I:83), `.modal` (I:186), `.phone-in` (I:217), glow base (I:66) | 5 |
| `--card-2` | `#242934` | nested surface: secondary btn (I:38), pill (I:48), round (I:50), chip default (I:55), meter/debt tracks (I:114,132), `.rule` (I:123), `.ev` (I:161), `.review` (I:201), `.pick` (I:205), active nav item (I:77), splitviz (I:138) | 20 |
| `--hover` | `#2B313D` | hover of secondary/pill/round/acct-chip (I:39,49,51,91) | 4 |
| `--line` | `rgba(255,255,255,.06)` | default 1px hairline (card, table rows, ev) | 12 |
| `--line-2` | `rgba(255,255,255,.11)` | stronger border: nav, modal, inputs, secondary btn, focused-ish | 10 |
| `--text` | `#F1F4FA` | primary text (I:22) | 14 |
| `--mute` | `#9AA3B4` | secondary text, inactive icons | 21 |
| `--faint` | `#687286` | tertiary text, table headers, hints (I:200) | 13 |
| `--accent` | `#7C98FF` | primary btn bg (I:36), focus ring (I:31), step-on (I:190), chart bars (I:154), toast bg (I:209), chip.blue, utilisation meter (I:473) | 11 |
| `--accent-2` | `#5B7CFF` | defined, never referenced (0 uses) | 0 |
| `--accent-soft` | `rgba(124,152,255,.14)` | chip.blue (I:60), selected pick (I:206), fresh-event flash (I:163), info banner (I:212) | 4 |
| `--accent-ink` | `#0A1440` | text on accent (primary btn I:36, toast I:209) | 2 |
| `--up` | `#54D6A0` | inflow/business: `.up` text, split bar `.b` (I:144), limit dashed line (I:156), meter remainder (I:413) | 5 |
| `--down` | `#FF7E61` | delinquent/danger: `.btn.danger` (I:40), chip.bad (I:58), banner (I:211) | 4 |
| `--warn` | `#F2BE5C` | nav dot (I:79), chip.warn (I:59), `.warn-t` (I:29), netchip dot (I:89) | 4 |
| `--ok` | `#86E3B5` | repaid portion `.debt .paid` (I:134), chip.ok (I:57), mini-meter (I:181) | 3 |
| `--op` | `#5CD3FF` | chip.op (I:61); badge tone via literal | 1 |
| `--repay` | `#F2BE5C` | repay slice: `.debt .flash` (I:135), split bar `.a` (I:143), used meter (I:413) | 4 |
| `--r` | `24px` | `.card` radius only (I:65) | 1 |
| `--sans` | `"Mona Sans", system-ui, -apple-system, sans-serif` | body, `.see-all` (I:19,23,104) | 2 |

Landing `:root` (L:13-21) re-declares identical `--page --card --card-2 --hover --line --line-2 --text --mute --faint --accent --accent-2 --accent-ink --accent-soft --up --down --warn --op --sans`, drops `--ok --repay --r`, and adds:

| Token | Value | Use |
|---|---|---|
| `--violet` | `#C59BFF` | defined, 0 var() uses (violet appears only as literals, e.g. L:90, L:68, L:75) |
| `--glide` | `cubic-bezier(.2,.8,.2,1)` | the house easing, 15 uses (reveals, step expand, hero glass, wipes) |
| `--gut` | `clamp(1rem,4vw,3rem)` | page side gutter (L:21,32,46,167,239) |

Landing-only unused-in-var tokens: `--accent-2`, `--accent-soft`, `--down`, `--op`, `--violet` (0 var() uses each). `--ok` is absent in landing; its value is hardcoded as `#86E3B5` (L:93,99).

Literal colour values not in tokens (port decisions needed):
- Primary gradient button: `linear-gradient(180deg,#6E8BFF,#4A6BF5)`, hover `#7E98FF -> #5677FA`, shadow `inset 0 1px 0 rgba(255,255,255,.28), 0 10px 24px -10px rgba(74,107,245,.9)` (I:43-44, L:59-60, brand mark I:70, L:49). Gradient title text `#8FB1FF -> #C59BFF 60% -> #FF9B8A` (L:75, dead rule).
- `.btn.primary:hover` `#9DB2FF` (I:37). Card glow: `radial-gradient(120% 90% at 100% 100%, rgba(46,91,255,.42), rgba(46,91,255,0) 62%)` + border `rgba(124,152,255,.32)` (I:66).
- Nav glass bg `rgba(26,30,39,.78)` app (I:68) vs `.72` landing (L:47). Nav link idle text `#CBD2DE` (I:74, L:53).
- Scrim `rgba(6,8,13,.7)` (I:184). Phone bezel `#0B0E16` (I:216). Dark ink on coloured bars `#0B1020` (I:142, L:104). Danger tints `rgba(255,126,97,.1/.13/.22/.25)` (I:40,58,211). Warn tint `rgba(242,190,92,.13)`; ok tint `rgba(134,227,181,.11)`; op tint `rgba(92,211,255,.12)` (I:57-61).
- Badge tone triplets via `--t` (rgb channels): default `124,152,255`; `op 92,211,255`; `warn 242,190,92`; `ok 134,227,181` (I:52-54); landing adds `vi 197,155,255` (L:90).
- Vendor colours: GPU `#5CD3FF`, LLM `#C59BFF`, Data `#86E3B5` (I:301-303); avatar bg = `color-mix(in srgb, var(--c,#7C98FF) 30%, var(--card-2))` (I:179).
- Account avatar `conic-gradient(from 90deg,#5CD3FF,#7C98FF,#3D63F5,#5CD3FF)` (I:92).
- Landing diagram node hot fill `#262E48` (L:148); coin ink `#0A1440` / `#2A1C00` / `#04281A` (L:153-155); hero blue fallback bg `#1f4fd0` (L:266); stat-chip bg `rgba(16,19,26,.82)` (L:157).
- Semantic mapping to keep consistent: accent = neutral/primary/selected; up/ok = money to business, repaid; repay/warn (amber, same hex `#F2BE5C`) = money to loan, warnings, "Open"; down = past due only; op (cyan) = vendor/payout/infra. Event icon/tone map I:385.

### 2. Typography

- Families (I:9, L:9): `Mona Sans` wght 400;500;600;700;900 (variable via Google Fonts CSS2) and `Press Start 2P` 400; `display=swap`. Fallback `system-ui,-apple-system,sans-serif` (I:19). Wordmark fallback `ui-monospace,monospace` (I:72) / `monospace` (L:51).
- Press Start 2P usage (only): `.brand .wm` 11px/1 white (I:72, L:51), boot percentage `.boot p` 11px/1 `--mute` (L:43). Nowhere else.
- Numerals: `.num{font-variant-numeric:tabular-nums}` (I:28, L:31) applied to all amounts via class; there is no mono family (D0:47 wanted mono).
- Base: app `body` `400 14px/1.45` (I:23), `-webkit-font-smoothing:antialiased`; landing `body` `400 16px/1.5` (L:25), `html` has `color-scheme:dark` (L:24).
- App scale:

| Role | Size / weight / spacing | Cite |
|---|---|---|
| Page title `.crumb h1` | 22 / 600 / -.02em | I:97 |
| Crumb sub `.crumb span` | 13 / (400) faint | I:98 |
| Card heading `.ch h2` | 16 / 600 / -.01em | I:103 |
| Stat heading `.stat .ch h2` | 14 | I:110 |
| Stat value `.stat .v` | 28 / 500 / -.03em / lh 1 (24 at <=640) | I:111, I:242 |
| Stat unit `small` | 14 / 500 mute | I:112 |
| Loan big number | 36 / 500 / -.03em | I:130 |
| Draw/LP big amount `.bigamt` | 40 / 500 / -.03em | I:198 |
| Phone amount `.ph-amt` | 38 / 500 / -.03em | I:220 |
| Modal title `.modal-h h2` | 19 / 600 | I:192 |
| Buttons `.btn` | 13.5 / 600 | I:34 |
| Nav items | 13.5 / 500 (current 600) | I:74,77 |
| Pill | 12.5 / 500 | I:48 |
| Chip | 11.5 / 600 | I:55 |
| Table text / th | 13 / 12 (500, faint) | I:172-173 |
| Hint / chart caption / debt label | 12.5 / 12 / 12.5, faint | I:200,157,136 |
| Event title / sub / right | 13.5 600 / 12 / 12 (b 13 600) | I:165-168 |
| Field label | 12.5 / 500 mute | I:195 |
| Field input | 14 | I:196 |
| Toast | 13.5 / 600 | I:209 |
| Brand wordmark | 11 Press Start 2P | I:72 |

- Landing scale: hero h1 `.phero h1` `900 3.5rem/1` (2.375rem at <=45rem) (L:275,288); hero p 1.125rem/1.5 `rgba(255,255,255,.88)` + text-shadow (L:276); section `.h2` `700 clamp(28px,4vw,48px)/1.05`, -.03em, `text-wrap:balance` (L:122); `.kicker` 12.5 / 700 / .1em uppercase accent (L:121); `.sub` 17 mute (L:123); `.lead` `clamp(17px,1.6vw,20px)/1.5` (L:76); card big `.lc-big` 44/500 (L:96); `.bigstat` 72/500/-.04em (L:203); `.fill` `900 clamp(40px,8.4vw,120px)/.98`, -.04em (L:241); `.mod h3` 26/600 (L:171); `.bt h3` 19/600 (L:196); `.proof b` 22/600 (L:82); `.cr>div` 15 (L:219); table-head `.cr.hd` 12.5/700/.08em uppercase (L:223); marquee 14/600/.02em (L:116); dead rule `.hero h1` `900 clamp(40px,6.2vw,80px)/.98` (L:74).
- Weights actually used: 400, 500, 600, 700, 800 (coin text, L:153), 900 (hero/fill). Note 800 is not in the requested font URL (browser synthesises/rounds; load 800 or change to 900/700).

### 3. Spacing, radii, shadows, borders

Spacing (no scale; literal px). Recurring values: shell gap 16, padding `12px 16px 48px` (I:64); card `.panel` padding 20 (I:106); `.stat` padding `18px 20px 20px` (I:109); `.ch` margin-bottom 16, gap 10 (I:102); grids gap 16 (I:108,116), 8 for lists (I:122,160,204); modal padding 22/24, body gap 14 (I:188-194); table cell `12px 20px`, th `10px 20px` (I:173-174); `.tablewrap` margin `0 -20px -20px` to bleed to card edge (I:171). Landing: `.pad` 104px block (72 at <=640) (L:124,262); `.wrap` max-width 1240 + `--gut` (L:32); `.bento` gap 16, `.bt` padding 24 (L:191-192); `.hero` padding-top 132 (dead); `.live` padding-top 96 (L:287); sticky offset `padding-top:70px` (L:130,163); `scroll-padding-top:96px` (L:24).

Radii (px): 999 pills/buttons/nav/chip/toast/seg; 50% round/avatar; 24 card (`--r`); 26 modal (I:186); 38 phone, 26 phone-in (I:216-217); 20 menu (I:83), 12 menu item; 18 splitviz/banner/(L) `.pay`; 16 `.ev`,`.review`,`.pick`; 14 `.rule`,input,linkbox; 12 `.badge`, sv-bar; 10 small badge; 7 / 3 / 2 for bars (debt 7, meter 3, steps 2). Landing: 28 `.lcard`,`.bt`,`.dia`,`.cmp`; 30 `.mod`; 20 `.art`,`.fs`; 22 `details`; 16 `.ds`; 11 switch (L:86,142,168,170,192,216,229).

Shadows / elevation:
- Floating nav: `0 18px 44px -14px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.05)` (I:68, L:47).
- Menu `0 24px 50px -12px rgba(0,0,0,.6)` (I:83); modal `0 30px 80px rgba(0,0,0,.55)` (I:186); phone `0 30px 60px -20px rgba(0,0,0,.6)` (I:216); toast `0 12px 32px rgba(0,0,0,.4)` (I:209).
- Active nav item `0 0 0 1px var(--line-2), 0 6px 16px -8px rgba(0,0,0,.6)` (I:77); segmented pressed `0 0 0 1px var(--line-2)` (I:121).
- Badge inset highlight `inset 0 1px 0 rgba(255,255,255,.1)` (I:52); gradient button highlight see Findings 1.
- Landing: `.lcard` `0 40px 90px -30px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.07)` (L:86); `.pop` `0 20px 40px -16px rgba(0,0,0,.7)` (L:108); white button hover `0 10px 26px -8px rgba(0,0,0,.5)` (L:61); glass button `0 10px 24px -14px rgba(0,0,0,.45)` (L:282); boot ring glow `drop-shadow(0 0 8px rgba(124,152,255,.7))` (L:40).
- Blur: nav `blur(18px) saturate(1.3)`; scrim `blur(6px)` (I:184); `.pop` `blur(10px)`; `.ds` `blur(8px)`; glass btn `blur(14px)`.

Borders: 1px solid `--line` default on `.card`, `.ev`, `.rule`-less; `--line-2` on interactive/overlay surfaces; selected pick `rgba(124,152,255,.5)` (I:206); dashed `1px dashed --line-2` for intro module (L:174); table rows `1px solid --line`, last row none (I:173-175).

### 4. Layout, grid, containers, breakpoints

App containers: `.shell` flex column gap 16, `max-width:1280px; margin:0 auto; padding:12px 16px 48px` (I:64). `.fnav` is `position:sticky; top:12px; z-index:40` with `pointer-events:none` wrapper and `.fnav-in` `pointer-events:auto; width:100%` (I:67-68). Grids: `.stats` 4 columns `minmax(0,1fr)` gap 16 (I:108); `.grid2` `minmax(0,1.3fr) minmax(0,1fr)` `align-items:start` (I:116); `.rules` 2 columns gap 8 (I:122); `.payview` `minmax(0,1fr) 340px` (I:215); `.phone` 310px wide (I:216).

Landing containers: `.wrap` max 1240 (L:32); `.hero-grid` `1.05fr .95fr` gap 56 (L:70) (reused by the "live" section, L:318); `.flow-grid` `.8fr 1.2fr` gap 44 (L:131); `.bento` 12-col with `.s7/.s5/.s4` spans (L:191,198); `.cr` 3 columns `1.1fr 1fr 1fr` (L:217); `.lims` 2 columns gap 14 (L:228); `.phero` `width:100%; min-height:35rem; aspect-ratio:1470/756` (L:266). Scroll runways: `.flow` height 440svh (520svh <=1000), `.hz` 340svh, `.fin` 240svh, each with `.stick{position:sticky;top:0;height:100svh}` (L:129-130,162-163,238-239,252).

Breakpoints (complete list, max-width, desktop-first):

| File | Breakpoint | Changes | Cite |
|---|---|---|---|
| I | 1240px | `.stats` -> 2 columns | I:228 |
| I | 1000px | `.grid2`, `.payview` -> 1 column | I:229 |
| I | 860px | hide `.brand .wm`, `.netchip span`, `.acct-chip small`; tighter brand; nav button padding 12 | I:230-235 |
| I | 640px | shell padding 10/10/40; hide nav labels (`.lbl`), `.acct-chip .addr`, `.netchip`; stats gap 10, padding 14, value 24, `.d` 12; `.rules` 1 col; `.phone` 100% | I:236-245 |
| L | 1000px | hero-grid/flow-grid 1 col; `.flow` 520svh; step text hidden, steps become horizontal scroller; `.pop` hidden; bento spans 12; `.lims` 1 col; `.links` hidden | L:250-258 |
| L | 640px | compare rows 2 cols with `.k` spanning; `.dstat` static; `.pad` 72px | L:259-263 |
| L | 45rem (720px) | `.phero` `aspect-ratio:auto; height:78vh; min-height:32.5rem`; copy margin-top 6rem; h1 2.375rem | L:288 |
| both | `prefers-reduced-motion: reduce` | see section 9 | I:246, L:289-290 |

Note the prototype is desktop-first with `max-width` queries only. Viewport meta identical in both: `width=device-width, initial-scale=1` (I:5, L:5).

### 5. Shared chrome

- Floating pill top nav (no sidebar): brand mark (32px gradient circle, vault SVG) + wordmark; centred nav of 4 buttons (Dashboard, Loans, Pay links, LP Vault) + "More" menu (Activity, Demo control); then network chip "Mock · testnet" with `title="Mock data. Contracts connect later."` (I:254); then account chip (conic avatar, `biz-agent.testnet`, `small#acct-bal` = "{avail} USDC credit") (I:251-256, I:372). The brand links to `landing.html` (I:252).
- Below nav: `.top > .crumb` with `h1` + sub from `TITLES` (I:258, I:363, I:373-374), then `<main id="main">`.
- Overlays: `#toast` (`role="status" aria-live="polite"`, I:262) and `#modal` host (I:263).
- Nav "Loans" shows a 7px amber dot (`.dotn`) when a loan is active (I:79, I:367).
- Landing chrome: `.boot` full-screen loader (L:295-298), fixed pill `.nav` with section links Demo/Flow/Modules/Features/Compare/Limits (hidden <=1000px) and a gradient "Enter App" button to `index.html#/business` (L:300-304), scrollspy `.links a.on` (L:546-547), footer with 3 links (L:420). Footer text "© RevVault 2026 · Built for the NEAR Hackathon" (L:420).
- Landing -> app deep links: `index.html#/business` (L:303,312,321), `index.html#/demo` (L:416), `index.html#/lp` (L:416). App -> landing: `landing.html` (I:252).

### 6. Components (markup/class vocabulary)

All app class names from `<style>` (I:12-246). "Variant" lists are exhaustive.

**Buttons** (I:34-51, L:56-62, L:282-286)
- `.btn` base: inline-flex, h 38 (landing 40), padding `0 16px` (landing `0 18px`), radius 999, 13.5/600, 15px icon, `transition: background .15s, opacity .15s`.
- Variants app: `.primary` (accent bg, ink text, hover `#9DB2FF`), `.secondary` (card-2 + line-2 border, hover `--hover`), `.danger` (coral text, tinted bg/border), `.ghost` (mute text, hover text+card-2). Extra app-only: `.act-main` (h42, gradient, inner highlight; hero action "Draw credit"), `.act-ghost` (h42 translucent white 5%), disabled `.btn[disabled]` opacity .45 + `cursor:not-allowed` (I:42).
- Variants landing: `.lg` (h50, `0 26px`, 15px), `.grad` (gradient, same as `.act-main`), `.white` (white bg, hover lifts 2px + shadow), `.ghost` (white 5% + line-2 border, redefined differently from app ghost), `.glass` (hero CTA: white 12% bg, blur 14, spec highlight child `.spec` masked ring following pointer via `--sx/--sy`, `:active` scale .97, `.in` inner span) (L:282-286, markup L:312).
- `.pill` h32 chip-like button (Copy) (I:48); `.round` 40px icon button (defined, unused in markup); `.see-all` small pill link in card heads (I:104); `.seg` segmented control with `aria-pressed` buttons (I:118-121; defined, no markup uses it).

**Chips / badges**
- `.chip` h24 radius 999 11.5/600 with optional `.dot` (6px currentColor). Variants `.ok .bad .warn .blue .op` (I:55-61); landing `.ok .warn` only (L:92-93). Status never colour-only: always a text label ("Self-repaying", "Past due", "Open", "Closed", "On track") (I:397, I:437, I:479).
- `.badge` icon tile 36x36 radius 12, gradient tint from `--t`, `data-tone` = `op|warn|ok` (+`vi` landing) (I:52-54, L:88-90). Sizes overridden: `.ev .badge` 32/10px radius (I:164); `.pop .badge` 28/9 (L:110); a pill-shaped variant is built with inline style (L:372-374).
- `.netchip` (I:88-89) and `.acct-chip` (I:90-93) (avatar `.wav` 28px conic).
- `.tagchip` (live pulsing dot) CSS exists but no markup uses it (L:71-73).

**Cards / panels**
- `.card` (card bg, 1px line, radius `--r`=24) (I:65); `.panel` padding 20; `.glow` modifier (blue radial corner glow + blue border, used on "Available credit" and "TVL" stat) (I:66).
- `.stat` card: head `.ch` (badge, h2, optional `.see-all` button `data-view`), value `.v.num` with `<small>` unit, `.d` sub line, optional `.meter` (I:109-115, builder I:384).
- Card head `.ch`: `display:flex; gap:10; margin-bottom:16`; `h2{margin-right:auto}`; `.panel .ch` wraps (I:102-107).
- `.rules` grid of `.rule` (k label + b value) used for constraints, terms, risk (I:122-125).
- `.mandate` explanatory paragraph (I:126). `.banner` (+`.info`) alert strip (I:211-212). `.empty` empty state with bold lead (I:149-150).
- Landing cards: `.lcard` (hero demo card), `.bt` bento tile (pointer-follow spotlight via `--mx/--my`, L:192-194), `.mod` module card (`.intro` dashed variant, `.act` highlighted variant, `.art` illustration well, `.meta` chip row; L:168-176), `.cmp/.cr` comparison table (L:216-225), `details/summary` accordion with rotating `.pls` (L:229-235), `.dia` diagram card, `.ds` floating stat (L:157-159).

**Nav / menu**
- `.nav` (app) = centred flex group of `button[data-nav]`, current = `aria-current="page"` (white text, card-2 bg, ring, accent icon) (I:73-79). `.more-wrap` + `.menu[role=menu]` + `button[role=menuitem]` with `small` descriptions; `button[aria-expanded]` rotates `.chev` 180deg (I:80-87, I:368-369). Menu pops with `animation: pop .15s cubic-bezier(.2,.8,.2,1)`.
- Landing nav `.nav > .nav-in > .brand + .links a (.on) + .btn.grad` (L:46-55).

**Forms** (I:195-200)
- `.field` wrapper: `label` (12.5/500 mute, mb 6); inputs `text|number|select` full width, padding `11px 14px`, radius 14, `--page` bg, line-2 border, 14px; `input[type=range]` full width with `accent-color:var(--accent)`. No custom focus style beyond global `:focus-visible` (2px accent outline, offset 2) (I:31, L:30). No validation or error visuals exist (only toast text).
- `.linkbox` read-only link display with ellipsis + Copy pill (I:224-225). `.hint` helper text. `.picks/.pick` selectable list with `aria-pressed` (selected: accent-soft bg, accent 50% border) (I:204-208).
- Landing sliders `.slid` (range + `.r` readouts) (L:200-202); toggle switch `.tg/.sw` (L:209-213, decorative; turns on once when scrolled into view).

**Modal (draw flow)** (I:184-194, I:531-554)
- `.scrim` fixed full-screen, z 50, blur 6, `display:grid; place-items:center`, animation `fade .15s`; `.modal` `width:min(520px,100%)`, `max-height:calc(100vh - 40px)`, `overflow:auto`, radius 26, `role="dialog" aria-modal="true" aria-label="Draw credit"`, animation `pop .2s`. Sections `.modal-h` (steps bar `.steps i.on` + title + "Step n of 3"), `.modal-b`, `.modal-f` (Back/Cancel ghost + primary Continue/Confirm draw). It is a centred modal at every width, not a drawer (D1:111 says drawer). Closes on scrim click, Cancel, Escape (I:550,555). No focus trap, no focus restore.

**Tables** (I:170-181): `.tablewrap` horizontal scroll bleed; `table` full width 13px; th faint 12px; td `12px 20px`; classes `.t` (faint nowrap date col), `.amt` (right aligned nowrap), `.who` (avatar + name), `.av` (24px initial avatar, `--c` tint), `.mini-meter` (110x5 progress). Tables used: Loan history (8 cols) (I:436), LP loan book (5 cols) (I:479).

**Gauges and bars** (all pure CSS widths, no SVG gauges)
- `.meter` 6px flex track gap 2, children `i` with `transition: width .9s cubic-bezier(.2,.8,.2,1)`; the credit gauge = two segments: used (`--repay`) + `flex:1` remainder (`--up`) (I:114-115, I:413); utilisation = single accent segment (I:473).
- `.debt` 14px track: `.paid` (`--ok`) width % with `transition: width 1.1s cubic-bezier(.2,.8,.2,1)`; `.flash` (`--repay`) defined, unused (I:132-135). Legend `.debt-l`.
- `.sv-bar` split bar 34px: `.a` repay (amber), `.b` business (green), `.start` (accent, unused) (I:141-145); legend `.sv-leg` with coloured ● glyphs.
- `.mini-meter` (I:180-181). Landing: `.debt` (14px, `#86E3B5`), `.pb` split bar with `.src/.a/.b` (L:98-107), `.dgauge` (L:159), `.hz-prog .bar` (L:166), `.fs .pr` (L:140-141), `.pr` progress.

**Chart** (I:152-157, I:389-392): inline SVG `viewBox 0 0 600 150`, `preserveAspectRatio="none"`, `role="img"`, one `<rect>` per day (30), fill accent opacity .55 -> 1 on hover, native `<title>` tooltip "{n} USDC". `.chart .lim` dashed green limit line is defined (stroke-dasharray 4 4) but never rendered. Caption row shows formula `limit = min(t x 40%, cap 2,000) = x` (I:421). No axes, no real tooltip, no area/line chart (D0:49 differs).

**Events / feed** (I:159-168, I:385-386): `.evs` column; `.ev` grid `auto 1fr auto`: tone badge + title/sub (with optional `tx` text, not a link) + right block (amount `b.num` over timestamp). Icon/tone map: payment_routed `down/ok`, repay_applied `split/warn`, draw_opened `up/default`, vendor_paid `bot/op`, loan_closed `check/ok`, business_delinquent `warn/warn`, lp_deposit `down/ok`, lp_withdraw `up/default` (I:385). Newest event flashes with `.fresh`.

**Toast** (I:209-210, I:383): fixed top centre pill, accent bg, `top:max(24px, env(safe-area-inset-top))`, transitions opacity/transform .2s; auto-hides after 2600 ms; `role="status" aria-live="polite"`.

**Phone / Pay link customer view** (I:214-225, I:445-460): 310px bezel frame `.phone > .phone-in`: business row (avatar, name, "Verified agent business"), amount `.ph-amt`, reference hint, `Pay with NEAR wallet` primary button (h46 inline), success block `.ph-ok` (badge + "Payment sent" + "Receipt tx 0x…routed"), "How it works" disclosure `.ph-how` (always visible text, D1:117 asked for a disclosure).

**Loan "split visualiser"** (`.splitviz`, I:138-148, I:403-408): hidden until a payment arrives; `.on` pops in; two bars grow with `animation: grow .9s .35s cubic-bezier(.2,.8,.2,1) forwards` to `--w`. This is the signature animation (D0:39).

**Icons**: 21 hand-drawn 20x20 stroke paths in a JS dictionary `I` (home, loan, link, pulse, vault, sliders, coin, trend, shield, down, up, split, clock, bot, play, plus, copy, warn, check, left, refresh) rendered by `ic(name, strokeWidth=1.6)` with `fill:none; stroke:currentColor; round caps/joins; aria-hidden` (I:272-296). Landing repeats the same paths inline (L:297,301,327,335-336,382-389,408-411). Brand mark = vault glyph (rect 14x12 r3 + circle r2.6 + two ticks) (I:252, L:297).

**Landing-specific blocks**: boot ring loader (L:35-43,295-298), marquee (L:114-117,316), hero demo card with 3D tilt + two floating pops (L:84-111,324-338), rotating-word swap (L:77-79,320), "proof" stat row (L:81-82,322), scroll-scrubbed money flow diagram SVG 640x400 with 5 nodes, 4 paths, 4 coins (L:128-159,342-365), horizontal module track (L:161-188,368-376), bento (L:190-213,379-390), comparison wipe (L:215-225,393-402), honest-limits accordion (L:227-235,405-412), scroll-filled closing line (L:237-244,415-417), pixel hero (L:265-289,307-314).

### 7. State vocabulary

| State | Prototype treatment | Cite |
|---|---|---|
| hover | bg lighten (`--hover`, white 5-9%), text to `--text`; chart bar opacity 1; primary `#9DB2FF`; bento spotlight; glass specular; white btn lift | I:37,39,49,51,76,154; L:54,61,194,283-285 |
| focus | global `:focus-visible` 2px accent outline offset 2; no per-component focus style, no `outline:none` anywhere | I:31, L:30 |
| active/pressed | `aria-pressed` for pick, seg; `aria-current="page"` for nav; glass `:active` scale .97 | I:121,206,77; L:283 |
| disabled | `.btn[disabled]` opacity .45, not-allowed; set on Draw buttons when `avail() < 10` | I:42,395,427,435 |
| loading | none (no skeletons or spinners); landing boot ring only | L:35-43 |
| empty | `.empty` blocks: "No active loan" (I:395), "No loans yet" (I:438); no-history starter limit banner absent | I:149,395,438 |
| error | none visual; validation errors are toasts ("Check the amount and your balance", "Max withdrawable n USDC", "No credit available right now") | I:517-518,532 |
| delinquent | red `.banner` "past due" (I:411), chip.bad "Past due" (I:397,437,479), limit 0 (`avail()` returns 0 when not active, I:321); no 0-limit banner variant for "no history" | I:321,411 |
| success | toast, `.ph-ok`, "Loan closed" event | I:209,457 |
| info | `.banner.info` (accent) e.g. "Revenue paid directly to your wallet is not collateral" | I:212,451 |
| fresh/new | `.ev.fresh` 1.8s background flash; `.splitviz.on` | I:162-163,139 |

### 8. Motion inventory

Keyframes (complete):

| Name | File:line | Definition | Duration / easing / usage |
|---|---|---|---|
| `grow` | I:146 | `to{width:var(--w)}` | `.sv-bar .a/.b`: `.9s` delay `.35s` `cubic-bezier(.2,.8,.2,1)` `forwards` (I:143-144) |
| `fresh` | I:163 | `from{background:var(--accent-soft)} to{background:var(--card-2)}` | `.ev.fresh`: `1.8s ease` |
| `fade` | I:185 | `from{opacity:0}` | `.scrim`: `.15s ease` |
| `pop` | I:187 | `from{transform:translateY(10px) scale(.98);opacity:0}` | `.menu .15s`, `.modal .2s`, `.splitviz.on .25s` (all `cubic-bezier(.2,.8,.2,1)`), `.ph-ok.on .3s` (default easing) |
| `drift` | L:69 | `to{transform:translate3d(-6%,8%,0) scale(1.1)}` | `.aurora` 14s `ease-in-out infinite alternate` (b: 18s); element unused in markup (dead) |
| `live` | L:73 | box-shadow ping 0 -> 8px, rgba(84,214,160,.55) -> 0 | `.tagchip i` `2s infinite`; element unused (dead) |
| `flow` | L:208 | `to{background-position:-200% 0}` | `.chain .arr` `1.4s linear infinite` (Vault -> Intents -> Vendor arrows) |

CSS transitions (non-keyframe): `.btn` `.15s` background/opacity (I:34); `.meter i` width `.9s cubic-bezier(.2,.8,.2,1)` (I:115); `.debt i` width `1.1s` same curve (I:133); `.toast` `.2s` opacity/transform (I:209); chart rect opacity `.15s`; chev rotate `.15s`; landing reveals `.rv` `opacity .7s ease, transform .7s var(--glide)` from translateY(22px) (L:125-126); `.cr.wipe` `clip-path .9s var(--glide)` with stagger `(i % 6) * 90ms` (L:225,463); `.fs` `opacity .4s, background .4s, border-color .4s`, `p` max-height `.5s var(--glide)` (L:133,138); `.mod` border/bg `.3s`; `.bars i` scaleY `.8s var(--glide)` stagger `calc(var(--i)*25ms)` (L:178); `.splitart i` width `.9s`; `.poolart .tank i` height `1s`; `.sw` `.3s`; `.pb` src `.5s`, split `.9s var(--glide)`; `.pop` `opacity .4s, transform .5s var(--glide)` (L:108); `.lcard` tilt `.25s ease-out` (L:85); swap text `transform .6s var(--glide)` (L:78); boot opacity/visibility `.5s` (L:35); hero img opacity `.6s` (L:268); `.fin .cta` `.5s/.6s`.

Easing palette: `cubic-bezier(.2,.8,.2,1)` (named `--glide` in landing, hardcoded in app) is the house curve; `cubic-bezier(0.215,0.61,0.355,1)` for fold title (L:527); JS `ease(t)` = easeInOutQuad (L:426); boot uses `1 - (1-k)^2.2` (L:432).

JS-driven animation (landing, L:422-550):
- Boot ring fill: rAF over T = 1700 ms (200 ms reduced), strokeDashoffset 327 -> 0 (circumference of r=52 is 326.7), percentage text; safety `setTimeout(fin, T + 400)`; on finish adds `.done`, dispatches `rv:ready`, removes node after 600 ms (L:430-433).
- Rotating word: `setInterval` 2200 ms, translateY by `-i * rowHeight`, list has duplicated first item, reset after 650 ms with transition suppressed over two rAFs (L:436-437).
- Hero card tilt: pointermove on `#stack`, `rotateY(x*10deg) rotateX(-y*8deg)`, reset on leave; off when reduced (L:440-442).
- Hero self-repay loop: async infinite loop, constants TOTAL 515, SPLIT .25, PAYS [300,420,600,800]; waits 2100 initial, 1100 to split, 700 to debt update, 1900 between payments, 3200 on close, 600 reset; `wait()` clamps to 250 ms in reduced mode (L:445-457). Mirrors the app's split animation.
- Reveals: one `IntersectionObserver` threshold .2 adds `.in` to `.rv, .cr.wipe` and sets `data-count` text; second observer threshold .5 turns on `#tg` toggles (L:460-464).
- Bento: range sliders compute `min(v*0.4, 2000)` and `ceil(515 / (110*s/100))` (L:468-470); pointer spotlight CSS vars (L:471); 24 generated bars (L:472).
- Scroll choreography (single `frame()` on rAF, passive scroll + resize listeners, L:544-549): `heroFrame` parallax (bg `translate3d(0, y*.38px,0) scale(1.06)`, copy `y*-.22`, copy opacity `1 - y/(vh*.55)`; skipped after `heroEl.offsetHeight + 80`) (L:540-541); `flowFrame` maps progress p to 4 steps (`st=floor(p*4)`), draws SVG paths via `getTotalLength()` dashoffset and moves coins with `getPointAtLength()`, animates counters (limit 0 -> 960 -> 1180, owed 0 -> 515 -> 485, gauge width `lim/1500`) (L:475-497); `hzFrame` converts progress to horizontal `translate3d(-max*ease(p))`, sets active module and "0n / 03" label (L:500-506); `finFrame` sets `--p` for gradient text fill `(p*108-4)%` and `.done` at p>.96 (L:509-510).
- Marquee: perpetual rAF loop, `mx -= .5 + |vel|*.6`, velocity from `scrollY` delta lerped .12, wraps at half width; never paused (L:513-514). Not disabled for reduced motion (only CSS-animation rules are), flag.
- Fold title: per-word/per-glyph WAAPI: `rotateX(-92deg) opacity 0 -> rotateX(0) opacity 1`, duration 650 ms, stagger `i*45ms`, easing as above, plus `::after` shade fade `.55 -> 0` via `pseudoElement`; on finish restores plain text; before ready `[data-fold]:not([data-ready])` is `visibility:hidden`; triggered by `rv:ready`, fallback 3200 ms (L:277-281, L:518-534). Line breaks detected by measuring word tops before splitting.
- Glass CTA: pointermove sets `--sx/--sy` for specular ring (L:536-538).
- Scrollspy: tracks `getBoundingClientRect().top < vh*.45` (L:546-547).
- App JS-driven motion: `meter`/`debt` width transitions triggered by re-render (note: because `innerHTML` re-renders the whole view, width transitions do not animate from the previous value; only newly inserted `.fresh` and `.splitviz` CSS animations play; the "debt bar shrinks" effect in the app is effectively a repaint, flagged for the port) (I:377-382). Toast timer 2600 ms (I:383).

Reduced motion: app `*{animation:none!important;transition:none!important}` and `.sv-bar .a,.b{width:var(--w)}` so bars still show final width (I:246); landing same blanket rule plus `.rv` visible, wipes unclipped, scroll-runway sections collapse to static (`height:auto`, `position:static`), track wraps, `.fill` solid white, CTAs visible, `[data-fold]` visible, JS `reduced` shortens boot/waits and skips tilt/parallax/fold (L:289-290,425,430,440,540,534,510). Gap: marquee JS loop and `scroll-behavior:smooth` (L:24) ignore reduced motion; the `hz` track `translate3d` is overwritten by JS each frame even when reduced (static layout rule sets `.track{flex-wrap:wrap}` but JS still sets transform).

### 9. Page/section structure

App views (`view` state, hash `#/<view>`; valid keys from `TITLES`, I:363, I:557):

| View key | Title / sub | Content (cite) |
|---|---|---|
| `business` | Dashboard / biz-agent.testnet | optional delinquent banner; 4 stat cards (Available credit [glow + used/available meter], Owed, Routed revenue 30d, Repay split); grid2: left col = Active loan card (or empty), Revenue chart card with formula caption; right col = Agent constraints card (mandate text, 4 rules, Draw credit + Pay link buttons), Agent activity card (5 latest events, "See all") (I:409-430) |
| `loans` | Loans / Every draw, on the record | Loan history table + "New draw" button; Terms card (fee 3% flat, term 30 days, advance rate 40% of trailing 30d, per-business cap 2,000) (I:433-442) |
| `pay` | Pay links / Revenue routed here becomes credit | Left: link box (`revvault.app/pay/biz-agent.testnet?amt=…`), amount input, reference input, info banner; right: phone mock (customer view) with "Pay with NEAR wallet" -> triggers `simulate(amount, ref, true)` (I:445-460) |
| `activity` | Activity / Every cent, on the record | full event list (up to 40) (I:463-465) |
| `lp` | LP Vault / Fund agent businesses, earn from fees | 4 stats (TVL [glow], Utilisation, Illustrative APY, Reserve first-loss); grid2: Loan book table + Risk panel (advance rate, largest borrower %, past-due count, reserve cover, default paragraph); right: "Your position" card (supplied, withdrawable now, amount input, Deposit/Withdraw) (I:468-490) |
| `demo` | Demo control / Presenter tools · mock mode | Simulate card (Customer pays 120/250/400), Time card (+7 days, +31 days to go past due, Day chip), Reset seed (I:493-501) |
| draw flow | modal over any view | 3 steps: How much? (slider, hint), Pay which vendor? (3 picks), Review and confirm (principal, fee 3%, total, split, est. days, over-term warning) (I:531-554) |

Landing section order (L:295-420): boot -> nav -> pixel hero `#product` (h1 "Credit that repays itself", p "A credit line your AI business can’t overspend.", glass CTA "Open the demo") -> marquee -> `#live` "A loan that clears while you sell." (copy + CTAs + proof row 40% / 25% / 3% / 0; hero demo card) -> `#flow` scrubbed 4-step diagram -> `#modules` horizontal track (intro + Underwriter, Router, Vault) -> `#features` bento (limit slider, split slider, collateral locked 0, vendor-direct payout chain, humans set rules toggles) -> `#compare` wipe table (5 rows) -> `#limits` 4 accordions (Only routed revenue counts; Repayment is economic, not legal; APY is illustrative; The demo uses mock data) -> `#fin` closing fill line + CTAs ("Run the 90-second demo" -> `index.html#/demo`, "See the LP vault" -> `index.html#/lp`) -> footer.

Seed/mock numbers embedded in the prototype: params `advanceRate .40, cap 2000, feeBps 300, termDays 30, windowDays 30, reserveBps 1000` (I:299); `split .25` (I:308); revenue `round(40 + 80*i/29 + (i%3-1)*6)` for i 0..29 (I:307); wallet 1240; vault cash 21,500; others: shop-bot.testnet 1200 @72% due 9, seo-agent.testnet 800 @35% due 18, dataco.testnet 1500 @10% due -3 delinquent; fees 96; reserve 11 (I:309-312); first event `inv_2041 118.00` (I:314); `seq 2042` (I:315); vendors GPU-Provider/LLM-API/Data-Feed (I:300-304); draw max 500 hardcoded (I:426,533,534); APY formula `fee/term*365*util*(1-reserve)` (I:326); delinquent when `day > due` (I:356); `avail()` min draw 10 (I:395,532).

### 10. State model and math (app JS) — port as pure functions

- `P` params (I:299). Derived: `trailing()` = sum of last 30 days; `limit()` = `min(trailing*advanceRate, cap)`; `debtLeft()` = principal + fee - repaid; `avail()` = 0 unless active else `max(0, limit - debtLeft)`; `othersOut`, `myOut` (principal x remaining fraction), `tvl`, `util`, `apy`, `avg7` (I:318-327).
- Mutations: `routePayment(amount, ref)` adds to today's revenue, repay = `min(amount*split, debtLeft)`, moves repay to vault cash, fee share to fees and reserve (`feePart*reserveBps/1e4`), credits wallet with rest, logs `payment_routed` + `repay_applied`, closes the loan when `debtLeft < .005` (logs `loan_closed`, restores status) (I:331-346). `requestDraw` (fee = amount*3%, loan id `ln_NNN`, logs `draw_opened`+`vendor_paid` with random fake tx hash `0x…`) (I:347-353). `fastForward(days)` pushes zero-revenue days, flips to `delinquent` after due (I:354-357).
- Event type vocabulary equals `Event.type` in D2:172 (payment_routed, repay_applied, draw_opened, vendor_paid, loan_closed, business_delinquent, lp_deposit, lp_withdraw). Amount precision in prototype is JS float number units; D2:163 mandates u128 strings with 6 decimals, so the port must not copy float math.
- No LP shares/earned/value (D2:180 `getLp` returns shares/value/earned); prototype tracks only `myLp.deposit`.
- Status values prototype: `active|delinquent` plus `paused` referenced (I:334) but never set; D2:166 has `paused`.

### 11. App JS behaviours (index.html)

| Behaviour | Detail | Cite |
|---|---|---|
| Router | `view` variable + `location.hash = '#/'+v`; `hashchange` and initial `fromHash()` read `#/<key>`, unknown keys ignored (default business); `go()` scrolls to top | I:376,557-559 |
| Render | `render()` rebuilds nav + crumb + `#main.innerHTML = view()` then `bind()` re-attaches handlers by data-attributes: `data-nav`, `data-view`, `data-draw`, `data-sim`, `data-ff`, ids `#reset #amt-in #ref-in #copy #pay-btn #lp-dep #lp-wd #lp-amt` | I:365-382,504-520 |
| More menu | `moreOpen` flag; click toggles, outside click and Escape close; `aria-expanded` | I:371,555-556 |
| Toast | single node, 2600 ms | I:383 |
| Simulate payment | `simulate(amount, ref, stay)` -> `routePayment`, sets `fresh` for split viz, toast "{repay} repaid · {toBiz} to you", then jumps to business view unless `stay` (pay view keeps the phone mock) | I:521-528 |
| Pay view | live preview of amount/ref into link box and phone; Copy only toasts (no clipboard write); Pay button routes a payment, hides itself, shows success; `fresh` is not consumed on that view | I:510-515 |
| LP | Deposit checks `a <= wallet`, Withdraw checks `a <= min(deposit, vault.cash)`; both toast and log events | I:516-519 |
| Demo | `[data-ff]` calls `fastForward` + toast; Reset calls `seed()` | I:508-509 |
| Draw flow | `drawFlow()` closure state `{step, amount, vendor}`, renders modal string each step, slider updates amount text, Back/Cancel/Continue/Confirm, scrim click closes; est. days `ceil(total / max(1, avg7*split))`; warns if `days > termDays` | I:531-554 |
| Account chip | label `{avail} USDC credit` refreshed in `renderSide()` | I:372 |

Accessibility present: `aria-label` on brand link and account chip, `aria-current`, `aria-expanded/haspopup/role=menu(item)`, `role="dialog" aria-modal`, `role="status" aria-live`, svg `aria-hidden`, chart `role="img" aria-label`, landing: `role="status"` on boot, `aria-label` on slider inputs, `aria-hidden` on marquee and shade layers, diagram `role="img"`. Missing: focus trap/return in modal, `aria-pressed` on `.pick` is present but there is no `role=radiogroup`, table has no `<caption>`/`scope`, `.acct-chip` is a button without behaviour, `.menu` has no arrow-key support, colour contrast of `--faint #687286` on `--card #1A1E27` is about 3.1:1 (below AA for body text; estimate, not measured).

### 12. External dependencies (complete)

| Dependency | Where | Notes |
|---|---|---|
| Google Fonts CSS2: `Mona+Sans:wght@400;500;600;700;900` + `Press+Start+2P`, `display=swap`, with `preconnect` to fonts.googleapis.com and fonts.gstatic.com | I:7-9, L:7-9 | Port with `next/font/google` (`Mona_Sans`, `Press_Start_2P`); 800 is used by coin text (L:153) but not requested |
| `assets/pixel-fantasy-bg.webp` (1470x756, WebP+alpha, 420,000 B approx.) | L:308; `image-rendering:pixelated; object-fit:cover; object-position:bottom` (L:268) | Hero background; loaded via `<img>` with `.loaded` fade; copy to `app/public/`; class `pixelated` on the `<img>` is unused (the CSS targets `img` descendants) |
| No JS libraries, no CDN scripts, no icon font, no analytics | whole files | Everything inline; SVG icons are inline path data |
| Cross-file links | I:252; L:303,312,321,416,420 | relative `index.html#/...` and `landing.html` links; replace with Next routes |

### 13. Suitability for port: problems and hardcoded data

Do not port as-is:
1. Rendering by `innerHTML` strings with `esc()` only for events (I:271,386); all interpolations elsewhere (vendor names, `S.biz`) are unescaped. Rewrite as React components. Inline `onclick`-style handlers are assigned in `bind()` (`b.onclick = …`) after every render (I:370-371,505-518); there are no `onclick=` attributes in markup, but there are 29 inline `style="..."` attributes in index.html and 14 in landing.html (grep count) that must become classes/Tailwind.
2. Global mutable state `S` created by `seed()` inside an IIFE, plus module variables `view`, `fresh`, `moreOpen` (I:305-317,360,364,380-381). Replace with an adapter implementing `RevVaultApi` (D2:175-185) and a store/context; keep persistence optional.
3. Hardcoded data: vendors, seed businesses, account `biz-agent.testnet`, `inv_2041`, wallet balance 1240, draw cap 500, `P` params, pay link host `revvault.app`, "Verified agent business" (an unbacked claim, conflicts with honesty tone), toast and copy strings, event time stamps (`Day n · hh:mm` from the browser clock) (I:299-315,426,448,453).
4. Fake tx hash `'0x'+Math.random()` and `tx` printed as plain text, not NEAR explorer links (I:352,386).
5. Landing copy marquee lists "Meta transactions" as a feature (L:316) and the bento says "Humans set the rules / Draw + receive only" toggles that do nothing (L:389); PRD honesty constraint 2 says NEP-366 does not redirect revenue (PRD:19), so the marquee wording must be checked by the submission role (do not imply meta-tx redirects revenue). "No collateral locked" and "0 locked collateral" (L:320,322,387) are fine but the "Collateral locked 0" counter should not read as a risk claim.
6. Class collisions if both files are merged into one CSS: `.nav` (flex centred group in I:73 vs fixed bar in L:46), `.btn.ghost` (I:41 vs L:62), `.badge`, `.chip`, `.debt` (14px bar with `.paid` in I vs without in L:98), `.pay` (L:101 vs `.payview/.pay-btn`), `.hint`, `.live`, `.mod`, `.pop` (animation vs element in landing; `.pop` class is a component in L:108 while `@keyframes pop` is separate in I:187: no clash across files but confusing). Use component-scoped styles/CSS modules or Tailwind.
7. Dead or unused CSS: landing `.hero`, `.hero::before`, `.aurora(.b)`, `@keyframes drift`, `.tagchip`, `@keyframes live`, `.hero h1(.grad)` (L:65-75); app `.round`, `.seg`, `.debt .flash`, `.sv-bar.start`, `.chart .lim`, `.field input[type=text]` (used), `.accent-2` token. Do not carry these over.
8. Magic numbers in scroll choreography (step thresholds, coin positions, 960/1180/515/30 constants, `*1.25` in finFrame, `1470` in `calc(132/1470*100vw)` at L:273) that are authored for a 1470px design width; a React port needs the same constants or a scroll library with identical output (D0:66 proposes Motion; GSAP also fits). SVG path geometry (L:352-353) and `getTotalLength` requires client-side layout.
9. `will-change`, `position:sticky` runway heights in `svh` (L:129,162,238) require `svh` support and no `overflow` on ancestors; the landing `body{overflow-x:hidden}` (L:25) can break sticky in some browsers (use `overflow-x:clip`). `scroll-behavior:smooth` is set on `html` (L:24).
10. SSR/hydration hazards for Next.js: everything computes from `window`/`document`/`matchMedia`/`performance.now`/`scrollY` at load; `Math.random` and `new Date().toTimeString()` in render (I:328,352); fold-title splits DOM text after measuring layout (L:521); all of these need `'use client'` and effect-only execution.
11. State updates by full re-render lose CSS transition continuity (see section 8): to make the debt bar shrink in React, keep the component mounted and change the width prop.
12. Landing `<img id="hero-img" class="pixelated">` has `alt=""`, decorative OK; fold title wrapper sets `aria-label` and per-word `aria-hidden` then restores text (L:522-523,530): keep.
13. `title` attribute tooltips on net chip (I:254) and bars (I:391, SVG `<title>`) are not accessible on touch.

### 14. Contradictions with docs/ui/00-design-direction.md (prototype wins, PRD:15)

| Topic | D0 says | Prototype actually | Cite |
|---|---|---|---|
| Positioning | "credit product for businesses, not a DeFi degen dashboard" (D0:4) | Same intent, but uses pixel-art hero and retro wordmark (Press Start 2P) | L:266-268, I:72 |
| Feel / background | `--bg #0B0D0E`, `--surface #121517`, `--surface-2 #181C1F` (D0:21-23) | `#10131A / #1A1E27 / #242934` (blue-tinted charcoal) | I:13 |
| Border | `--border #23292D` solid (D0:22) | white alpha `.06` / `.11` | I:14 |
| Text | `--text #E8ECEE`, `--muted #8A959B` | `#F1F4FA`, `#9AA3B4` plus `--faint #687286` (third level) | I:15 |
| Accent | `#00EC97` NEAR-green, for positive/inflow; amber repay; red delinquency; info blue `#6EA8FF` (D0:21,24) | Accent is periwinkle blue `#7C98FF`; green `#54D6A0` is only "up/inflow"; repay amber `#F2BE5C` (hex differs from D0 `#F5A524`); danger coral `#FF7E61` not red `#FF5C5C`; cyan `#5CD3FF` instead of info `#6EA8FF` | I:16-18 |
| Radii | 8 / 12 / 16 (D0:20,26) | 24 cards, 26 modal, 999 pills, 12-18 interior | I:18,65,186 |
| Surface treatment | "1px hairline borders, subtle elevation... no heavy gradients/glass" (D0:48) | Glass blur nav, gradient CTA/brand mark/badges, radial card glow, aurora (dead), glass hero CTA | I:43,66,68; L:282 |
| Type | Inter/Geist UI + Geist Mono / JetBrains Mono for amounts and account ids (D0:46-47) | Mona Sans + tabular-nums for everything (including ids); Press Start 2P wordmark | I:19,28,72 |
| Type scale | 12 13 14 16 20 28 40(num), weights 400 500 600 (D0:27) | 11-13.5 small, 14, 16, 19, 22, 28, 36, 38, 40; plus landing 44/72/clamp up to 120; weights 400-900 | Findings 2 |
| Spacing scale | 4 8 12 16 24 32 48 (D0:26) | no scale; 5/6/10/11/14/18/20/22/26 appear | Findings 3 |
| Iconography | lucide (D0:50) | custom inline 20x20 stroke icons | I:272-296 |
| Charts | thin lines, area fill, direct labels, `dataviz` skill (D0:49) | 30 flat bars, dashed-limit style defined but unused, caption formula, no axes | I:152-157,389-392 |
| Gauge | `CreditGauge` used vs available vs limit (D2:148) | two-segment `.meter` bar, not a radial gauge | I:114,413 |
| Draw flow | drawer (D1:111, D2:154 `DrawDrawer`) | centred modal at all widths | I:184-194 |
| Tooltip/popover | limit formula popover (D1:106, D2:151 `LimitExplainer`) | static caption under chart and `.formula` on landing | I:421, L:199 |
| Motion lib / budget | Motion or GSAP; split animation <= 1.2 s, skippable (D0:62-63) | Pure CSS and vanilla JS; split bars 0.9 s + 0.35 s delay (1.25 s total); not skippable; no count-up, no skeletons (D0:64) | I:143-144 |
| Default transitions | 150-200 ms ease-out (D0:64) | `.15s` UI transitions match; `.9s-1.1s` bar widths | I:34,115,133 |
| Theme | dark-first, light "if time allows" (D0:46) | dark only; `color-scheme:dark` set on landing; cut order lists light theme as cut (PRD:29) | L:24 |
| Stack | Tailwind, shadcn/ui, Recharts/visx (D0:67) | Neither; plain CSS | whole files |
| Navigation | routes `/app/business`, `/app/lp` etc. (D1:75-83) | hash views in one page, plus top-pill nav (no sidebar); `Loans`, `Activity` top-level items not in D1 | I:361-363 |
| Repay split | 20% in demo story (PRD:25, D1:87-88: "repay 515, split 20%", "20% repay, 80% to business") | 25% everywhere (seed `.25` I:308; landing 25%/75% L:322,330,348,373); fee 3% and 500 -> 515 consistent | I:308 |
| Hero copy | "Credit that repays itself from your revenue." (D1:96) | h1 "Credit that repays itself" + p "A credit line your AI business can’t overspend." | L:311 |
| Landing structure | hero, 4-step loop diagram, track badges, testnet disclaimer, "keep short" (D1:96-99) | 11 sections incl. 440svh flow, horizontal track, bento, comparison, limits; no track badges (Autonomous Business / Real-World Money) | L:295-420 |
| Account id style | mono, truncate, copy, explorer link (D2:147) | plain text in chip, no copy/truncate/explorer link | I:255 |
| Network indicator | `NetworkBadge` Mock/Testnet (D2:158) | `.netchip` "Mock · testnet" static, hidden <=640px | I:88-89,254 |
| Mobile | "mobile-proper for pay link and borrower view" (D0:67) | nav labels collapse to icons <=640; pay link phone mock only a card on app page; no real `/pay/[bizId]` page | I:236-245 |
| a11y target | AA contrast, focus rings, reduced motion, 390px QA (D0:70) | focus ring and reduced motion OK; `--faint` below AA likely (estimate); no 390px-specific rules besides <=640 | I:31,246 |

Where the PRD conflicts with the prototype beyond D0: PRD:25 says "repay 515, split 20%"; prototype 25% (same row above). D1:127 says Loan detail page with tx links; prototype has none. D1:131 says `/demo` hidden from nav; prototype exposes it inside the More menu and landing links to it (I:362, L:416).

### 15. Mapping: prototype view -> Next.js route (D1) -> components (D2)

| Prototype view / section | D1 route (D1:75-83) | D2 components (D2:144-159) it exercises | Prototype gap to resolve |
|---|---|---|---|
| landing.html (all) | `/` (S1, D1:95-99) | Button, Badge/StatusChip, Card, Tooltip? (no), `NetworkBadge` (absent on landing), `PaymentSplitAnimation` (hero loop L:445-457 is the landing variant) | Hero copy differs; track badges missing; Open demo CTA -> `/app/business` (not `/demo`) |
| index.html `business` | `/app/business` (S2) | `AmountDisplay`, `AccountId`, `CreditGauge` (= `.meter` stat), `DebtProgressBar` (+ `onSplit` = `.splitviz`), `PaymentSplitAnimation` (= `splitViz`), `RevenueChart`, `LimitExplainer` (caption only), `ActivityFeed/EventRow` (`.ev`), `ConstraintsPanel` (`.rules`), `StatusChip`, `NetworkBadge`, `WalletButton` (stub = acct chip) | Status chip in header strip, editable split chip, "Create pay link" is in `pay` view not a modal; starter-limit banner for no-history and skeleton/error states absent |
| draw flow (modal) | `/app/business/draw` (S3, as drawer from above) | `DrawDrawer` (stepper = `.steps`), `VendorSelect` (= `.picks`), `RepayPreview` (= `.review` + est. days), Slider, Dialog | Prototype is a modal; steps: amount, vendor, review; no explicit "success with tx link / Pending vs Paid via Intents" step (only toast); exceeds-limit/illiquid/delinquent errors only as toast/disabled button |
| `loans` | no index route in D1; detail `/app/loans/[id]` (S6, D1:128-129) | Table (`LoanBookTable` borrower variant), StatusChip | No loan detail page, no repayment schedule/tx links; need a decision on `/app/loans` index (Assumptions) |
| `pay` (create side) | create-pay-link modal on business side (D1:118) | `PayLinkForm`, `QRBlock` (absent), `.linkbox` | Inline view not modal; no QR; copy is a no-op |
| `pay` phone mock | `/pay/[bizId]` (S4, D1:116-118) | `PayLinkCheckout`, Button, "How it works" disclosure | Prototype is an embedded 310px mock with a fake pay; needs real full-page mobile-first route; "Verified agent business" copy |
| `activity` | none in D1 (feed lives on S2; "See all" implies a page) | `ActivityFeed/EventRow` | Needs a route or drawer (Assumptions) |
| `lp` | `/app/lp` (S5) | `VaultStatCard` (= `.stat`), `LoanBookTable`, `RiskPanel` (= `.rules` + mandate), deposit/withdraw card, `UtilisationChart` (absent) | No utilisation/yield chart; no shares/earned/value; no concentration chart; withdraw has no queue |
| `demo` | `/demo` (S7) | `DemoControls`, `NetworkBadge` | Matches simulate / fast-forward / reset; D1 wants network indicator (present in nav) |
| Toast | -- | Toast (primitive) | |
| Nav pill + More menu + crumb | app shell layout (`/app/*`) | Tabs? no: custom nav; Popover (`.menu`) | D1 has no Loans/Activity nav entries |

Primitive coverage from D2:144: Button (yes), Card (yes), Badge/StatusChip (yes), Input (yes), Slider (native range, styled by `accent-color` only), Tabs (no; closest `.seg`, unused), Dialog/Drawer (modal only), Tooltip/Popover (`.menu` popover only), Table (yes), Skeleton (no), Toast (yes). Missing from prototype: `AccountId`, `QRBlock`, `UtilisationChart`, `LimitExplainer` popover, `Skeleton`, `PayLinkForm` modal.

