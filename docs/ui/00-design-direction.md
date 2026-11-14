# UI design direction (proposal; confirm before building)

## Product feel
Track 08 says "a normal company could use tomorrow". So: **a credit product for businesses, not a DeFi degen dashboard.** Think Ramp/Mercury calm clarity with a vault page that DeFi judges respect. Numbers are the hero; chain details are one click deeper (tx links, account ids in mono).

## Principles
1. **One number per screen first**: available credit (borrower), net APY & utilisation (LP).
2. **Show the self-repaying mechanism visually**: a payment comes in -> bar splits into repay + to-business, debt bar shrinks. This is the signature animation and the demo's money shot.
3. **Honest risk UI**: advance rate, repay split, delinquency state, reserve visible. Judges are DeFi investors.
4. **No wallet-first friction**: demo mode with seeded data and a "simulate customer payment" control; wallet connect optional.
5. **Agent-aware**: the business is often a bot. Show "constraints set by human, executed by agent" (limits, vendor allowlist, repay split) and an agent activity feed.

## Visual language
- Dark-first, with a light theme if time allows. Near-black graphite surfaces, one accent. Proposal: accent `#00EC97` (NEAR-green family) for positive/inflow, a warm amber for repay/outflow, red only for delinquency.
- Type: a clean grotesk for UI (Inter/Geist), **tabular mono numerals** (Geist Mono / JetBrains Mono) for all amounts and account ids.
- Surfaces: 1px hairline borders, subtle elevation, 12–16px radii, generous spacing, no heavy gradients/glass.
- Charts: thin lines, area fills at low opacity, direct labels, no chart junk. Use the `dataviz` skill for palette/validation.
- Iconography: lucide.

## Tokens (draft)
```
--bg:        #0B0D0E   --surface:  #121517   --surface-2: #181C1F
--border:    #23292D   --text:     #E8ECEE   --muted:     #8A959B
--accent:    #00EC97   --repay:    #F5A524   --danger:    #FF5C5C   --info: #6EA8FF
radius: 8 / 12 / 16      spacing scale: 4 8 12 16 24 32 48
type: 12 13 14 16 20 28 40(num)   weights 400 500 600
```

## Motion
- Payment-split animation (GSAP or Motion): amount chip drops in -> splits into two streams -> debt bar decreases, counter ticks. ≤ 1.2 s, skippable, respects reduced motion.
- Count-up on key numbers on first load only. Skeletons not spinners.
- Everything else restrained (150–200 ms ease-out).

## Tech for the UI (proposal)
Next.js (read bundled docs first per AGENTS.md note), TypeScript, Tailwind, shadcn/ui, Motion for UI motion, a charting lib (Recharts or visx), mock data layer behind an interface so real contract views swap in later. Responsive: desktop-first for the dashboard, mobile-proper for pay link and borrower view (agent/owner checks on phone).

## Accessibility and QA
Contrast AA on dark, focus rings, tabular numbers, reduced motion, no color-only status. Check against the demo video resolution (1080p) and a 390px phone width.
