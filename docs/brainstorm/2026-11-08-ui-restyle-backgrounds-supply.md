# RevVault UI restyle: copy the Backgrounds Supply look, pink to blue

- **Date**: 2026-11-08 · **Project**: RevVault RWA (NEAR Hackathon, deadline 14 Nov 2026 23:59 UTC, submit by Sat 14 Nov 12:00 UTC) · **Mode**: UI / UX (plus Code task for the change list)
- **Status**: draft (decisions unconfirmed). The planning agent could not ask questions. Section "Decision" is a recommendation; Q1-Q3 at the end must be put to Candra before the builder starts.
- **Companion files**: none (single-file plan). Related: [2026-11-08-prd-alignment.md](./2026-11-08-prd-alignment.md) (copy edits in its section 6 and the Vite wrap in its D9 must stay compatible), `docs/ui/00-design-direction.md`, `docs/research/01-design-system.md`.

## Context

What was read: the saved reference `Backgrounds Supply ｜ Jaw-Dropping Backgrounds for Your Projects (11_5_2026 5：13：12 PM).html` (2.89 MB, a SingleFile save of backgrounds.supply, Next.js + CSS modules + Tailwind v4 base), inspected only through a copy with every `data:` blob stripped (160 KB left, of which 107 KB body and about 48 KB CSS); `prototype/landing.html` and `prototype/index.html` (tokens, structure, JS hooks); `docs/ui/00-design-direction.md`; `docs/research/01-design-system.md`; `docs/brainstorm/2026-11-08-prd-alignment.md`; `CLAUDE.md`.

Facts that shape the plan:
- No `_files` folder exists beside the reference. Everything is inlined: 199 AVIF, 5 PNG, 2 WebP, 2 SVG data URIs, and 6 inlined woff2 fonts. Only the outbound links, a logo (`/home/logo-icon.png`) and an OG image are external.
- **All `<script>` bodies were stripped by SingleFile (every script tag is empty).** Motion that needs JS is therefore reconstructed from the DOM state and the CSS, not read from code. Many tiles are lazy-load SVG placeholders, so the saved page is not a faithful picture of the live page below the fold. Do not use it as a pixel-diff target for the marquee tiles.
- The reference is **pure black**, not charcoal: page `#000`, cards `#000` or `#030611/#040611` with a 1px inset white-alpha ring, radii 32/24/16, one hot accent used everywhere (text, fills, glows), thin 400-weight headlines at 80/88 with a serif-italic emphasis word. RevVault today is Pawket-derived: charcoal `#10131A`, cards `#1A1E27`, accent `#7C98FF`, Press Start 2P wordmark, a pixel-art hero image (`prototype/assets/pixel-fantasy-bg.webp`), vertical-gradient blue buttons.
- Constraint from `CLAUDE.md` and the owner memory "real UI only": every change must land in the real connected screens. Nothing here may be preview-only art, a null image, or an off flag.

## The question

Make `landing.html` and `index.html` look and lay out like the reference, with the primary colour changed from pink to blue, without losing any function or copy, small enough for one frontend agent in about one day, and without copying proprietary imagery, fonts or code.

## Decision

**Option B (recommended): full restyle of the landing page to the reference's structure and visual language, plus a token-and-component restyle of the app shell (nav pill, buttons, cards, chips, modal). No new layout in the app. One shared `prototype/assets/tokens.css` replaces the two duplicated `:root` blocks.** One canonical blue (`#3E68FE`, step 500) plays the role the single pink `#FE3D70` plays in the reference; `#7C98FF` is kept as the lighter step 400 of the same scale, so there is one blue family, not two. Imagery is rebuilt from our own UI (live loan card, a real screenshot of our own app, CSS aurora); nothing from the reference's picture content or fonts is reused.

Why: the reference's layout is a marketing page. The app is a dense dashboard that has no counterpart in it, so copying layout there would cost the day for no gain, while tokens, nav, buttons, cards and chips carry 80% of the "same site" feel. What would change my mind: if Candra wants the app screens re-laid out (Q2), the estimate doubles and the Vite wrap slips a day.

### Options considered

| | Impact (looks like reference) | Effort | Risk | Fit with prototype / PRD plan | Reversibility |
|---|---|---|---|---|---|
| A. Tokens only (swap colours and fonts, no structure) | Low-medium: still reads Pawket | 2-3 h | Low | Best | Easy |
| **B. Landing full restyle + app shell/component restyle (chosen)** | High on landing, medium-high in app | ~1 day | Medium (scroll-scrub JS must keep working) | Good, tokens file ports straight to `web/` | Easy: one tokens file plus per-section CSS |
| C. B plus app re-layout (hero strip, bento dashboard, collections-style loan grid) | Highest | 2-3 days | High, displaces the Vite wrap | Poor, collides with PRD-alignment day plan | Hard |
| D. Contrarian: keep the Pawket look, change only the accent to the reference's saturation | Low | 1 h | None | Best | n/a. Rejected: the user asked to copy the reference. |

Pre-mortem (it is Fri 13 Nov and this failed): (1) the restyle ate the day the Vite wrap needed. Mitigation: P0/P1/P2 split below, P0 alone is shippable. (2) A word-reveal or marquee broke the scroll-scrubbed flow diagram (single rAF loop at `landing.html:119-128`). Mitigation: new motion is CSS-only except one progress-bar line added to that loop. (3) A licensing complaint about a reused image or font. Mitigation: section 4, no reference pixels, no reference fonts. (4) Contrast regression from copying the reference's 40% white text. Mitigation: floors in section 1.

---

## 1. Design tokens: measured reference, blue mapping

Source: CSS of the saved page (`home-module` sheet, 230 rules) and the inline custom properties. Hex values are exact from the file; "alpha" values are the 8-digit hex converted.

### 1a. Reference tokens, measured

| Group | Token (as found) | Value | Where used |
|---|---|---|---|
| Accent | `--hv-pink` | `#FE3D70` (hsl 344, 99%, 62%) | eyebrow text, top progress bar, serif-pink emphasis words, price number, sparkle icon, "Get now"-hover fill, newsletter button, news glow |
| Accent hover | literal | `#FF5280` (hsl 344, 100%, 66%) | newsletter button hover |
| Accent glow (button) | literal | `#FF3C714D` = rgba(255,60,113,.30) | `box-shadow:0 10px 22px` on white button hover |
| Accent glow (icon tile) | literal | `radial-gradient(50% 50% at 50% 0, #FF3D714D 0%, #040611 100%)` | 64px problem icon tiles |
| Accent glow (card) | literal | `radial-gradient(120% 100% at 100% 0, #FF3D7159 0%, #FF3D7100 60%), #FFFFFF05` | newsletter card |
| Accent glow (blob) | `--hv-pink` | solid `#FE3D70`, `filter:blur(100px)`, 408x267, opacity 0 to 1 on card hover | newsletter card |
| Accent, global focus | literal | `#E74C6F` outline 2px (global), but `#FFFFFFCC` 2px offset 3px inside the page | focus ring |
| Page bg | `--hv-bg` | `#000` | page, bento cards, price card |
| Navy-black | literal | `#030611` / `#040611` | button label ink, collection cards, icon tile end stop, vault tiles |
| Text | literal | `#FFF`; alphas `#FFFFFFCC` (80%) sub copy, `#FFFFFFB8` (72%) FAQ answers, `#FFFFFFA6` (65%) nav links, `#FFFFFF99` (60%) news sub, `#FFFFFF80` (50%) footer links, `#FFFFFF66` (40%) rotator lead and copyright | |
| Rings (alpha white) | literal | 8% `#FFFFFF14` bento card inset ring; 10% `#FFFFFF1A` FAQ item; 26% `#FFFFFF42` FAQ hover; 14% `#FFFFFF24` news card; 18% `#FFFFFF2E` unlock card | `box-shadow:inset 0 0 0 1px` |
| Glass fills | literal | `#FFFFFF1A` (10%) glass button / sign-in pill / burger; `#FFFFFF05` (2%) news card; `#FFFFFF0D` (5%) input | |
| Nav glass | literal | bg `#1212148C` (rgb 18,18,20 at 55%), `backdrop-filter:blur(22px)`, shadow `0 12px 40px #00000073` | floating pill |
| Mobile menu | literal | bg `#121214D9` (85%) blur 22 | |
| Cursor pill | literal | `#28282C99`, blur 10 | "View collection" |
| Fonts | `font-family` | Body/headings **Satoshi** (not embedded in the save, so a fallback renders in the file); serif emphasis **Editor's Note** italic 400/500 (embedded woff2); FAQ answers **Outfit** 400; forms and footer **Inter**; Geist is loaded but unused on this page | |
| Radii | | nav 44, buttons 200 (pill), glass pill 100, cards (bento, price, unlock, news) **32**, collection cards **24**, FAQ items **16**, icon tiles 16, marquee tiles 12, small tiles 10, inputs/news button 10 | |
| Type scale | | h1 80/88 -1.6px w400; h2 48/52.8 -0.96px w400; meet title 88/70.4 -1.76px w700; statement 80/88 -1.6px; unlock 40/48 -0.8px w500; card title 32/35.2 -0.64px; price 48/52.8; list 24/26.4 -0.48px; sub 20/24; button 20/24 w700 -0.4px; eyebrow 14/15.4 **w700, letter-spacing 4.2px, uppercase**; nav link 14; nav CTA 13/500; footer 14-15 | |
| Spacing | | section padding 120px; grid top margin 84px; bento 474/232/474 columns, 3 rows of 326, gap 10; collection grid 3 cols gap 16, card 208px tall; FAQ list max 800, gap 12; unlock/news max 864; page max 1200; breakpoints 1199.98 and 809.98 | |
| Shadows / effects | | nav `0 12px 40px #00000073`; button hover glow above; glass button `inset 0 .5px #FFFFFF59`; text-shadow `0 1px 5px #0000005E` on the 88px title; bottom progressive blur: 8 stacked layers 0.5 to 53px, 132px tall; edge-faded marquee masks (12% / 88%) | |
| Easing | | main `cubic-bezier(.22,1,.36,1)` (button, FAQ, sparkle, card image); springs `(.34,1.3,.64,1)` and `(.34,1.2,.64,1)`; rotator `(.7,0,.3,1)`; durations 120-160 ms press, 300-500 ms state, 600-900 ms reveal | |

### 1b. Blue mapping

Derivation: keep the reference's single-accent structure (one saturated mid-tone used for text, fill, glow, progress) and move hue 344 to 227, the hue `#7C98FF` already has, holding the reference's saturation (about 99%) and lightness (about 62%) for the primary. Everything below was computed, not eyeballed (WCAG 2.x relative luminance).

| Step | Hex | Role | on `#000` | on `#040611` | white text on it | blue text on white |
|---|---|---|---|---|---|---|
| 50 | `#F0F3FF` | light-surface tint (none used today) | 18.97 | 18.25 | n/a | n/a |
| 100 | `#E0E7FF` | | 17.04 | 16.40 | | |
| 200 | `#C2CFFF` | | 13.66 | 13.15 | | |
| 300 | `#9EB3FF` | gradient highlight, hover tint | 10.35 | 9.95 | | |
| **400** | **`#7C98FF`** | **unchanged current accent**: small text on tinted chips, links, chart highlight | 7.79 | 7.50 | 2.69 | 2.69 (do not use on white) |
| **500** | **`#3E68FE`** | **the reference's pink role**: eyebrow text, progress bar, primary fill (white label), glow, active step | **4.62** | 4.44 | **4.55** | 4.55 |
| 600 | `#1E4DF6` | pressed fill | 3.45 | 3.32 | 6.09 | 6.09 |
| 700 | `#163DCA` | | 2.55 | 2.46 | 8.22 | |
| 800 | `#18318B` | | | | 11.35 | |
| 900 | `#122054` | deep glow base | | | 15.44 | |
| hover (fill) | `#2F5BFB` | hover for 500 fills; **darker, not lighter**, because the reference's lighter hover (`#FF5280`) gives white text only 3.10 and would fail for 14px labels | 4.01 | | **5.24** | |

Derived effects (the same recipes as the reference, with the pink channels replaced by 62,104,254):

| Effect | Value |
|---|---|
| Button glow | `0 10px 22px rgba(62,104,254,.30)` |
| Icon tile | `radial-gradient(50% 50% at 50% 0, rgba(62,104,254,.30) 0%, #040611 100%)` |
| Card glow | `radial-gradient(120% 100% at 100% 0, rgba(62,104,254,.35) 0%, rgba(62,104,254,0) 60%), rgba(255,255,255,.02)` |
| Blob | `background:#3E68FE; filter:blur(100px); opacity:0 to 1` |
| Soft fill (`--accent-soft`) | `rgba(62,104,254,.16)` (chips, selected pick, fresh-event flash) |
| Selection of text on soft fill | step 400 `#7C98FF` (7.1:1 on `#0B0F1C`) |
| Aurora (hero) | stops `rgba(62,104,254,.45)` to transparent 70%, second blob `rgba(124,152,255,.18)`; keeps the existing violet `#C59BFF` blob at .16 only if Q1 keeps the aurora look |
| Focus ring | 2px `#7C98FF` (7.79:1 on black), offset 3px; satisfies the 3:1 non-text rule on both black and on 500 fills |

**How it relates to `#7C98FF` (no two competing blues).** Today the app has `--accent #7C98FF`, `--accent-2 #5B7CFF` (defined, never used), and gradient literals `#6E8BFF`, `#4A6BF5`, `#8FB1FF`, `#9DB2FF`, `#7E98FF`, `#5677FA`, plus a glow `rgba(46,91,255,.42)` (`docs/research/01-design-system.md`, token table). Rule after the restyle:
1. One scale, defined once in `tokens.css`. `#7C98FF` becomes `--blue-400`; `#3E68FE` becomes `--blue-500`.
2. `--accent` = `--blue-500` (fills, glows, progress, eyebrow). `--accent-text` = `--blue-400` (text on tinted or dark-gray chips and links). `--accent-ink` becomes `#fff` (labels on 500 fills). `--accent-soft` recomputed.
3. `--accent-2` and every literal listed above are deleted. A grep for them must return zero hits outside `tokens.css` (verification item).
4. Max two blue steps visible per screen (500 and 400). No gradient on buttons: the reference's primary is a flat fill plus glow; the current vertical gradient plus inset highlight goes away.
5. Semantic colours unchanged and kept clear of the blue family: `--up #54D6A0` (11.5:1 on black), `--down #FF7E61` (8.4:1), `--warn/--repay #F2BE5C` (12.3:1), `--ok #86E3B5`, `--op #5CD3FF`. No pink exists in the result, so `--down` coral cannot read as the old accent.

**Surfaces and text (derived from the reference, adjusted for accessibility).**

| Token | Value | Note |
|---|---|---|
| `--page` | `#000` | reference page (landing and app, subject to Q2) |
| `--card` | `#040611` | the reference's navy-black; gives cards a faint cool tint against `#000` |
| `--card-2` | `#0B0F1C` | nested surface; derived, not in the reference |
| `--hover` | `#121828` | derived |
| `--line` / `--line-2` / `--line-hover` | `rgba(255,255,255,.08)` / `.14` / `.26` | from the 8%, 14% and 26% rings; cards use `box-shadow:inset 0 0 0 1px var(--line)` |
| `--text` | `#FFFFFF` | |
| `--mute` | `rgba(255,255,255,.72)` | the reference's 72%/80% copy |
| `--faint` | `#808AA0` (6.06:1 on black, 5.51 on `#0B0F1C`) | replaces `#687286` (4.34:1, fails AA at 14px) |
| Floor rule | no text below 60% white (`#999`, 7.4:1) | the reference uses 40% white (`#666`, 3.66:1) for its rotator lead and copyright; do **not** copy that, it fails AA |
| Radii | `--r-card 24`, `--r-panel 32`, `--r-item 16`, `--r-tile 12`, `--r-pill 999` | app panels stay 24; landing hero-level cards use 32 |
| Light surfaces | none are added; the only light surfaces are the white pill buttons (`#fff` with ink `#030611`, 20:1) | blue on a light surface must use 500 or 600 (4.55 / 6.09), never 400 |

Fonts (decision, not question): keep **Mona Sans** for body and headings (OFL, already loaded, closest available to Satoshi at weight 400/700, zero new risk). Add **Instrument Serif italic** for the one emphasis word per headline (stand-in for Editor's Note; it is on Google Fonts and, to my knowledge, OFL: the builder must confirm on fonts.google.com before shipping). Drop **Press Start 2P** from both files (wordmark and boot percentage become Mona Sans 700, letter-spacing -0.02em). FAQ answer font Outfit and the form/footer font Inter are not needed: Mona Sans covers them.

---

## 2. Layout and section inventory, mapped to RevVault

Reference order (top to bottom): progress bar, floating nav pill, hover-expand side nav, bottom progressive blur, hero, problems, "meet" marquee, use-cases bento, pricing card, collections grid, statement with rotator, FAQ, "unlock" card, newsletter card, footer.

| # | Reference section (measured) | Verdict | RevVault target | Notes |
|---|---|---|---|---|
| 1 | Top progress bar, 6px, accent, scaleX by page scroll | **Copy** | `landing.html` (and optional on app: no) | blue-500, fixed top |
| 2 | Floating nav pill: top 20px, blur 22, radius 44, padding 10/10/10/22, logo 22px r6, links 14px white 65%, sign-in glass pill + white "get now" pill (33px high, 13/500); burger under 810px with a menu panel `#121214D9` | **Copy** | `landing.html` `.nav-in`; `index.html` `.fnav-in` | Keep existing links and the app's More menu. Keep existing CTA text; style as white pill. |
| 3 | Side nav (5 dashes expanding to labels on hover) | **Drop** | n/a | The landing already has scroll-scrubbed sections plus the top nav; adds JS and a11y surface. Optional P2. |
| 4 | Bottom progressive blur (8 layers, 132px) | **Adapt, P2** | landing | Pure CSS, cheap. Use 4 layers. |
| 5 | Hero: 100vh, centered column, icon 123px, h1 80/88 with one serif-italic word, sub 20/24 at 80%, two 48px pill buttons (white + glass), WebGL "Unicorn Studio" background, a masked showcase image rising from the bottom, "freckles" particle canvas, bottom fade | **Adapt** | `landing.html` `.phero` | Headline stays "Credit that repays itself" (copy kept; PRD section 6 may change the sub, markup must not care). Replace WebGL with a CSS aurora (blue) plus the existing dot grid. Replace the showcase image with the existing live loan card section pulled up under the hero with a top mask fade (-120px margin), or a real screenshot of our app (see section 4). Icon = our vault mark at 96px. |
| 6 | Problems: eyebrow + h2 + 3 icon tiles (64px, radial glow) with one line each | **Drop for now** | n/a | No approved copy for three pains, and copy edits are owned by the PRD alignment pass. Tile style is reused by the "badge" icon tiles in the bento and module cards. |
| 7 | "Meet" band: 2 counter-scrolling rows of 318x176 r12 tiles, 10px gap, edge-fade masks, centered pill + 88px bold title overlapping | **Adapt** | `landing.html`, replaces the text ticker `.marq` (`:316`) as a taller band | Tiles are **our own mini UI cards built in HTML/CSS** (loan card, split bar, pay link, note row, vendor payout, activity event), not images. Overlay pill and title reuse existing strings (e.g. the marquee words or an existing h2). Keep the velocity-linked ticker logic only if cheap; otherwise CSS-only. |
| 8 | Use-cases bento: eyebrow + h2, 5 cards on a 474/232/474 x 326x3 grid, r32, black, 8% inset ring, 32px title top-left at 24/24, hover micro-interactions (icons fly out, phone blur-scales, banner crossfade, slider) | **Adapt** | `landing.html` `#features` bento (`.bt` cards) | Keep the existing 5 interactive cards and their JS (credit-limit slider, split slider, etc.); re-flow onto the reference grid, r32, inset ring, 32px titles. Hover transforms CSS only. Drop the wallpaper slider (JS). |
| 9 | Pricing card: 1200x675 r32, shader canvas, centered 230px column, serif price in accent, checklist rows 24px with check icons, sparkle button | **Adapt** | `landing.html` new "Terms" card in or after `#features` (P1) | Content = the loan terms, bound to one JS const so PRD changes apply once: flat 3% fee, 20% split, 60-day term, advance 40%/30% (values per the alignment plan; if not yet applied, use whatever the prototype constants currently hold). Number in serif blue-500; button "Open demo" with the sparkle hover. Canvas shader becomes a CSS radial. |
| 10 | Collections: 3-col grid of 208px r24 cards, image, bottom gradient shade, name 24/500 + count 14, custom cursor pill "View collection" (cursor:none), "More coming soon" gradient text | **Adapt, P1** | `landing.html`, new "Built for" row | Three cards: Agents, Creators, LPs (matches PRD kinds). Art = CSS radial + icon tile, no photo. **Drop the custom cursor** (`cursor:none` hides the pointer; keyboard/a11y hazard and JS). Hover = scale 1.04 on the art. |
| 11 | Statement: 80px paragraph with 4 serif-medium accent words, a rotating role line ("Must buy if you're a" plus a 7.5s vertical rotator) | **Adapt, P1** | `landing.html` `#fin` ("Watch a loan pay itself back.") | Keep the scroll-fill closing line; wrap 1-2 words in serif-italic blue. Add the CSS rotator for "Built for: agents / creators / LPs" above it. |
| 12 | FAQ: 800px, 10 items, r16, 10% inset ring (26% on hover), 20/26 questions, answer region animates `grid-template-rows 0fr to 1fr` .35s | **Copy** | `landing.html` `#limits` accordion ("honest limits") | Restyle only; keep content (PRD adds three entries). Keep native `details` if that is what exists, otherwise buttons with `aria-expanded`. |
| 13 | "Unlock" card: 864x530 r32, three marquee rows of tiles fading into black, lockup, 40px title, white button | **Adapt, P1/P2** | `landing.html` closing CTA | Reuse the tile marquee of item 7 at 188x104; title and button use existing closing copy. |
| 14 | Newsletter card with email input, hover glow blob and three tilted tiles | **Drop** | n/a | RevVault collects no emails (honesty and scope). The glow-blob-on-hover recipe is kept as a utility for the "Terms" or closing card. |
| 15 | Footer: brand + description + "created by", 4 columns (Browse, Discover, Information, Legal), 80/80/60 padding, links white 50%, copyright 40%, socials | **Adapt, P1** | `landing.html` `<footer>` (`:420`) | Brand + one-line description, 3 columns (Product: App, Demo, Flow; Project: README, Honest limits; Legal: "Testnet demo, mock data, not audited"). Only links that exist. Copyright at 60% white or higher. |
| - | No reference counterpart: live loan card, scroll-scrubbed flow diagram, modules horizontal track, compare table, boot ring | **Keep, restyle by tokens only** | `landing.html` | Boot ring stays (shortened to the same 0.5s fade); stroke blue-500, ring glow `rgba(62,104,254,.7)`. |
| - | App views (business, loans, pay, activity, lp/notes, demo) and the draw modal | **Keep layout, restyle by tokens** | `index.html` | Nav pill, buttons, cards, chips, badge tiles, scrim, toast, focus ring. Cards keep 24px radius and `inset` hairline. No new layouts. |

Wireframe of the target landing (sections in order, `*` = new or reshaped):

```
┌ progress bar (blue, 6px) ───────────────────────────────┐
│        ( floating glass pill nav, white CTA )           │
│  hero 100vh: vault mark, H1 w/ one serif word, sub,     │
│  [Open demo (white)] [See the flow (glass)]   aurora*   │
│  ┌ live loan card, masked top, pulled up ┐              │
├ marquee band*: 2 rows of mini-UI tiles + centred title ─┤
├ flow diagram (scroll-scrubbed, existing) ───────────────┤
├ modules track (existing) ───────────────────────────────┤
├ bento* (5 cards, r32, 8% ring) ─────────────────────────┤
├ Terms card* (serif blue number + checklist) ────────────┤
├ Built for* (3 cards) ───────────────────────────────────┤
├ compare table (existing) ───────────────────────────────┤
├ honest limits accordion (FAQ style) ────────────────────┤
├ closing: rotator* + scroll-fill line + CTA ─────────────┤
└ footer* ────────────────────────────────────────────────┘
```

## 3. Motion inventory: JS vs CSS

Reconstructed from CSS keyframes, transitions and DOM state (the JS is absent from the save).

| Motion in reference | Evidence | Needs JS? | RevVault approach |
|---|---|---|---|
| Page body fade-in | `body{transition:opacity ease-in .2s}` | No | CSS; the existing boot ring already covers it |
| Top progress bar | `.progress` fixed, `transform-origin:0`, 6px | Yes (scroll value). Reference likely framer-motion `useScroll`; inferred | One line `bar.style.transform='scaleX('+p+')'` inside the existing rAF frame loop (`landing.html:125`), no new listener |
| Smooth scroll | `html.lenis` class | Yes (library) | **Do not add Lenis.** Native scroll plus the existing scrubbing; installing a lib is out of scope and fights the scrubbers |
| Word-by-word blur reveal (h1, h2, statement) | `.word{will-change:transform,filter,opacity}` and inline `opacity:1;filter:blur(0);transform:none` on each span | Mostly CSS | `@keyframes word-in{from{opacity:0;filter:blur(10px);transform:translateY(.3em)}}`, `animation-delay:calc(var(--i)*60ms)`; words wrapped in spans by hand or a 6-line splitter. Replaces `data-fold`. Triggered by the existing IntersectionObserver `.in` class. |
| Hero aurora / WebGL scene | `usCanvas`, "Unicorn Studio Scene", poster fade .9s | WebGL third party | CSS only: existing `drift` keyframes on two radial blobs, blue-500. No third-party script. |
| Freckles (particles) | `<canvas class=freckles>` | Yes | **P2**; if done, one small canvas, 60 dots, paused when off-screen. Otherwise skip. |
| Marquee rows | `@keyframes hv-marquee` translate 0 to -50%, `--dur`, second row `animation-direction:reverse`, pause on hover, edge mask | No | CSS: duplicate the track group, `animation:marquee var(--dur) linear infinite`, `mask-image` 12%/88% |
| Overlay title scale (meet) | `transform-origin:50% 0` on the 88px title | Probably scroll-linked | Skip; static |
| Bento: icons fly out and phone blurs on hover; banner crossfade 8.1s with 2.7s offsets; slider with dots | `.cSocial:hover .socialIcon`, `@keyframes hv-banner` | Hover and banner are CSS; wall slider is JS | CSS hover only; banner crossfade only if a card needs it; drop the slider |
| Button sparkle reveal, press scale .98, glass hover | transitions on `max-width`, `transform` | No | CSS |
| Role rotator | `@keyframes hv-roles`, 7.5s `cubic-bezier(.7,0,.3,1)`, translateY steps 0/-47/-94/-141 | No | CSS (copy the step idea, not the exact rules) |
| FAQ expand | `grid-template-rows:0fr to 1fr` .35s, chevron rotate | JS only for `aria-expanded` | CSS plus the existing accordion handler |
| Collection card hover | `img scale(1.04)` .5s; custom cursor pill follows the pointer | Cursor is JS | CSS scale; **cursor pill dropped** |
| Newsletter glow and tile fan on hover | `.news:hover .newsGlow{opacity:1}`, rotate steps | No | CSS utility, used on the Terms card |
| Bottom progressive blur | 8 `backdrop-filter` layers with gradient masks | No | CSS, P2 |
| Scroll-scrubbed flow, modules track, closing fill, boot ring, ticker velocity, card tilt | RevVault only (existing JS `landing.html:11-128`) | Existing JS | Untouched logic; only colours and radii change |
| Reduced motion | `@media (prefers-reduced-motion:reduce)` removes all animations, keeps first frame | CSS | Extend the existing block (`landing.html:289-290`, `index.html:246`) to cover every new keyframe, word-reveal, rotator and marquee |

Rule: any new motion is CSS or one line in the existing loop. No new JS library, no new dependency (`CLAUDE.md`: dependency changes go through `docs/handoffs/DEPS.md`, and the prototype has none).

## 4. Asset licensing and reuse check

Backgrounds Supply is a **commercial product** ("one-time purchase, commercial license included"; its FAQ forbids "reselling or redistributing them as a standalone product"). Everything visual on the page is either the product's sample content or the author's brand.

| Item in the saved page | Verdict | What to do |
|---|---|---|
| 199 AVIF + 2 WebP + PNG thumbnails (tiles, hero showcase, wallpapers, collection art, mockups) | **Must not reuse.** These are the paid product's content | Generate or build our own. Use CSS aurora, our mini UI tiles, and a real screenshot of our own app. If a photographic texture is wanted, generate it (blender-3d or the existing image tools), or use a CC0 source with its license recorded. |
| Logo icon, footer lockup, OG image, favicon (PNG data URIs) | **Must not reuse** (brand marks) | Our own vault mark (existing inline SVG) |
| Unicorn Studio scenes (hero, pricing, footer tail) and its "Made with unicorn.studio" watermark image | **Do not embed.** Third-party service; the free-plan terms for removing the badge could not be confirmed (pricing page found, watermark policy not stated: [unicorn.studio/docs/pricing](https://www.unicorn.studio/docs/pricing/)) | CSS aurora instead |
| Font Editor's Note (embedded woff2) | **Must not extract or reuse.** It is a Pangram Pangram foundry face; their trial fonts are personal-use only and commercial use needs a paid license, and the EULA forbids modifying the files ([pangrampangram.com/pages/eula](https://pangrampangram.com/pages/eula); secondary summary at [licenseorg.com](https://licenseorg.com/guide/fonts/pangram-pangram)). I could not confirm that "Editor's Note" itself is the foundry's family from these sources | Instrument Serif italic (confirm OFL on Google Fonts) |
| Font Satoshi (named in CSS, not embedded) | Free for commercial use from Fontshare under the ITF Free Font License; self-hosting is fine, public re-hosting needs the foundry's consent (secondary source, EULA text not retrieved) | Not needed: keep Mona Sans |
| Fonts Outfit, Inter, Geist (embedded woff2) | OFL families, but embedding their base64 from this file is pointless | Not needed |
| CSS: class names (`home-module__RoZqoW__*`), exact rule text, copy text ("Jaw-dropping backgrounds for your projects", FAQ answers, "Must buy if you're a", price, "1,839 backgrounds"), JSON-LD, the contact email, author handles, humans.txt | **Rewrite, do not paste.** Visual language and numeric values (a radius, a ring alpha, an easing curve) are facts about a design; the author's code and words are theirs | Fresh class names, our own copy, our own JSON-LD (none needed) |
| Scripts | Stripped in the save, so there is nothing to copy; behaviours were inferred | Write our own |
| **Side finding, our own asset:** `prototype/assets/pixel-fantasy-bg.webp` (420 KB, the Pawket hero image) | Provenance unrecorded in the repo. It was lifted from a reference page in an earlier session | Removed by this restyle (hero becomes the CSS aurora). Delete it from the repo and from `docs/research` references, or record its license, before the public repo goes up. |

Summary: this restyle is safe because it copies structure, proportions, tokens (with the pink replaced) and motion ideas only, and replaces every image, font and script. No attribution is required for that; a "design inspired by" line is unnecessary.

## 5. Concrete change list (one agent, about one day)

Order matters: P0 first and shippable alone; do not start P1 until P0's verification passes. Estimates are guesses.

### P0 (about 5 h)

**A. NEW `prototype/assets/tokens.css`** (about 120 lines, no selectors other than `:root`, three shared primitives, and the reduced-motion helper)
1. `--blue-50..900`, `--blue-hover #2F5BFB`, `--accent`, `--accent-text`, `--accent-ink #fff`, `--accent-soft`, `--glow-btn`, `--glow-tile`, `--glow-card` as in section 1b.
2. Surfaces `--page --card --card-2 --hover`, `--line --line-2 --line-hover`, text `--text --mute --faint`, semantic colours unchanged, radii `--r-card --r-panel --r-item --r-tile`, easings `--glide cubic-bezier(.22,1,.36,1)`, `--spring cubic-bezier(.34,1.3,.64,1)`, `--sans`, `--serif`.
3. Primitives with an `rv-` prefix to avoid the existing `.btn/.nav/.badge/.chip` class collisions: `.rv-eyebrow` (14px/700/4.2px, uppercase, `--accent`), `.rv-em` (Instrument Serif italic 400, optionally `--accent`), `.rv-btn-white`, `.rv-btn-glass`.
4. Font `<link>` stays in each HTML head: Mona Sans (400-900) plus Instrument Serif italic; remove `Press+Start+2P`.

**B. `prototype/landing.html`**
1. `:root` (`:13-21`): delete colours, keep `--gut`; `<link rel="stylesheet" href="assets/tokens.css">` before the inline style.
2. Replace every blue literal (`#6E8BFF`, `#4A6BF5`, `#8FB1FF`, `rgba(91,124,255,…)`, `rgba(124,152,255,…)`, `rgba(74,107,245,…)`) with tokens. `.btn.grad` (`:59-60`) becomes the flat 500 fill + `--glow-btn`, hover `--blue-hover`; `.btn.white` becomes the reference's white pill (48px, 20/700, ink `#030611`, hover blue fill + glow).
3. Boot ring (`:25-32`): stroke `--accent`, glow `rgba(62,104,254,.7)`; percentage and wordmark in Mona Sans (remove Press Start 2P at `:32,43,51`).
4. Nav (`:46-60`): pill per section 2 row 2 (bg `rgba(18,18,20,.55)`, blur 22, radius 44, shadow `0 12px 40px rgba(0,0,0,.45)`, links 14px white 65%, white CTA 33px). Add a burger + panel under 810px if the current mobile nav does not already collapse (check at 390px first).
5. Progress bar: add `<div class="progress">` (fixed, 6px, `--accent`, `transform-origin:0`, `transform:scaleX(0)`) and one line in `frame()` (`:125`).
6. Hero (`.phero`, `:307-315`): remove `<img id="hero-img">` and its JS (`heroImg`, load handler `:114`, parallax use in `heroFrame` `:119-123`; keep the function guard so nothing throws); make the section 100vh centered (h1 80/88/-1.6px w400 with one `.rv-em` word, sub 20/24 at `--mute`, two 48px pills); background = black + two aurora blobs on the existing `drift` keyframes + the existing dot grid; add the bottom fade (`linear-gradient(transparent,#000)` 93px). Keep ids `fold`, `hero-copy`, `hero-bg` and any ids the JS reads.
7. `.live` section (`:318`): pull up by about 120px with a top mask fade so the live loan card reads as the reference's rising showcase; restyle `.lc` card to `--card`, r32, inset hairline, `--glow-card` variant for the featured card.
8. Cards everywhere (`.card`, `.bt`, `.mod`, `.cr`, compare, accordion items): background `--card`, `border:0`, `box-shadow:inset 0 0 0 1px var(--line)`, radius per tier (32 hero-level, 24 default, 16 accordion), hover ring `--line-hover`. Badge icon tiles use `--glow-tile`.
9. Bento (`#features`, `:379-391`): re-flow on `grid-template-columns:474px 232px 474px; grid-template-rows:repeat(3,326px); gap:10px; max-width:1200px` with named areas; title 32/35.2/-0.64 at 24/24; breakpoint 1199.98 to 292/142/292 (max 746), 809.98 to one column. Do not change `id`s or the slider handlers.
10. Accordion (`#limits`): item r16, 10% ring (26% hover), question 20/26 w500, answer `--mute` 16/28, `grid-template-rows` transition.
11. Section chrome: `.rv-eyebrow` above each `h2`; `h2` 48/52.8/-0.96 w400 centered; section padding 120px (60px under 810px); grid top margin 84px.
12. Reduced motion (`:289-290`): add the new keyframes (word-in, marquee, rotator, aurora) to the disable list; keep the first frame visible.

**C. `prototype/index.html`**
1. `:root` (`:12-20`): delete colours, link `tokens.css`; delete `--accent-2` and every literal listed in section 1b.
2. `.btn.primary` (`:36-37`), `.act-main` (`:43-44`), `.brand .mk` (`:70`): flat `--accent`, label `#fff`, hover `--blue-hover`, glow shadow; `.act-ghost`/secondary use `--card-2` plus ring.
3. `.fnav-in` (`:68`) and `.nav` items: same glass pill spec as landing; active item `--card-2` + ring; More menu `.menu` on `--card`.
4. `.card` (`:65`): `--card`, inset hairline instead of border, radius unchanged (24); `.glow` (`:66`) becomes `--glow-card`.
5. Chips and badge tiles (`:52-61`): `chip.blue`/default use `--accent-soft` with `--accent-text`; default badge tint channels `62,104,254`.
6. Modal `.modal` (`:186`) and scrim: `--card`, r32, ring `--line-2`; toast (`:209`): `--accent` with `#fff` text; focus ring (`:31`): 2px `--blue-400`, offset 3.
7. Wordmark `.wm` (`:72`): Mona Sans 700 (remove Press Start 2P).
8. Bars and meters that used `--accent` (`:154`, `:473`): keep `--accent`; confirm 3:1 against `--card-2` tracks.
9. Do **not** touch view templates, state `S`, or any copy string.

### P1 (about 2 h, only after P0 passes)
1. Tile marquee band (section 2 row 7): CSS-only, our mini UI cards.
2. Terms card (row 9) bound to the existing constants (`P.termDays`, split, fee).
3. "Built for" row (row 10, three cards, no cursor pill).
4. Role rotator and serif-blue words in the closing line (row 11).
5. Footer (row 15). 
6. Real screenshot of our own app as an optional hero showcase (section 4), saved as `assets/showcase-app.webp` (own UI, via CDP screenshot, `screen-nav snap`).

### P2 (only if time remains)
Freckles canvas, bottom progressive blur, side nav, unlock-card tile marquee.

### Compatibility with the PRD alignment plan
- This restyle changes selectors, tokens and markup structure only. The PRD section 6 copy edits are string literals (`landing.html:311,316,369-374,388,400,406-410`; `index.html:299-363,424,447,485`). **Sequence them after P0** or have the same agent do both in order (Q3); if they run in parallel, they will conflict in the same two files.
- Do not rename or delete: landing ids read by JS (`boot pg fold hero-copy hero-bg d-left d-paid d-rep p-* s-lim s-gau stack tilt flow fsteps dia modules track rev spl fin fill marq links`), the app's `S`, view templates, `data-view` hooks.
- `tokens.css` is plain CSS with no build step, so the Vite wrap (alignment D9) can copy it into `web/` unchanged.
- The new Terms card must read split/term/fee from one constant so the 25 to 20% and 30 to 60-day changes propagate without another restyle.

### Verification checklist (headless only; never `hypruse`, `grimblast`, `hyprctl`, `swappy`)

Setup: serve the folder statically (`python3 -m http.server` from `prototype/` in a scratch terminal) or use `file://`. Use `browser-cdp open <url>`; list tabs with `browser-cdp list`. Screenshots with `screen-nav snap brave` (active Brave window) and `screen-nav snap window`. Do not steal focus beyond what `screen-nav` does. Save evidence under the scratchpad directory, not the repo.

1. **Token hygiene**: `rg -i '#7C98FF|#6E8BFF|#4A6BF5|#5B7CFF|#8FB1FF|#9DB2FF|#7E98FF|#5677FA|rgba\((124,152,255|74,107,245|46,91,255|91,124,255)' prototype` returns hits only in `assets/tokens.css`. `rg 'Press Start|pixel-fantasy|accent-2' prototype` returns nothing.
2. **Computed colour**: `browser-cdp eval <tab> "getComputedStyle(document.documentElement).getPropertyValue('--accent')"` returns `#3E68FE` (or the token alias) on both pages; primary button `background-color` is `rgb(62, 104, 254)`; no element has a pink `rgb(254, 61, 112)`.
3. **Contrast script** (scratchpad, python): all text/background pairs in section 1b meet 4.5:1 (body) and 3:1 (non-text); no text token below `#999` on black.
4. **Landing at 1440 px**: snap the hero, bento, accordion, footer; compare structure to the reference by eye against section 2 (nav pill position top 20px, h1 size, 32px card radii, eyebrow letter-spacing). The reference tiles are lazy placeholders in the saved file, so do not pixel-diff those.
5. **Landing at 390 px**: `browser-cdp` may not offer viewport emulation (check its help); if not, load the page inside a 390px-wide `<iframe>` in a scratch HTML file and snap that. No horizontal scroll; nav collapses; bento is one column; h1 does not overflow.
6. **Scroll-scrub still works**: scroll to the flow, modules and closing sections by `browser-cdp eval "scrollTo(0, …)"` and snap three states each; progress bar width changes between top and bottom.
7. **App**: `index.html#/business`, `#/loans`, `#/pay`, `#/activity`, `#/lp`, `#/demo`, and the draw modal at both widths; click "Customer pays" once and confirm the debt bar, the repay slice colour (`--repay` amber) and the fresh-event flash still render, i.e. no functional regression.
8. **Console clean**: `browser-cdp eval` a `window.onerror`/`console.error` hook or read CDP logs; zero errors on both pages (the removed `hero-img` must not throw).
9. **Reduced motion**: emulate `prefers-reduced-motion: reduce` (CDP media emulation if available, else temporarily test the media block by inspection): no animation runs, text visible, marquee static, accordions still open.
10. **Keyboard/focus**: tab through nav, hero CTAs, accordion, modal; each shows the 2px `--blue-400` ring; Esc closes the modal.
11. **Network**: only fonts.googleapis.com / gstatic (Mona Sans, Instrument Serif) leave the page; no reference-site URLs, no third-party scripts.
12. **Honesty copy untouched**: `rg -i 'first|intents|audited|yield'` count unchanged versus before the restyle (this task does not edit claims).

## 6. Handoff prompt (ready to paste)

```
@agent-work:frontend Read /home/cn/Projects/Competition/Web3/NEAR/revvault-rwa/docs/brainstorm/2026-11-08-ui-restyle-backgrounds-supply.md (Status is draft: put Q1-Q3 to Candra first and record his answers in the file's Locked section). Then read prototype/landing.html, prototype/index.html, docs/ui/00-design-direction.md, docs/research/01-design-system.md and CLAUDE.md. Restyle both prototype pages to the reference's look with the pink primary replaced by the blue scale in section 1b. Work in this order and stop after P0 for a verification run: (1) create prototype/assets/tokens.css per section 5A and link it from both files, delete the duplicated :root colour blocks and every old blue literal; (2) landing.html P0 items 1-12; (3) index.html P0 items 1-9; (4) run the verification checklist (headless browser-cdp and screen-nav snap only, never hypruse/grimblast/hyprctl/swappy; evidence goes to the scratchpad, not the repo); (5) only then P1. Rules: no new JS library, no dependency, no Lenis, no third-party embed; every new motion is CSS or one line in the existing rAF frame loop; do not rename or delete any id or function the existing JS reads; do not edit any copy string (the PRD-alignment copy pass will do that after you, see docs/brainstorm/2026-11-08-prd-alignment.md section 6); do not copy any pixel, font, class name or text from the reference file "Backgrounds Supply ｜ Jaw-Dropping Backgrounds… .html" (do not read it whole; section 4 lists what is unsafe); build all imagery from our own UI and CSS; delete assets/pixel-fantasy-bg.webp only after the hero no longer references it; no text below 60% white; contrast floors in section 1b; honour prefers-reduced-motion; mock mode and offline must keep working. Do not git commit or push. Report: files changed, the verification table with pass/fail, screenshots' scratchpad paths, anything cut to P2.
```

- **Agent**: `work:frontend` (alternative `me:frontend`); use `work:creative-dev` only if Candra wants the P2 particle canvas and scroll choreography polished. Candra dispatches; this agent did not.
- **Acceptance criteria**:
  - [ ] Both pages use one `tokens.css`; zero old-blue literals and zero `Press Start 2P` remain
  - [ ] Primary blue is `#3E68FE` with white labels (4.55:1); no text below `#999` equivalent on black; focus ring visible on black and on blue
  - [ ] Landing sections follow the order and proportions in section 2 (nav pill, centered 80px hero, r32 cards with 8% ring, eyebrow style, 3-3 bento grid, accordion style)
  - [ ] Flow diagram, modules track, closing fill, live loan card and the app's draw flow behave exactly as before; console clean
  - [ ] No reference imagery, fonts, class names or copy present; no third-party script
  - [ ] All 12 verification items recorded with evidence

## Out of scope
App re-layout (option C), Lenis or any scroll library, WebGL or Unicorn Studio embeds, a newsletter or email capture, the custom cursor pill, the wall slider, copy or claim edits (PRD alignment pass), the Vite wrap itself, a light theme, Satoshi or Editor's Note, any change to contract or tokenomics behaviour.

## Open questions

1. **Identity break (blocks the start).** The reference look replaces the Pawket-derived identity: the Press Start 2P pixel wordmark, the pixel-art hero and the periwinkle gradient buttons all go, and the wordmark becomes Mona Sans 700 with Instrument Serif italic emphasis. Is that what you want? Recommended: yes (it is what "copy the reference" implies, and it removes the unlicensed-looking hero image). The alternative is to keep the pixel wordmark as a brand quirk on a black, blue-accent page.
2. **Black everywhere or only on the landing?** The reference is pure black with `#040611` cards. Recommended: landing and app both black (`--page #000`, `--card #040611`) for one coherent product; the cost is that dense app panels lose the charcoal softness and the builder must check the app at 390px. Alternative: landing black, app keeps charcoal `#10131A` and only gets the blue tokens, nav pill and buttons.
3. **Sequencing with the PRD copy pass and the Vite wrap.** Recommended: restyle P0 in `prototype/` first (Sun/Mon), then the section 6 copy pass, then the Vite wrap copies the result. Alternative: one agent does restyle and copy together (saves merge pain, serial work for one agent), or restyle directly inside `web/` after the wrap (no throwaway work, but the wrap loses its prototype baseline). Which one?

## Tooling
- **Installed and sufficient**: `browser-cdp`, `screen-nav` (headless capture), `work:frontend`, `work:frontend:slicer` (can measure our own screenshots), and the skills `pixel-perfect-replication`, `visual-redesign`, `design-review:design-review` for an end-of-day audit. No gap that justifies installing anything.
- **Recommended, not installed**: none. No new skill, MCP server or package is needed (CSS-only plan, no dependency).
- **Needs the user**: answers to Q1-Q3; confirmation that Instrument Serif's license is OFL on Google Fonts (builder checks; I could not retrieve its page).

## Evidence

Read on 2026-11-08.
- Local, reference (all values measured from a data-URI-stripped copy in the session scratchpad, original untouched): `:root`-level inline properties `--hv-pink:#FE3D70`, `--hv-bg:#000`; rules for `.nav`, `.navWrap`, `.btn*`, `.eyebrow`, `.h1/.h2`, `.bento`, `.card`, `.colCard`, `.faq*`, `.unlock`, `.news*`, `.footer`, `.marquee/.track`, keyframes `hv-marquee`, `hv-banner`, `hv-roles`, reduced-motion block; section ids `hero problems scroll1 usecases pricing collections scroll2 faq` (unlock and newsletter sections follow); font-face list (geist, editorsNote, outfit, inter embedded; Satoshi named only); asset counts (199 AVIF, 5 PNG, 2 WebP, 2 SVG); every `<script>` body empty (SingleFile); `html.lenis`; 3 Unicorn Studio scenes (hero, pricing card canvas, footer tail).
- Local, project: `docs/ui/00-design-direction.md`, `docs/research/01-design-system.md` (token table, literals, Press Start usage, single image asset), `prototype/landing.html:13-21,25-60,119-128,289-290,295-420`, `prototype/index.html:12-20,36-44,62-72,186,209,246`, `docs/brainstorm/2026-11-08-prd-alignment.md` (sections 5, 6, 8, D9), `CLAUDE.md`.
- External (secondary sources, medium confidence): Pangram Pangram trial fonts personal-use only, commercial use paid, no direct modification ([licenseorg.com](https://licenseorg.com/guide/fonts/pangram-pangram), [pangrampangram.com/pages/eula](https://pangrampangram.com/pages/eula)); Satoshi free for commercial use via Fontshare, self-hosting fine, public re-hosting needs consent ([wiki.adom.inc licenses note](https://wiki.adom.inc/api/pages/adom/adom-theme/files/fonts/LICENSES.md), [fontalternatives.com](https://fontalternatives.com/fonts/satoshi/)); Unicorn Studio plans Free/Legend, watermark policy not confirmed ([unicorn.studio/docs/pricing](https://www.unicorn.studio/docs/pricing/)).
- Not verified: Instrument Serif license text; whether `browser-cdp` supports viewport and media emulation; the live (unstripped) behaviour of the reference's scripts; whether `pixel-fantasy-bg.webp` has a usable license.

Assumptions (not evidence): effort estimates are guesses against a 2,000-line pair of single-file prototypes; the claim that the app restyle carries "80% of the feel" is an opinion; Mona Sans at weight 400 is "close enough" to Satoshi is a visual judgement, not measured. **Riskiest assumption: that the scroll-scrubbed landing JS survives the hero and card restructure unchanged**, which is why P0 ends with a mandatory verification run before P1. A `party-mode` red team was not run (sub-agent); a single-pass attack found the pink-hover contrast failure (fixed: darker hover), the 40% white text failure (floor rule), the cursor-hiding a11y hazard (dropped), and the unlicensed hero image (removed).
