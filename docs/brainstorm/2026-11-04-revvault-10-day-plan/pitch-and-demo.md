# RevVault: judging angle, demo script, X post plan

Back to the plan: [../2026-11-04-revvault-10-day-plan.md](../2026-11-04-revvault-10-day-plan.md) · Evidence: [research.md](./research.md)

Everything here is a recommendation. Nothing is posted or submitted by the planning agent.

## 1. Positioning

**One line (README, form, X):** "Credit for AI businesses that repays itself: customers pay through a RevVault pay link, 25% of each payment clears the loan, the rest goes straight to the business."

**Three claims we can defend with the repo and tests**
1. Credit is bounded by revenue that actually flowed through the contract (limit = min(40% x trailing 30-day routed revenue, cap)). Verifiable on chain through `get_credit` and the ledger.
2. The loan is paid to the vendor, never to the borrower, and repays itself by a split applied inside the payment itself (`ft_on_transfer`), with no keeper and no manual repay step.
3. The business is an agent that acts inside human-set constraints: a function-call key limited to `request_draw`, an owner-curated vendor list, `max_draw`, and a fixed repay split.

**Claims we will not make**
| Do not say | Why | Say instead |
|---|---|---|
| "First of its kind on NEAR" / "nobody has built this" | R-C1..R-C9: absence of evidence only; attn.markets already does revenue-repaid credit on another chain | "To our knowledge, as of 2026-11-04, we found no NEAR-native revenue-routed credit line for agent businesses." |
| "bond.credit is on NEAR" or "bond.credit does not do credit" | Today's read could not reproduce NEAR on bond.credit; its credit vault is "coming soon" (R-C1) | Say nothing about bond.credit in public copy until Candra re-checks by eye. In Q&A: "agent credit scoring exists; ours underwrites on routed cash flow, not reputation." |
| "Meta Transactions redirect revenue into a lockbox" | NEP-366 lets a relayer pay gas; it does not reroute incoming funds (docs/research/02 R1) | "Revenue counts only if the customer pays through the RevVault pay link." Gasless relayer is cut, not claimed. |
| "Repayment is enforced" | It is economic, not legal | "A business can stop routing; the limit then shrinks and a reserve takes the first loss." |
| "X% APY" | Illustrative only | "Illustrative, from fees only, labelled in the UI." |
| "Settled via NEAR Intents" for testnet draws | There is no Intents testnet (R18); testnet draws are plain `ft_transfer` | "Vendor payout is a pluggable adapter. Testnet pays on NEAR. We show one real Intents payout on mainnet (tx in README)." Only say this if the proof lands. |
| "Real funds / production ready / audited" | Testnet, mock USDC, not audited | "Testnet prototype, contract logic covered by sandbox tests, not audited." |
| "History-based underwriting works from day one" | Testnet history is seeded | "Demo history is seeded by an owner-only demo method; a real business builds it by routing." |
| A "9.0/10 win score" or similar | Internal guess | Omit. |

**Track mapping (form + README)**
- **04 Autonomous Business (primary):** the borrower is an agent. Humans set only constraints (limit math, split, vendor allowlist, max draw, function-call key); the demo agent script runs the loop alone (sell, draw, repay).
- **08 Real-World Money (primary):** merchant pay link, stablecoin rail, vendor invoices paid straight from credit. "Usable tomorrow" is the claim we are least able to make, so phrase it as "the checkout and credit flow a small company could use; mainnet needs real USDC, vendor KYB and legal terms".
- **01 Unstoppable DeFi (enter only if the Intents mainnet proof lands):** the vault is non-custodial and the payout adapter targets Intents. Without a real proof, entering 01 invites the question "where is the cross-chain settlement?". Costs nothing in code, costs credibility if thin.

**Form description draft (20-2000 chars, about 900 used)**
> RevVault is revenue-routed credit for AI businesses on NEAR. A business uses a RevVault pay link as its payee. Each customer payment is split inside the contract: 25% repays the business's open loan, the rest is forwarded to the business. Credit limit = min(40% x trailing 30-day routed revenue, cap); a draw is paid directly to an allowlisted vendor, costs a flat 3% and has a 30-day term. LPs deposit stablecoin and earn from fees, with part of fees held as a first-loss reserve. The borrower is an autonomous agent acting inside human-set constraints: a function-call key that can only request draws, an owner-curated vendor list, a max draw and a fixed split. The repo includes the Rust contract (near-sdk 5, sandbox tests via `cargo test`), a seeded testnet deployment, the web app (mock mode with no setup, live testnet mode), and a demo agent script. Honest limits: only routed revenue counts as collateral, repayment is economic not legal, APY is illustrative, testnet history is seeded for the demo, USDC is a mock token, and the contract is not audited.

## 2. Likely judge questions and honest answers

The panel (docs/research/00-hackathon-brief.md) is DeFi-literate: expect default risk, LP loss, wash trading and trust assumptions. Numbers below use the prototype parameters (`prototype/index.html:299`): advance 40%, split 25%, fee 3% flat, term 30 days, cap 2,000, reserve share of fees `reserveBps` (prototype 10%; plan recommends 50%, see D9).

| # | Question | Honest answer | Evidence to have ready |
|---|---|---|---|
| 1 | What stops a business from routing less revenue and keeping the rest? | Nothing technical. Credit is only released against routed history, the draw goes to a vendor and not the borrower, and a business that stops routing sees its trailing revenue and limit decay while the loan runs to its due date and then delinquency. Enforcement is economic and reputational, not legal. | `get_credit`, delinquency flow, README "Honest limits" |
| 2 | Can I wash-route my own money to inflate my limit? | Yes, you can inflate the limit; it costs gas only (routing fee is 0 in the MVP). What you cannot do is cash out: draws pay only owner-curated vendors, so wash-routing buys vendor credit, not cash. The residual attack is a colluding vendor. A small routing fee (a few bps) would make wash volume cost money; it is a parameter, set to 0 now. | Test: draw to a non-allowlisted vendor fails; open question Q8 |
| 3 | Who eats the loss if a business defaults? | LPs, after the reserve. The reserve is `reserveBps` of collected fees. At a 3% fee and 10% reserve share it is 0.3% of principal, which is cosmetic; at 50% it is 1.5%. Real protection comes from sizing: the loan is at most 40% of one month of revenue and the vendor is paid directly. We show reserve coverage in the risk panel and say it is thin at launch. | RiskPanel numbers, `write_off` test |
| 4 | What default rate breaks even for LPs? | A loan that never repays loses its whole principal, a loan that repays earns 3%. So gross break-even is about 3% of principal defaulting (about 3 in 100 loans at full loss), before the reserve. 3% per 30 days is 36.5% annualised only if the loan is outstanding the whole term; self-repayment shortens average balance so effective APR on balance is higher. Illustrative only. | The arithmetic is in the README |
| 5 | Your own numbers say a max draw cannot clear in 30 days. | Correct, and we found it ourselves. Max draw is 0.4 x revenue x 1.03 = 0.412 x R30; at a 25% split steady revenue repays 0.25 x R30 per month, so a maximum draw takes about 49 days. The demo draw (500 on a 960 limit, at the seeded 112/day pace) clears in about 18 days. Mitigations in the design: the draw review shows "clears in ~N days" and warns above the term; past due the split steps up to 50% before delinquency; write-off only after a grace period. | `est_days` warning, `poke` test |
| 6 | Where is the oracle risk? | There is no price oracle: one stablecoin in, same stablecoin out. The only attestation idea (history boost) is cut. The trust assumptions are the stablecoin issuer, the owner key (parameters, vendor list) and the contract code. | Threat model in the plan |
| 7 | Is the owner key a rug vector? | The owner can change parameters and the vendor list. On the testnet deploy the account key can also redeploy code. For mainnet we would use a multisig and time-locked parameter changes, and remove the code key. We say so and do not claim otherwise. | README "Admin keys" |
| 8 | What if LPs all withdraw? | Withdrawals pay from `cash` only. At high utilisation `lp_withdraw` fails with a clear error and the UI shows "available liquidity". There is no withdrawal queue in the MVP. | `lp_withdraw` illiquid test |
| 9 | Why would a real business route all revenue through you? | The carrot is credit; there is no routing fee in the MVP and the 25% split only applies while a loan is open. Honest weakness: it requires the customer to pay the pay link (or the agent to embed the router as payee). Revenue paid elsewhere is invisible. | Pay-link page copy |
| 10 | What about refunds and chargebacks? | Crypto payments have no chargebacks. Refunds made outside the router do not reduce routed revenue, so revenue is counted gross; a router `refund` method is out of scope. | Out-of-scope list |
| 11 | How is this different from attn.markets? | attn is the closest analogue: revenue-repaid credit on another chain, by its docs a narrow proof so far (R-C4). RevVault's differences are NEAR, the agent-constraint model (function-call key, vendor list), and vendor payment as a first-class step. We do not claim to be first. | R-C4 |
| 12 | How is it different from bond.credit? | Agent credit scoring based on reputation and performance (R-C2); its credit vault is not live. RevVault underwrites on routed cash flow. | R-C1, R-C2 (re-check before saying aloud) |
| 13 | Why NEAR, and where do Intents fit? | NEAR gives cheap atomic FT callbacks, named accounts and restricted function-call keys that fit agents. Intents is the payout leg to other chains. There is no testnet for Intents, so the contract does not depend on it; a separate mainnet script pays one real vendor through 1Click and the tx is in the README. | R16-R18, proof tx or "not landed" |
| 14 | Is the demo real? | Two modes, both labelled. Mock mode runs the same math in the browser. Live mode talks to contract ids shown in the UI. In live mode the 30-day history and three other borrowers are seeded by owner-only demo methods, and USDC is our mock token. | NetworkBadge, `seed-testnet` script |
| 15 | Is this a regulated product? | A pooled lending product would likely need legal work. This is an experimental testnet protocol with no real funds and no yield promise. | README |
| 16 | Single asset, single contract: what if USDC depegs or the contract has a bug? | Concentration is real: one asset, one contract. Accounting is internal (no reliance on `ft_balance_of`), invariants are tested, but it is not audited. | Invariants test list |
| 17 | Why 3% flat and not APR? | Simplicity and no rounding drift, and the borrower sees the total upfront ("repay 515 for 500"). The cost is that early repayment saves nothing. | Draw review screen |
| 18 | Can the agent drain the vault? | An agent key can only call `request_draw`; each call is bounded by the limit, one open loan, `max_draw`, and an owner-curated vendor list. | Function-call key setup in the seed script |

## 3. The 90-second demo script (matched to the current prototype)

Screens and controls exist today in `prototype/index.html` and `prototype/landing.html`. Three gaps to close first, all in the web lane (the prototype files stay untouched until the builder runs):

- **Suggested take is arithmetically wrong.** `vDemo` (`index.html:493`) says "draw 500, send three payments, watch the loan close". 500 + 3% fee = 515 owed; at 25% it needs 2,060 routed, but the three buttons add 770. Fix: add a "Customer pays 1000" button and keep draw 500 (three clicks of 1,000 close it on the third), and correct the sentence.
- **Limit cap hides the "limit grows" beat.** Three 1,000 payments take trailing revenue from 2,400 to 5,400, so the limit rises 960 -> 2,160, clipped to the 2,000 cap. Show it as "960 -> 2,000 (cap)". Acceptable; do not raise the cap just for the video.
- **Draw guard.** Disable Draw while a loan is open (`index.html:427`, `index.html:347`); otherwise the second draw in a retake erases the debt.

Recording rules: 1920x1080, record in live testnet mode on a warm session, keep the mock-mode take as backup, show the contract id in the NetworkBadge for at least 2 seconds, no wallet pop-ups on screen (demo accounts sign silently), captions burned in (many viewers watch muted).

| Time | Screen / action | Caption on screen | Voice-over (about 150 words in total) |
|---|---|---|---|
| 0:00-0:08 | `landing.html` hero "Credit that repays itself", cursor to "Open the demo" | "Credit that repays itself" | "AI businesses can run themselves, but they cannot borrow. RevVault is credit that repays itself from revenue." |
| 0:08-0:20 | `#/business`: Available credit 960 of 960, Routed revenue 30d 2,400, advance rate 40%, NetworkBadge "Testnet" | "Limit = 40% of revenue routed through RevVault" | "This agent business has routed 2,400 USDC of revenue through its pay link. That sets its limit: 40 percent, 960." |
| 0:20-0:38 | Click Draw credit. Slider 500. Vendor GPU-Provider. Review: fee 15, you repay 515, est. days. Confirm. Activity: "Draw opened", "Vendor paid" with tx | "The vendor is paid directly" | "It needs GPU time. It draws 500. The vendor is paid straight away, not the agent. Fee is a flat 3 percent, so it repays 515." |
| 0:38-1:03 | `#/pay` phone view: Customer pays 1000, then Demo control "Customer pays 1000" twice, each lands on Dashboard with the split animation, debt bar shrinks | "25% of every payment repays the loan" | "Now customers pay the pay link. Each payment splits inside the transaction: a quarter repays the loan, the rest goes to the business. No repay button, no keeper." |
| 1:03-1:13 | Loan closes: "Loan closed" event, Available credit returns, limit 960 -> 2,000 | "Loan closed. Limit grew." | "The loan clears itself. And because more revenue flowed through, the limit grew." |
| 1:13-1:25 | `#/lp`: TVL, utilisation, Reserve, loan book with one delinquent row, risk panel, "illustrative APY" label | "LPs earn from fees. Risk is on screen." | "LPs fund the vault and earn from fees. The risk panel shows the advance rate, the reserve and the loans that are late." |
| 1:25-1:30 | End card: repo URL, `NEAR Hackathon`, "Testnet. Honest limits in the README." | "github.com/<org>/revvault-rwa" | "RevVault. Testnet, open source, and honest about its limits." |

If the Intents mainnet proof lands, add a 5-second insert after 0:38 showing the 1Click status `SUCCESS` and the explorer tx, captioned "Real vendor payout through NEAR Intents (mainnet, $2)". If it does not land, do not mention Intents in the video.

## 4. X post plan

Brief requirements (docs/research/00-hackathon-brief.md): the demo post must say it was built at NEAR HACKATHON, tag @NEARProtocol, include #NEARHackathon, and carry video or screenshots. The form needs the post link.

**Cadence (build in public, 5 posts, drafts via the `x-post` agent with its Buffer veto window; the planning agent posts nothing)**
| Date (UTC) | Post | Asset | Gate |
|---|---|---|---|
| Thu 5 Nov | Announce: building credit that repays itself for AI businesses on NEAR, 10 days | Landing hero screenshot | Landing deployed |
| Sun 8 Nov | "cargo test green: payment splits, draw, self-repay" | Terminal screenshot of `cargo test` | G1 passed |
| Tue 10 Nov | "Live on testnet: contract id, first routed payment" | 10 s screen capture of dashboard in live mode, explorer link | G2/G3 passed |
| Thu 12 Nov | **Main demo post** (this is the one in the form) | 90 s video, native upload | Video approved by Candra |
| Sat 14 Nov | Reply to own post: repo, README "honest limits" | None | Submission done |

**Main post draft (aim 280 chars or fewer; check with a counter before queueing)**
> Built at NEAR HACKATHON: RevVault, credit for AI businesses that repays itself.
>
> Customers pay a pay link. 25% of each payment clears the loan, the rest goes to the business. Limit = 40% of revenue that actually flowed through. Testnet.
>
> @NEARProtocol #NEARHackathon
> repo: <url>

**Thread (replies under the main post)**
1. How it works in one picture (the landing money-flow frame) and the three numbers: 40% advance, 25% split, 3% flat fee.
2. The honest part: "Only routed revenue counts. Repayment is economic, not legal. APY is illustrative. Testnet, seeded history, mock USDC."
3. The agent angle (Track 04): function-call key limited to `request_draw`, owner-curated vendors, max draw.
4. What we found while building: "our own max-draw math does not clear in 30 days at a 25% split, so the UI warns and the split steps up after due." This candid post is the most credible one for a DeFi audience.

**Rules for the posts**
- Hook with the mechanism, not the hype. No "first", no APY, no "revolutionary".
- Every claim in a post must also be in the README limits section.
- Native video upload (not a link), 16:9, burned-in captions, under 90 s.
- Verify the post is public and logged-out visible before pasting the link into the form.
