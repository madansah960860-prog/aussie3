# Product

## Register

brand

## Users

Australian shoppers, roughly 25–45, buying for themselves across both womenswear and
menswear. The dominant context is a phone held at arm's length on a couch after 8pm, in
a warm-lit room where the screen is the brightest object present. The secondary context
is a desktop browser at work, mid-afternoon, in a bright open-plan office. Both are
*considered* browsing sessions, not panic buys: the shopper is comparing two or three
things they already half-want and is looking for the one fact that decides it — will it
arrive before the weekend, does it come in their size, what is it actually made of.

The job to be done: **decide, with confidence, without leaving the page.** Everything a
shopper needs to commit — real size availability, the landed AUD price including GST,
the delivery estimate to their state, the returns terms — belongs on the surface they
are already looking at.

## Product Purpose

ANTIPODE is a multi-brand Australian fashion retailer. It carries a curated house line
alongside outside labels across nine categories: shirts, tops, outerwear, dresses,
shoes, bags, jewellery, watches and eyewear. Womenswear and menswear are equal citizens —
neither is a sub-section of the other, and the shared categories (shoes, watches,
jewellery, eyewear) are browsable across both.

Success looks like: a shopper lands from a category link, filters to their size in two
taps, opens one product, and adds to bag without ever asking a question the page could
have answered.

## Brand Personality

**Precise, southern, unhurried.**

Voice is plain and specific. It names materials, gives measurements, quotes delivery
windows in days. It never says "elevate your wardrobe", never says "curated edit" as a
substitute for saying what's in the edit, never uses an exclamation mark. Where the
brand has personality it comes out in restraint and in weather — ANTIPODE is named for
being on the far side of the world, and the visual language borrows from Southern Ocean
instruments: steel, brass, cold fronts, charts.

Emotional goal: **composure.** The shopper should feel the store is well-run.

## Anti-references

- **The luxury-fashion AI default**: cream/parchment body background, Playfair-or-Didone
  display serif, tiny tracked uppercase eyebrow above every section, endless identical
  card grids. This is the single most likely failure mode for this category and is
  rejected outright.
- **The tourist Australia**: kangaroos, boomerangs, "sun-drenched", ochre-and-eucalyptus
  earth tones, surf. Australian-ness here is meteorological and geographic, not iconographic.
- **Fast-fashion urgency theatre**: countdown timers, "17 people are viewing this",
  spinning discount wheels, exit-intent modals.
- **Dark-mode-for-cool**: this catalogue's photography sits on white; a dark shell would
  turn every product into a glowing rectangle.

## Design Principles

1. **The product photograph is the page.** Chrome recedes; white surfaces let cut-out
   photography bleed into the page rather than sit in a bordered box.
2. **Answer the deciding question in place.** Size availability, GST-inclusive price,
   state-level delivery estimate and returns terms appear on the surface where the
   decision is made, not one click away.
3. **Colour is committed, not sprinkled.** Brand colour arrives in full-strength drenched
   bands; the shopping surfaces stay neutral so nothing competes with the garments.
4. **Both genders, one architecture.** Women's and men's use the same components, the
   same filters and the same URL grammar. Neither is the default.
5. **Nothing moves that isn't saying something.** Motion marks arrival and state change
   only, and every animation has a reduced-motion equivalent.

## Accessibility & Inclusion

WCAG 2.2 AA is the floor, and it is a hard floor:

- Body text ≥ 4.5:1, large text ≥ 3:1, UI borders and focus rings ≥ 3:1. Placeholder
  text is held to the body-text ratio, not the muted default.
- Every interactive target ≥ 44×44 CSS px with ≥ 8px separation.
- Full keyboard operation with a visible, non-suppressed focus ring; skip link to main;
  focus trapped and restored for the bag drawer, filter sheet and any dialog.
- No information carried by colour alone — sale prices, stock states and errors each
  carry a text label as well as a colour.
- `prefers-reduced-motion: reduce` disables all transform and reveal animation.
- Sizes are labelled with the AU convention explicitly ("AU 10", "AU 9") rather than a
  bare number, because AU/US/EU sizing differs.
