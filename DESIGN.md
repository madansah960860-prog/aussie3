# Design

Visual system for **ANTIPODE** — a multi-brand Australian fashion retailer.
Source of truth for tokens. Implementation lives in `assets/css/tokens.css`.

## Overview

**Strategy: restrained in product, committed in brand.**

The shopping surfaces (grid, product page, bag, checkout) are pure white with a near-black
steel ink. The catalogue is cut-out photography on white, so a white page lets garments
bleed into the surface instead of sitting in a bordered box — the photograph becomes the
page. Brand colour is not sprinkled across these surfaces; it arrives in full strength as
**drenched steel bands** (hero, category dividers, footer, campaign blocks) where no
product photography competes with it.

The one accent is **brass**. It appears on the steel bands as rules, small caps and link
underlines, and on white only as the was-price strike, the focus ring and the wishlist
mark. Never as a gradient, never as filled decoration.

Named for the far side of the world. The reference is a Southern Ocean instrument —
oxidised steel and patinated brass, a barometer in a chart room — not the tourist
Australia of ochre and eucalyptus.

## Color

OKLCH is the source of truth. Hex values are documentation only.

### Neutrals — shopping surfaces

| Token | OKLCH | Approx hex | Use |
|---|---|---|---|
| `--paper` | `oklch(1 0 0)` | `#FFFFFF` | Body background. Literally pure white, no hidden warmth. |
| `--surface` | `oklch(0.971 0.005 232)` | `#F4F7F9` | Rails, table stripes, disabled fills |
| `--surface-2` | `oklch(0.938 0.008 232)` | `#E9EEF2` | Image mat, skeletons, hover fill |
| `--line` | `oklch(0.885 0.010 232)` | `#D8E0E6` | Hairline dividers (decorative) |
| `--line-strong` | `oklch(0.720 0.018 232)` | `#A4B0BA` | Input borders — clears 3:1 vs paper |

### Ink

| Token | OKLCH | Approx hex | Contrast on paper | Use |
|---|---|---|---|---|
| `--ink` | `oklch(0.205 0.021 236)` | `#13202A` | 16.1:1 | Headings, body, prices |
| `--ink-2` | `oklch(0.435 0.024 236)` | `#4A5A66` | 6.9:1 | Secondary copy, labels |
| `--ink-3` | `oklch(0.530 0.022 236)` | `#65737E` | 5.0:1 | Meta, placeholders — floor, never lighter |

`--ink-3` is the lightest text permitted anywhere, including placeholders. Muted grey body
text on a tinted near-white is the most common contrast failure in this category, and this
system deliberately has no token for it. Its value is set so that it clears 4.5:1 against
`--surface` as well as against `--paper`, because meta text appears on both.

### Brand — steel

| Token | OKLCH | Approx hex | Use |
|---|---|---|---|
| `--steel` | `oklch(0.404 0.072 232)` | `#22505F` | Primary buttons, links on white (7.6:1) |
| `--steel-deep` | `oklch(0.276 0.052 236)` | `#12303C` | Drenched band background |
| `--steel-ink` | `oklch(0.222 0.040 238)` | `#0E2430` | Footer, deepest band |
| `--on-dark` | `oklch(0.970 0.005 232)` | `#F3F7F9` | Text on steel (13.9:1 on steel-deep) |
| `--on-dark-2` | `oklch(0.800 0.015 232)` | `#B7C4CC` | Secondary text on steel (7.6:1) |

Chroma on the neutrals is 0.005–0.018 and tilts toward the brand hue (232 degrees), never
toward warm-by-default.

### Accent — brass, and states

| Token | OKLCH | Approx hex | Use |
|---|---|---|---|
| `--brass` | `oklch(0.735 0.118 74)` | `#C9924A` | Accent on steel bands only |
| `--brass-deep` | `oklch(0.545 0.105 66)` | `#8A5F2A` | Brass as text on white (5.2:1) |
| `--focus` | `oklch(0.620 0.160 62)` | `#B0701C` | Focus ring — legible on paper and on steel |
| `--sale` | `oklch(0.505 0.185 25)` | `#B4232A` | Sale price (6.4:1) |
| `--success` | `oklch(0.500 0.100 155)` | `#2C7A55` | In stock, order confirmed |
| `--warn` | `oklch(0.520 0.120 55)` | `#8A5520` | Low stock |

Every state colour is paired with a text label. "Low stock" is never the amber dot alone;
sale is never the red price alone.

## Typography

Two families on a genuine contrast axis — grotesque against serif. No two-sans pairing.

**Archivo** (variable `wdth` 62–125, `wght` 100–900) — everything structural: navigation,
headings, product names, prices, buttons, forms. Display sizes run wide (`wdth` 110) and
tight (`-0.03em`); UI runs normal width.

**Newsreader** (variable `opsz`, italic) — editorial only: campaign lines, journal prose,
pull quotes, the one-line note under a section heading. Its italic carries the brand voice;
it never sets a button or a label.

Letter-spacing floor is `-0.03em`. Display clamp ceiling is 5.5rem (88px).

| Role | Family | Size | Line height | Tracking |
|---|---|---|---|---|
| `--t-display` | Archivo 700, wdth 110 | `clamp(2.75rem, 1.6rem + 5.2vw, 5.5rem)` | 0.94 | -0.03em |
| `--t-h1` | Archivo 600, wdth 105 | `clamp(2rem, 1.3rem + 3.2vw, 3.5rem)` | 1.02 | -0.025em |
| `--t-h2` | Archivo 600 | `clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem)` | 1.1 | -0.02em |
| `--t-h3` | Archivo 600 | `clamp(1.125rem, 1rem + 0.6vw, 1.4rem)` | 1.2 | -0.01em |
| `--t-body` | Archivo 400 | `1rem` | 1.6 | 0 |
| `--t-small` | Archivo 400 | `0.875rem` | 1.5 | 0 |
| `--t-micro` | Archivo 500 | `0.8125rem` (13px) | 1.4 | 0.02em |
| `--t-editorial` | Newsreader 300 italic | `clamp(1.25rem, 1rem + 1.1vw, 1.875rem)` | 1.4 | 0 |

Prose caps at 68ch. `text-wrap: balance` on h1–h3, `pretty` on paragraphs.
Prices use `font-variant-numeric: tabular-nums` so grid columns align.

## Spacing & Layout

8px base, standard density.

`--s-1: 4px` · `--s-2: 8px` · `--s-3: 12px` · `--s-4: 16px` · `--s-5: 24px` · `--s-6: 32px`
· `--s-7: 48px` · `--s-8: 64px` · `--s-9: 96px` · `--s-10: 128px`

- Page gutter: `clamp(16px, 4vw, 48px)`; max content width 1440px, prose 68ch.
- Product grid: `repeat(auto-fill, minmax(230px, 1fr))` — 2 up at 375px, 3 at 768px,
  4 at 1200px, 5 above 1600px.
- Product image cells are a fixed 4:5 box with `object-fit: contain` on `--paper`, so the
  grid never shifts as images load (CLS budget 0). The cell ground must stay pure white:
  both source feeds ship cut-outs on white at differing aspect ratios, so any tinted cell
  would reveal a visible white rectangle around the photograph.
- Flex for one-dimensional rows; Grid only where both axes matter.
- Radii: `--r-1: 2px` on controls and inputs, `0` on product imagery, `999px` on filter
  chips only. Nothing else is rounded.

### z-index scale

`--z-dropdown: 100` · `--z-sticky: 200` · `--z-backdrop: 300` · `--z-drawer: 400`
· `--z-toast: 500` · `--z-tooltip: 600`

No arbitrary values.

## Components

- **Header** — sticky, paper background, hairline base. Women / Men / Categories / Journal,
  plus search, wishlist and bag with live counts. Collapses to a full-screen sheet below
  900px.
- **Steel band** — the drenched hero and section dividers. `--steel-deep` ground, `--on-dark`
  type, a single 1px `--brass` rule, Newsreader italic for the campaign line.
- **Product card** — 4:5 contained image on `--paper`, brand in `--t-micro`, name in
  Archivo 500, price tabular. Hover and `:focus-within` crossfade to the second photograph;
  the quick-size row and wishlist mark fade in with it, and on touch they are always
  present. No card border, no shadow, no nesting.
- **Filter rail** — persistent left column at 1024px and up, bottom sheet below. Every
  filter writes to the URL query so a filtered view is linkable and survives reload.
- **PDP gallery** — sticky column of stacked images on desktop, swipe rail with dot
  indicators on mobile.
- **Size selector** — 44×44 minimum tiles; sold-out sizes stay visible, struck through and
  `aria-disabled`, never removed.
- **Bag drawer** — right-side `<dialog>`, focus trapped and restored, Escape closes.
- **Delivery estimator** — postcode to state to business-day window, on both PDP and cart.
- **Footer** — `--steel-ink` ground, ABN, GST statement, Australian Consumer Law returns line.

## Motion

Marks arrival and state change. Nothing decorative.

- `--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1)` — default
- `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` — drawers and sheets
- Durations: `--d-1 120ms` (hover, press) · `--d-2 200ms` (state) · `--d-3 320ms`
  (entrance) · `--d-4 420ms` (drawer)
- Product grids stagger on first paint at 40ms per item, capped at 12 items.
- No bounce, no elastic, no spring overshoot anywhere.
- **Reveal safety**: content ships visible. The pre-animation hidden state is applied by
  script only after confirming IntersectionObserver support and no reduced-motion
  preference, so a headless render or a background tab never ships a blank section.
- `@media (prefers-reduced-motion: reduce)` collapses every transition and animation to
  1ms or less and turns drawers into instant swaps.

## Imagery

Cut-out product photography on white, contained (never cropped) in a 4:5 box on `--paper`.
Because the cell ground matches the photograph's own ground, the garment appears to sit
directly on the page with no visible frame — the reason this system commits to pure white
rather than a tinted near-white. Grid cards therefore take no border and no shadow; card
separation comes from spacing and from the text block alone, and the hover affordance is a
crossfade to the product's second photograph rather than a background tint.
Every image carries `width`/`height`, `loading="lazy"` below the fold,
`decoding="async"`, and descriptive alt text naming brand, product and colour. The first
grid images and the PDP hero are eager with `fetchpriority="high"`.

## Accessibility

Delivers the WCAG 2.2 AA floor set in PRODUCT.md.

- Contrast ratios are stated per token above; `--ink-3` is the lightest permitted text.
- Focus: 2px `--focus` ring at 2px offset, never removed, visible on both grounds.
- Targets: 44×44 minimum, 8px separation.
- Skip link to `#main`; one `<h1>` per page; landmarks throughout.
- Live regions announce bag count changes, filter result counts and form errors.
- Sizes are labelled with the AU convention ("AU 10"), never a bare number.
