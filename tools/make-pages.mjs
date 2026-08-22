/* Stamps the remaining static pages using index.html as the canonical chrome,
   so the header, footer, nav sheet and bag drawer stay byte-identical sitewide.
   Output is plain static HTML — edit the generated files directly from here on. */

import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const PROJECT = path.resolve(HERE, '..');

const index = fs.readFileSync(path.join(PROJECT, 'index.html'), 'utf8');

const headOpen = index.indexOf('<head>');
const headClose = index.indexOf('</head>');
const bodyOpen = index.indexOf('<body>');
const mainOpen = index.indexOf('<main');
const mainClose = index.lastIndexOf('</main>') + '</main>'.length;
const bodyClose = index.indexOf('</body>');

const HEAD = index.slice(headOpen + 6, headClose);
const TOP = index.slice(bodyOpen + 6, mainOpen);
let BOTTOM = index.slice(mainClose, bodyClose);
BOTTOM = BOTTOM.replace(/\s*<script src="assets\/js\/(journal-data|store|shared|home)\.js"><\/script>/g, '');

function page({ file, title, desc, main, scripts, bodyClass }) {
  const head = HEAD
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[\s\S]*?">/, `<meta name="description" content="${desc}">`);

  const html = `<!DOCTYPE html>
<html lang="en-AU">
<head>${head}</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
${TOP.trimEnd()}

${main}
${BOTTOM.trimEnd()}

${scripts.map((s) => `<script src="assets/js/${s}"></script>`).join('\n')}
</body>
</html>
`;
  fs.writeFileSync(path.join(PROJECT, file), html);
  console.log('wrote', file, (html.length / 1024).toFixed(1) + ' KB');
}

/* ========================================================================== */

page({
  file: 'product.html',
  title: 'Product — ANTIPODE',
  desc: 'Product detail with Australian sizing, live stock by size, GST-inclusive pricing and a delivery estimate to your postcode.',
  scripts: ['catalog.js', 'store.js', 'shared.js', 'product.js'],
  main: `<main id="main" class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb" data-crumbs></nav>
  <div data-pdp>
    <p class="meta" style="padding-block:var(--s-8)">Loading product…</p>
  </div>
</main>`,
});

/* ========================================================================== */

page({
  file: 'cart.html',
  title: 'Your bag — ANTIPODE',
  desc: 'Review your bag. Australian delivery, GST-inclusive totals and interest-free instalments calculated before you check out.',
  scripts: ['catalog.js', 'store.js', 'shared.js', 'cart.js'],
  main: `<main id="main" class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb">
    <a href="index.html">Home</a><span class="sep" aria-hidden="true">/</span>
    <span aria-current="page">Bag</span>
  </nav>

  <h1 class="mt-4">Your bag</h1>

  <div class="cart-layout mt-6" data-cart hidden>
    <div>
      <div data-lines></div>
      <p class="micro meta mt-5">
        Prices include GST. Items are held in your bag on this device only and are not reserved
        until checkout is complete.
      </p>
    </div>

    <aside class="cart-aside">
      <div class="summary" data-summary></div>

      <form class="promo mt-4" data-promo>
        <label for="promo-code">Promotion code</label>
        <div class="promo-row">
          <input id="promo-code" name="code" type="text" placeholder="e.g. SOUTHERLY10" autocomplete="off" spellcheck="false">
          <button type="submit" class="btn btn-secondary">Apply</button>
        </div>
        <p class="promo-msg" data-promo-msg role="status" aria-live="polite"></p>
      </form>

      <div class="estimator mt-4">
        <h2 class="micro" style="text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-2)">Delivery estimate</h2>
        <div class="estimator-row mt-3">
          <div class="field">
            <label for="cart-post">Postcode</label>
            <input id="cart-post" type="text" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="2010" autocomplete="postal-code">
          </div>
          <button type="button" class="btn btn-secondary" data-estimate>Check</button>
        </div>
        <p class="estimator-out" data-estimate-out role="status" aria-live="polite"></p>
      </div>
    </aside>
  </div>

  <div class="empty" data-empty hidden>
    <h2>Your bag is empty</h2>
    <p>Nothing in here yet. New arrivals land most weeks, and the sale is worth a look.</p>
    <div class="flex gap-3 wrapf" style="justify-content:center">
      <a class="btn btn-primary" href="shop.html?sort=newest">Shop new in</a>
      <a class="btn btn-secondary" href="shop.html?sale=1">Shop sale</a>
    </div>
  </div>

  <section class="section" data-also hidden>
    <div class="section-head">
      <div class="lead"><h2>You might also like</h2></div>
    </div>
    <div class="grid-products" data-also-grid></div>
  </section>
</main>`,
});

/* ========================================================================== */

page({
  file: 'checkout.html',
  title: 'Checkout — ANTIPODE',
  desc: 'Secure checkout with Australian delivery addresses, click and collect, express post and interest-free instalments. All prices in AUD including GST.',
  scripts: ['catalog.js', 'store.js', 'shared.js', 'checkout.js'],
  main: `<main id="main" class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb">
    <a href="index.html">Home</a><span class="sep" aria-hidden="true">/</span>
    <a href="cart.html">Bag</a><span class="sep" aria-hidden="true">/</span>
    <span aria-current="page">Checkout</span>
  </nav>

  <div data-checkout hidden>
    <h1 class="mt-4">Checkout</h1>

    <ol class="steps mt-5" data-steps>
      <li data-n="1" aria-current="step">Contact</li>
      <li data-n="2">Delivery</li>
      <li data-n="3">Payment</li>
    </ol>

    <div class="checkout-layout">
      <form id="checkout-form" novalidate>

        <!-- ---- contact ---- -->
        <fieldset class="block">
          <legend><h2>Contact</h2></legend>
          <div class="field mt-4">
            <label for="email">Email address</label>
            <input id="email" name="email" type="email" autocomplete="email" required
                   aria-describedby="email-hint email-err">
            <p class="hint" id="email-hint">Your order confirmation and tracking go here.</p>
            <p class="err" id="email-err">Enter an email address, like you@example.com.</p>
          </div>
          <div class="field mt-4">
            <label for="phone">Mobile number</label>
            <input id="phone" name="phone" type="tel" autocomplete="tel-national" inputmode="tel"
                   placeholder="04XX XXX XXX" aria-describedby="phone-hint phone-err">
            <p class="hint" id="phone-hint">Optional. Australia Post texts you on the delivery day.</p>
            <p class="err" id="phone-err">Enter an Australian mobile number, like 0412 345 678.</p>
          </div>
        </fieldset>

        <!-- ---- delivery method ---- -->
        <fieldset class="block">
          <legend><h2>Delivery</h2></legend>
          <div class="methods mt-4" data-methods role="radiogroup" aria-label="Delivery method"></div>
        </fieldset>

        <!-- ---- address ---- -->
        <fieldset class="block" data-address-block>
          <legend><h2>Delivery address</h2></legend>

          <div data-saved-addresses class="mt-4" hidden></div>

          <div class="row2 mt-4">
            <div class="field">
              <label for="first">First name</label>
              <input id="first" name="first" type="text" autocomplete="given-name" required aria-describedby="first-err">
              <p class="err" id="first-err">Enter a first name.</p>
            </div>
            <div class="field">
              <label for="last">Last name</label>
              <input id="last" name="last" type="text" autocomplete="family-name" required aria-describedby="last-err">
              <p class="err" id="last-err">Enter a last name.</p>
            </div>
          </div>

          <div class="field mt-4">
            <label for="street">Street address</label>
            <input id="street" name="street" type="text" autocomplete="address-line1" required
                   placeholder="118 Kippax Street" aria-describedby="street-err">
            <p class="err" id="street-err">Enter a street address.</p>
          </div>

          <div class="field mt-4">
            <label for="street2">Apartment, unit or level</label>
            <input id="street2" name="street2" type="text" autocomplete="address-line2">
            <p class="hint">Optional.</p>
          </div>

          <div class="row3 mt-4">
            <div class="field">
              <label for="suburb">Suburb</label>
              <input id="suburb" name="suburb" type="text" autocomplete="address-level2" required aria-describedby="suburb-err">
              <p class="err" id="suburb-err">Enter a suburb.</p>
            </div>
            <div class="field">
              <label for="state">State</label>
              <select id="state" name="state" autocomplete="address-level1" required aria-describedby="state-err">
                <option value="">Select</option>
                <option value="ACT">ACT</option>
                <option value="NSW">NSW</option>
                <option value="NT">NT</option>
                <option value="QLD">QLD</option>
                <option value="SA">SA</option>
                <option value="TAS">TAS</option>
                <option value="VIC">VIC</option>
                <option value="WA">WA</option>
              </select>
              <p class="err" id="state-err">Select a state.</p>
            </div>
            <div class="field">
              <label for="postcode">Postcode</label>
              <input id="postcode" name="postcode" type="text" inputmode="numeric" maxlength="4"
                     autocomplete="postal-code" required aria-describedby="postcode-hint postcode-err">
              <p class="hint" id="postcode-hint">Four digits.</p>
              <p class="err" id="postcode-err">Enter a valid four-digit Australian postcode.</p>
            </div>
          </div>

          <p class="estimator-out mt-3" data-eta role="status" aria-live="polite"></p>

          <label class="check mt-4">
            <input type="checkbox" id="save-address" checked>
            <span>Save this address for next time</span>
          </label>
        </fieldset>

        <!-- ---- collect ---- -->
        <fieldset class="block" data-collect-block hidden>
          <legend><h2>Collection point</h2></legend>
          <div class="methods mt-4" data-stores role="radiogroup" aria-label="Collection store"></div>
        </fieldset>

        <!-- ---- payment ---- -->
        <fieldset class="block">
          <legend><h2>Payment</h2></legend>
          <p class="hint mt-2">
            This is a demonstration storefront. No payment is taken and no card details are
            transmitted or stored — enter anything you like.
          </p>

          <div class="methods mt-4" data-paytypes role="radiogroup" aria-label="Payment method"></div>

          <div data-card-fields>
            <div class="field mt-4">
              <label for="card">Card number</label>
              <input id="card" name="card" type="text" inputmode="numeric" autocomplete="cc-number"
                     placeholder="4242 4242 4242 4242" maxlength="19" aria-describedby="card-err">
              <p class="err" id="card-err">Enter a card number of at least 13 digits.</p>
            </div>
            <div class="row3 mt-4">
              <div class="field">
                <label for="cardname">Name on card</label>
                <input id="cardname" name="cardname" type="text" autocomplete="cc-name" aria-describedby="cardname-err">
                <p class="err" id="cardname-err">Enter the name on the card.</p>
              </div>
              <div class="field">
                <label for="expiry">Expiry</label>
                <input id="expiry" name="expiry" type="text" inputmode="numeric" autocomplete="cc-exp"
                       placeholder="MM/YY" maxlength="5" aria-describedby="expiry-err">
                <p class="err" id="expiry-err">Use MM/YY, and a date in the future.</p>
              </div>
              <div class="field">
                <label for="cvc">Security code</label>
                <input id="cvc" name="cvc" type="text" inputmode="numeric" autocomplete="cc-csc"
                       maxlength="4" aria-describedby="cvc-err">
                <p class="err" id="cvc-err">Three or four digits.</p>
              </div>
            </div>
          </div>

          <div data-pay4-note class="payin4 mt-4" hidden></div>
        </fieldset>

        <div class="block">
          <p class="err" data-form-error role="alert" style="display:none;margin-bottom:var(--s-4)"></p>
          <button type="submit" class="btn btn-primary btn-block" data-place>Place order</button>
          <p class="micro meta mt-3">
            By placing this order you agree to our terms of sale. Your rights under the Australian
            Consumer Law apply in addition to our 30-day returns policy.
          </p>
        </div>
      </form>

      <aside class="checkout-aside">
        <div class="summary" data-summary></div>
        <div data-mini-lines class="mini-lines mt-4"></div>
      </aside>
    </div>
  </div>

  <!-- ---- confirmation ---- -->
  <div data-confirmed hidden></div>

  <div class="empty" data-empty hidden>
    <h2>There is nothing to check out</h2>
    <p>Your bag is empty. Add something first and the checkout will open here.</p>
    <a class="btn btn-primary" href="shop.html">Shop everything</a>
  </div>
</main>`,
});

/* ========================================================================== */

page({
  file: 'wishlist.html',
  title: 'Wishlist — ANTIPODE',
  desc: 'Pieces you have saved at ANTIPODE. Move them to your bag, or check size availability before they sell through.',
  scripts: ['catalog.js', 'store.js', 'shared.js', 'wishlist.js'],
  main: `<main id="main" class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb">
    <a href="index.html">Home</a><span class="sep" aria-hidden="true">/</span>
    <span aria-current="page">Wishlist</span>
  </nav>

  <div class="section-head mt-4">
    <div class="lead">
      <h1>Wishlist</h1>
      <span class="note" data-wl-count></span>
    </div>
    <button type="button" class="linkbtn" data-clear-wishlist hidden>Clear wishlist</button>
  </div>

  <div class="grid-products" data-grid></div>

  <div class="empty" data-empty hidden>
    <h2>Nothing saved yet</h2>
    <p>Tap the heart on any product to keep it here. Your wishlist is stored on this device, so it survives a reload but does not follow you to another browser.</p>
    <a class="btn btn-primary" href="shop.html">Start browsing</a>
  </div>
</main>`,
});

/* ========================================================================== */

page({
  file: 'account.html',
  title: 'Account — ANTIPODE',
  desc: 'Track your ANTIPODE orders, manage saved Australian delivery addresses and set your size preferences.',
  scripts: ['catalog.js', 'store.js', 'shared.js', 'account.js'],
  main: `<main id="main" class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb">
    <a href="index.html">Home</a><span class="sep" aria-hidden="true">/</span>
    <span aria-current="page">Account</span>
  </nav>

  <h1 class="mt-4">Account</h1>
  <p class="editorial mt-3" style="font-size:1.125rem;color:var(--ink-2)">
    Everything here is stored in this browser only. No account, no password, nothing sent anywhere.
  </p>

  <div class="tabs mt-6" role="tablist" aria-label="Account sections">
    <button class="tab" role="tab" id="tab-orders" aria-controls="panel-orders" aria-selected="true">Orders</button>
    <button class="tab" role="tab" id="tab-addresses" aria-controls="panel-addresses" aria-selected="false" tabindex="-1">Addresses</button>
    <button class="tab" role="tab" id="tab-prefs" aria-controls="panel-prefs" aria-selected="false" tabindex="-1">Preferences</button>
  </div>

  <section id="panel-orders" role="tabpanel" aria-labelledby="tab-orders" class="mt-6" data-panel>
    <div data-orders></div>
  </section>

  <section id="panel-addresses" role="tabpanel" aria-labelledby="tab-addresses" class="mt-6" data-panel hidden>
    <div data-addresses></div>

    <form class="addr-form mt-6" data-addr-form>
      <h2>Add an address</h2>
      <div class="row2 mt-4">
        <div class="field">
          <label for="a-name">Full name</label>
          <input id="a-name" name="name" type="text" autocomplete="name" required aria-describedby="a-name-err">
          <p class="err" id="a-name-err">Enter a name.</p>
        </div>
        <div class="field">
          <label for="a-label">Label</label>
          <input id="a-label" name="label" type="text" placeholder="Home, work, mum's">
          <p class="hint">Optional.</p>
        </div>
      </div>
      <div class="field mt-4">
        <label for="a-street">Street address</label>
        <input id="a-street" name="street" type="text" autocomplete="address-line1" required aria-describedby="a-street-err">
        <p class="err" id="a-street-err">Enter a street address.</p>
      </div>
      <div class="row3 mt-4">
        <div class="field">
          <label for="a-suburb">Suburb</label>
          <input id="a-suburb" name="suburb" type="text" autocomplete="address-level2" required aria-describedby="a-suburb-err">
          <p class="err" id="a-suburb-err">Enter a suburb.</p>
        </div>
        <div class="field">
          <label for="a-state">State</label>
          <select id="a-state" name="state" required aria-describedby="a-state-err">
            <option value="">Select</option>
            <option>ACT</option><option>NSW</option><option>NT</option><option>QLD</option>
            <option>SA</option><option>TAS</option><option>VIC</option><option>WA</option>
          </select>
          <p class="err" id="a-state-err">Select a state.</p>
        </div>
        <div class="field">
          <label for="a-postcode">Postcode</label>
          <input id="a-postcode" name="postcode" type="text" inputmode="numeric" maxlength="4" required aria-describedby="a-postcode-err">
          <p class="err" id="a-postcode-err">Enter a valid four-digit postcode.</p>
        </div>
      </div>
      <button type="submit" class="btn btn-primary mt-5">Save address</button>
    </form>
  </section>

  <section id="panel-prefs" role="tabpanel" aria-labelledby="tab-prefs" class="mt-6" data-panel hidden>
    <form data-prefs class="prefs">
      <h2>Sizes you usually take</h2>
      <p class="small muted mt-2" style="max-width:52ch">
        Saved here so product pages can point out when your size is low or sold out. Australian sizing throughout.
      </p>

      <div class="row3 mt-5">
        <div class="field">
          <label for="p-cloth">Clothing</label>
          <select id="p-cloth" name="clothing"></select>
        </div>
        <div class="field">
          <label for="p-shoe">Shoes</label>
          <select id="p-shoe" name="shoe"></select>
        </div>
        <div class="field">
          <label for="p-dept">Usually shops</label>
          <select id="p-dept" name="dept">
            <option value="">No preference</option>
            <option value="women">Womenswear</option>
            <option value="men">Menswear</option>
          </select>
        </div>
      </div>

      <h2 class="mt-7">Contact</h2>
      <label class="check mt-3">
        <input type="checkbox" name="marketing">
        <span>Email me season notes and early access to markdowns</span>
      </label>
      <label class="check">
        <input type="checkbox" name="sms">
        <span>Text me delivery updates</span>
      </label>

      <button type="submit" class="btn btn-primary mt-5">Save preferences</button>
      <p class="micro meta mt-3" data-prefs-msg role="status" aria-live="polite"></p>
    </form>

    <div class="danger mt-8">
      <h2>Stored data</h2>
      <p class="small muted mt-2" style="max-width:52ch">
        Your bag, wishlist, orders, addresses and preferences live in this browser's local storage.
        Clearing them cannot be undone.
      </p>
      <button type="button" class="btn btn-secondary mt-4" data-wipe>Clear everything stored on this device</button>
    </div>
  </section>
</main>`,
});

/* ========================================================================== */

page({
  file: 'journal.html',
  title: 'Journal — ANTIPODE',
  desc: 'Season notes, Australian sizing explained, buying a first mechanical watch, and how to keep leather alive in a wet summer.',
  scripts: ['catalog.js', 'journal-data.js', 'store.js', 'shared.js', 'journal.js'],
  main: `<main id="main">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb" data-crumbs></nav>
  </div>
  <div data-journal></div>
</main>`,
});

page({
  file: 'about.html',
  title: 'About, delivery, returns and sizing — ANTIPODE',
  desc: 'Who we are, how we buy, Australian delivery times by state, our 30-day returns policy and Australian Consumer Law rights, and a full AU size guide.',
  scripts: ['catalog.js', 'store.js', 'shared.js'],
  main: fs.readFileSync(path.join(HERE, 'about-main.html'), 'utf8').trim(),
});

console.log('done');
