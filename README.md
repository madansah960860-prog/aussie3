# ANTIPODE

A static fashion e-commerce storefront for the Australian market — womenswear and
menswear treated as equal departments across nine categories, with 63 real products,
Australian sizing, AUD pricing inclusive of GST, and a working bag, checkout and
account.

No build step, no framework, no server. Nine HTML pages, three CSS files, ten JS
files and a folder of images.

---

## Running it

Open `index.html`. That is the whole instruction — the site runs from the filesystem
because the catalogue is served as a `<script>` rather than fetched as JSON, and
nothing anywhere makes a network request.

If you would rather serve it over HTTP (recommended, since it is closer to production
and makes `history.pushState` on the shop page behave normally):

```bash
python -m http.server 8000
# then open http://127.0.0.1:8000
```

---

## Pages

| File | What it does |
|---|---|
| `index.html` | Home — drenched hero band, new-in rail, department split, category index, fine-watch feature, sale rail, journal teaser |
| `shop.html` | Listing with faceted filters (department, category, size, price, colour, label, availability), six sort orders, URL-synced state, load-more |
| `product.html` | Product detail via `?id=` — gallery, AU size selector with per-size stock, delivery estimator, spec, reviews, related rails |
| `cart.html` | Bag — quantity steppers, save-for-later, promotion codes, free-delivery progress, postcode estimate |
| `checkout.html` | Contact → delivery → payment, with AU address validation and an order confirmation |
| `wishlist.html` | Saved pieces |
| `account.html` | Orders with tracking timeline, saved addresses, size preferences |
| `journal.html` | Editorial index and article view via `?a=` |
| `about.html` | Story, delivery times by state, returns and ACL rights, full AU size guide, contact, privacy, terms |

---

## What is Australian about it

This is the part that was specified, so it is the part that is actually built out
rather than gestured at:

- **Prices in AUD, GST inclusive.** GST is extracted from the total (`total − total ÷ 1.1`),
  not added to it, which is how Australian retail displays price. Every summary states
  the GST component.
- **AU sizing throughout**, and always labelled as such — `AU 10`, `AU 9`, never a bare
  number, because AU/US/EU differ and women's shoes are a two-size gap from US.
  `about.html#sizing` carries full conversion tables.
- **Postcode → state → delivery window.** A real postcode-range table maps all eight
  states and territories, distinguishes capital-city metro from regional, and produces
  business-day windows from a Sydney distribution centre. It runs on the product page,
  in the bag and at checkout.
- **Checkout validates the postcode against the chosen state** and says which state the
  postcode actually belongs to when they disagree.
- **Free standard delivery over A$150**, express, and click-and-collect from three counters.
- **Pay in four** interest-free instalments shown wherever the total qualifies.
- **30-day returns**, with the Australian Consumer Law guarantees stated as additional
  to the policy rather than replaced by it.
- ABN, registered address and "prices include GST" in the footer of every page.

Working promotion codes: `SOUTHERLY10` (10% off), `WELCOME25` (A$25 off orders over
A$120), `FREIGHT` (free standard delivery).

---

## Where the inventory came from

The user asked for inventory downloaded from the internet, so it is real downloaded
data rather than invented rows:

- **[dummyjson.com](https://dummyjson.com/products)** — 49 items across ten fashion
  categories.
- **[fakestoreapi.com](https://fakestoreapi.com/products)** — 14 clothing and jewellery
  items, which add the outerwear the first feed lacks.

All 186 product images were downloaded and are served locally from
`assets/img/products/` (15 MB). The site makes no third-party requests at all —
the Archivo and Newsreader webfonts are self-hosted too.

**What was done to that data.** The source titles are machine-generated
("Man Short Sleeve Shirt", "Dress Pea") and their metadata frequently does not match
the photograph. Every one of the 63 items was given a real product name, a label, a
category, material and fit copy, AU sizing with per-size stock, and AUD pricing.
Every colour was then checked against its actual photograph and corrected —
about a third of them were wrong, and colour is a filter facet here, so that mattered.
Reviews are written locally with Australian names and places rather than using the
source feed's "Very dissatisfied!" filler.

**Honesty about the fiction.** Prices are illustrative conversions, not real offers.
Brand names that came with the source photography are kept (Nike, Puma, Rolex, IWC,
Longines, Prada, Marni, Calvin Klein, John Hardy, Fjällräven); the other eight labels
— Ostro, Kester, Halden, Marlowe & Vale, Ninth Parallel, Verity Rowe, Clarke Street,
Bellamy — are invented for this store, as is Antipode itself. No order is real, no
payment is taken, and `about.html#terms` says so on the page rather than only here.

---

## Structure

```
index.html  shop.html  product.html  cart.html  checkout.html
wishlist.html  account.html  journal.html  about.html
favicon.ico

assets/
  css/tokens.css     design tokens, reset, base type   (see DESIGN.md)
  css/site.css       every component
  css/fonts.css      self-hosted @font-face
  fonts/             Archivo + Newsreader woff2 (622 KB)
  img/products/      186 product photographs
  js/catalog.js      generated catalogue  (window.ANTIPODE_CATALOG)
  js/store.js        core: state, money, bag, header, drawer, toasts, renderers
  js/shared.js       chrome shared by every page
  js/home.js  shop.js  product.js  cart.js  checkout.js  wishlist.js  account.js
  js/journal.js  journal-data.js

data/catalog.json    the same catalogue as readable JSON, for reference
tools/               scripts that regenerate the above (see below)

PRODUCT.md           who this is for, brand personality, design principles
DESIGN.md            the visual system: tokens, type, spacing, components, motion
```

State lives in `localStorage` under `antipode.*` — bag, wishlist, recently viewed,
orders, addresses, preferences and any applied promotion code. Nothing leaves the
browser. The account page has a button to clear all of it.

---

## Regenerating

Requires Node 18+ and a network connection (except `make-pages.mjs`).

```bash
node tools/build-catalog.mjs   # raw feeds -> assets/js/catalog.js + data/catalog.json
node tools/fetch-images.mjs    # downloads any missing product images (resumable)
node tools/fetch-fonts.mjs     # re-downloads and self-hosts the webfonts
node tools/make-pages.mjs      # re-stamps the pages from index.html's chrome
```

`tools/raw/` holds the original API responses, so the catalogue rebuilds identically
offline. The generator is deterministic — stock levels, ratings and which items are
new or on sale are seeded from the product id, so a rebuild never reshuffles the store.

`make-pages.mjs` exists because this is a static site with no templating: it copies the
header, footer, nav sheet and bag drawer out of `index.html` into the other pages so
the chrome cannot drift. **Edit `index.html` and re-run it**, rather than editing the
chrome in nine places. Everything else is hand-edited normally; the page bodies live in
the generator, and `about.html`'s body is `tools/about-main.html`.

---

## Design decisions worth knowing

The full rationale is in `DESIGN.md` and `PRODUCT.md`. The short version:

- **Pure white shopping surfaces.** Both source feeds ship cut-out photography on
  white. On a white page the garment bleeds into the surface with no visible frame; on
  a cream or tinted page every product would sit in a faint white rectangle. This is
  also why product cells use `object-fit: contain` on `--paper` and take no border or
  shadow — the hover affordance is a crossfade to the second photograph instead.
- **Colour is committed, not sprinkled.** Brand colour arrives at full strength in
  drenched steel bands (hero, watch feature, journal headers, footer), and stays out of
  the grid entirely so nothing competes with the clothes. Brass is the only accent.
- **Motion is a render-time stagger, never a scroll-gated reveal.** A reveal that hides
  content until an IntersectionObserver fires ships a blank section in any context
  where the observer does not run — a background tab, a print, a headless render. The
  list entrance plays once, immediately, and is inside a
  `prefers-reduced-motion: no-preference` query so it is a complete no-op for anyone
  who has asked for less movement.
- **The mega menu is pure CSS.** It opens on `:hover` and on `:focus-within`, so it is
  fully keyboard operable and cannot break if scripting fails. Its column titles are
  paragraphs, not headings — they render into the sticky header, so `<h3>`s there would
  put three h3s ahead of every page's `<h1>` in the heading outline.

### Accessibility

WCAG 2.2 AA is the floor. Audited across all nine pages: no contrast failures, no
control without an accessible name, no heading-level jumps, one `<h1>` per page, no
horizontal overflow at 375px. Focus rings are never removed and are legible on both the
white and the steel grounds. Sold-out sizes stay visible and struck through rather than
disappearing. Every state colour is paired with a text label, so nothing is carried by
colour alone.

### Known limitations

- Product, cart, account and journal pages render their main content with JavaScript.
  With JS disabled you get the header, footer and navigation but no catalogue. For a
  real storefront this content would be server-rendered.
- Order tracking advances on a clock rather than from a real fulfilment feed.
- Browsers still request `/favicon.ico` before reading the SVG icon, so a 32×32 `.ico`
  is included alongside it.
