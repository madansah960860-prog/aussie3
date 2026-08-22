/* ============================================================================
   ANTIPODE — checkout

   Demonstration only: nothing is transmitted anywhere. The order is written to
   this browser's local storage so the account page can show it afterwards.
   ========================================================================= */

(function () {
  'use strict';

  var A = window.Antipode;
  if (!A) return;
  var qs = A.qs, qsa = A.qsa, esc = A.esc, money = A.money;

  var STORES = [
    { key: 'surry', name: 'Surry Hills', address: 'Level 3, 118 Kippax Street, Surry Hills NSW 2010', hours: 'Mon–Sat 10–6, Sun 11–4' },
    { key: 'fitzroy', name: 'Fitzroy', address: '244 Gertrude Street, Fitzroy VIC 3065', hours: 'Mon–Sat 10–6, Sun 11–5' },
    { key: 'valley', name: 'Fortitude Valley', address: '19 James Street, Fortitude Valley QLD 4006', hours: 'Mon–Sat 10–5:30, Sun 11–4' },
  ];

  var method = 'standard';
  var payType = 'card';
  var promo = A.getPromo();
  var store = STORES[0].key;

  var bag = A.getBag();
  if (!bag.length) {
    qs('[data-empty]').hidden = false;
    return;
  }
  qs('[data-checkout]').hidden = false;

  /* ==========================================================================
     Totals
     ====================================================================== */

  function currentTotals() {
    var lines = A.getBag();
    var base = A.totals(lines);
    var discount = 0;
    if (promo) {
      var re = A.applyPromo(promo.code, base.subtotal);
      if (re.ok) { discount = re.amount; promo = re; } else { promo = null; A.setPromo(null); }
    }
    var t = A.totals(lines, method, discount);
    if (promo && promo.freeShipping && t.shipping > 0) {
      t.total -= t.shipping;
      t.shipping = 0;
      t.gst = t.total - t.total / (1 + A.GST_RATE);
    }
    return t;
  }

  function slowestDispatch() {
    return A.getBag().reduce(function (n, l) { return Math.max(n, A.byId(l.id).shipsInDays); }, 1);
  }

  /* ==========================================================================
     Render
     ====================================================================== */

  function methodEta(key) {
    var pcv = qs('#postcode').value.trim();
    if (key === 'collect') return 'Ready in 2 business hours';
    if (!/^\d{4}$/.test(pcv)) return key === 'express' ? '1–4 business days' : '1–8 business days';
    var e = A.estimate(pcv, key, slowestDispatch());
    return e ? e.label : '—';
  }

  function renderMethods() {
    var t = A.totals(A.getBag(), 'standard', promo ? promo.amount : 0);
    var opts = [
      { key: 'standard', label: 'Standard delivery', note: 'Australia Post, tracked', price: t.subtotal - (promo ? promo.amount : 0) >= A.FREE_SHIP ? 0 : A.SHIPPING.standard.price },
      { key: 'express', label: 'Express delivery', note: 'Australia Post Express', price: t.subtotal - (promo ? promo.amount : 0) >= A.FREE_SHIP ? A.SHIPPING.express.price - A.SHIPPING.standard.price : A.SHIPPING.express.price },
      { key: 'collect', label: 'Click &amp; collect', note: 'From one of our three counters', price: 0 },
    ];

    qs('[data-methods]').innerHTML = opts.map(function (o) {
      return '<label class="method">' +
        '<input type="radio" name="method" value="' + o.key + '"' + (method === o.key ? ' checked' : '') + '>' +
        '<span class="method-main">' +
          '<span class="method-title">' + o.label + '</span>' +
          '<span class="method-note">' + esc(o.note) + ' · ' + esc(methodEta(o.key)) + '</span>' +
        '</span>' +
        '<span class="method-price num">' + (o.price === 0 ? 'Free' : money(o.price)) + '</span>' +
      '</label>';
    }).join('');
  }

  function renderStores() {
    qs('[data-stores]').innerHTML = STORES.map(function (s) {
      return '<label class="method">' +
        '<input type="radio" name="store" value="' + s.key + '"' + (store === s.key ? ' checked' : '') + '>' +
        '<span class="method-main">' +
          '<span class="method-title">' + esc(s.name) + '</span>' +
          '<span class="method-note">' + esc(s.address) + '<br>' + esc(s.hours) + '</span>' +
        '</span>' +
      '</label>';
    }).join('');
  }

  function renderPayTypes() {
    var t = currentTotals();
    var opts = [
      { key: 'card', label: 'Card', note: 'Visa, Mastercard, American Express' },
      { key: 'pay4', label: 'Pay in 4', note: t.total >= 50
          ? '4 interest-free fortnightly payments of ' + money(t.total / 4)
          : 'Available on orders over ' + money(50), disabled: t.total < 50 },
    ];
    qs('[data-paytypes]').innerHTML = opts.map(function (o) {
      return '<label class="method' + (o.disabled ? ' is-off' : '') + '">' +
        '<input type="radio" name="paytype" value="' + o.key + '"' +
          (payType === o.key ? ' checked' : '') + (o.disabled ? ' disabled' : '') + '>' +
        '<span class="method-main">' +
          '<span class="method-title">' + esc(o.label) + '</span>' +
          '<span class="method-note">' + esc(o.note) + '</span>' +
        '</span>' +
      '</label>';
    }).join('');

    var note = qs('[data-pay4-note]');
    note.hidden = payType !== 'pay4';
    if (payType === 'pay4') {
      note.innerHTML = '<span>Four payments of</span> <b>' + money(t.total / 4) + '</b> ' +
        '<span>— the first today, then fortnightly. No interest, no fees when you pay on time.</span>';
    }
    qs('[data-card-fields]').hidden = payType !== 'card';
  }

  function renderSummary() {
    var t = currentTotals();
    qs('[data-summary]').innerHTML =
      '<h2>Order summary</h2>' +
      '<div class="row"><span>Subtotal (' + t.count + (t.count === 1 ? ' item' : ' items') + ')</span>' +
        '<span class="num">' + money(t.subtotal) + '</span></div>' +
      (t.discount > 0
        ? '<div class="row" style="color:var(--sale)"><span>Discount · ' + esc(promo.code) + '</span>' +
          '<span class="num">&minus;' + money(t.discount) + '</span></div>' : '') +
      '<div class="row"><span>' + (method === 'collect' ? 'Click &amp; collect' : method === 'express' ? 'Express delivery' : 'Standard delivery') + '</span>' +
        '<span class="num">' + (t.shipping === 0 ? '<b style="color:var(--success)">Free</b>' : money(t.shipping)) + '</span></div>' +
      '<div class="row total"><span>Total</span><span class="num">' + money(t.total) + '</span></div>' +
      '<p class="fineprint">Includes ' + money(t.gst) + ' GST. All prices in Australian dollars.</p>';

    qs('[data-mini-lines]').innerHTML = A.getBag().map(function (l) {
      var p = A.byId(l.id);
      return '<div class="mini-line">' +
        '<img src="' + esc(p.images[0]) + '" alt="' + esc(A.altText(p, 0)) + '" width="1000" height="1250" loading="lazy" decoding="async">' +
        '<div><p class="micro" style="font-weight:600">' + esc(p.title) + '</p>' +
        '<p class="micro meta">' + esc(p.brand) + ' · ' + esc(l.size) + ' · Qty ' + l.qty + '</p></div>' +
        '<p class="micro num nowrap" style="font-weight:600">' + money(p.price * l.qty) + '</p>' +
      '</div>';
    }).join('');
  }

  function renderEta() {
    var out = qs('[data-eta]');
    var pcv = qs('#postcode').value.trim();
    if (method === 'collect') {
      var s = STORES.filter(function (x) { return x.key === store; })[0];
      out.innerHTML = 'Ready to collect from <b>' + esc(s.name) + '</b> within 2 business hours. We will email when it is on the counter.';
      return;
    }
    if (!/^\d{4}$/.test(pcv)) { out.textContent = ''; return; }
    var e = A.estimate(pcv, method, slowestDispatch());
    if (!e) { out.innerHTML = '<span style="color:var(--sale)">That is not an Australian postcode we deliver to.</span>'; return; }
    out.innerHTML = 'Estimated delivery <b>' + e.label + '</b> to ' + esc(e.stateName) +
      ' <span class="meta">(' + (e.metro ? 'metro' : 'regional') + ')</span>';
  }

  function renderSavedAddresses() {
    var list = A.getAddresses();
    var host = qs('[data-saved-addresses]');
    host.hidden = list.length === 0;
    if (!list.length) return;
    host.innerHTML = '<p class="fieldset-label mb-3">Saved addresses</p>' +
      '<div class="chips">' + list.map(function (a, i) {
        return '<button type="button" class="chip" data-use-address="' + i + '">' +
          esc(a.label || a.name) + ' · ' + esc(a.suburb) + ' ' + esc(a.state) + '</button>';
      }).join('') + '</div>';
  }

  /* ==========================================================================
     Validation
     ====================================================================== */

  function fieldOf(input) { return input.closest('.field'); }

  function setError(input, bad) {
    var f = fieldOf(input);
    if (!f) return;
    f.classList.toggle('invalid', !!bad);
    input.setAttribute('aria-invalid', bad ? 'true' : 'false');
  }

  var RULES = {
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); },
    phone: function (v) { return v.trim() === '' || /^0[45]\d{2}\s?\d{3}\s?\d{3}$/.test(v.trim().replace(/[^\d\s]/g, '')); },
    first: function (v) { return v.trim().length > 0; },
    last: function (v) { return v.trim().length > 0; },
    street: function (v) { return v.trim().length > 2; },
    suburb: function (v) { return v.trim().length > 1; },
    state: function (v) { return v !== ''; },
    postcode: function (v) { return /^\d{4}$/.test(v.trim()) && !!A.stateFor(v.trim()); },
    card: function (v) { return payType !== 'card' || v.replace(/\D/g, '').length >= 13; },
    cardname: function (v) { return payType !== 'card' || v.trim().length > 1; },
    expiry: function (v) {
      if (payType !== 'card') return true;
      var m = v.trim().match(/^(\d{2})\s*\/\s*(\d{2})$/);
      if (!m) return false;
      var mm = +m[1], yy = +m[2];
      if (mm < 1 || mm > 12) return false;
      var now = new Date();
      var exp = new Date(2000 + yy, mm, 0, 23, 59, 59);
      return exp > now;
    },
    cvc: function (v) { return payType !== 'card' || /^\d{3,4}$/.test(v.trim()); },
  };

  function addressRequired() { return method !== 'collect'; }

  function validate(showAll) {
    var bad = [];
    Object.keys(RULES).forEach(function (name) {
      var input = qs('#' + name);
      if (!input) return;
      if (!addressRequired() && ['first', 'last', 'street', 'suburb', 'state', 'postcode'].indexOf(name) !== -1) {
        setError(input, false);
        return;
      }
      var ok = RULES[name](input.value);
      if (showAll || input.dataset.touched) setError(input, !ok);
      if (!ok) bad.push(input);
    });

    /* Cross-check: the postcode has to belong to the chosen state. */
    var st = qs('#state'), pcEl = qs('#postcode');
    if (addressRequired() && /^\d{4}$/.test(pcEl.value.trim()) && st.value) {
      var derived = A.stateFor(pcEl.value.trim());
      if (derived && derived !== st.value) {
        var err = qs('#postcode-err');
        err.textContent = 'Postcode ' + pcEl.value.trim() + ' is in ' + derived + ', not ' + st.value + '.';
        if (showAll || pcEl.dataset.touched) setError(pcEl, true);
        if (bad.indexOf(pcEl) === -1) bad.push(pcEl);
      } else {
        qs('#postcode-err').textContent = 'Enter a valid four-digit Australian postcode.';
      }
    }
    return bad;
  }

  function renderSteps() {
    var contactOk = RULES.email(qs('#email').value) && RULES.phone(qs('#phone').value);
    var deliveryOk = !addressRequired() ||
      (RULES.first(qs('#first').value) && RULES.last(qs('#last').value) &&
       RULES.street(qs('#street').value) && RULES.suburb(qs('#suburb').value) &&
       RULES.state(qs('#state').value) && RULES.postcode(qs('#postcode').value));

    var items = qsa('[data-steps] li');
    items[0].dataset.done = contactOk;
    items[1].dataset.done = contactOk && deliveryOk;
    items[2].dataset.done = 'false';

    items.forEach(function (li) { li.removeAttribute('aria-current'); });
    var current = !contactOk ? 0 : !deliveryOk ? 1 : 2;
    items[current].setAttribute('aria-current', 'step');
    items[current].dataset.done = 'false';
  }

  /* ==========================================================================
     Confirmation
     ====================================================================== */

  function orderNumber() {
    var n = Math.abs(Date.now() % 1000000).toString().padStart(6, '0');
    return 'AP-26-' + n;
  }

  function confirm(order) {
    qs('[data-checkout]').hidden = true;
    var host = qs('[data-confirmed]');
    host.hidden = false;
    document.title = 'Order ' + order.number + ' — ANTIPODE';

    host.innerHTML =
      '<div class="confirm">' +
        '<div class="confirm-mark" aria-hidden="true">' + A.ICON.check + '</div>' +
        '<h1>Order placed</h1>' +
        '<p class="editorial mt-3">Thank you. Your order number is <b style="font-style:normal">' + esc(order.number) + '</b>.</p>' +
        '<p class="small muted mt-3" style="max-width:56ch">A confirmation has gone to ' + esc(order.email) +
          '. You can follow this order from your account page on this device at any time.</p>' +

        '<dl class="conditions conditions--light mt-6">' +
          '<div><dt>Order</dt><dd>' + esc(order.number) + '</dd></div>' +
          '<div><dt>Placed</dt><dd>' + A.AU_DATE.format(new Date(order.placed)) + '</dd></div>' +
          '<div><dt>' + (order.method === 'collect' ? 'Collect from' : 'Delivery') + '</dt><dd>' + esc(order.etaLabel) + '</dd></div>' +
          '<div><dt>Total</dt><dd>' + money(order.total) + '</dd></div>' +
        '</dl>' +

        '<div class="confirm-grid mt-7">' +
          '<div>' +
            '<h2>Your order</h2>' +
            '<div class="mini-lines mt-4">' + order.lines.map(function (l) {
              var p = A.byId(l.id);
              return '<div class="mini-line">' +
                '<img src="' + esc(p.images[0]) + '" alt="' + esc(A.altText(p, 0)) + '" width="1000" height="1250" loading="lazy" decoding="async">' +
                '<div><p class="micro" style="font-weight:600">' + esc(p.title) + '</p>' +
                '<p class="micro meta">' + esc(p.brand) + ' · ' + esc(l.size) + ' · Qty ' + l.qty + '</p></div>' +
                '<p class="micro num nowrap" style="font-weight:600">' + money(p.price * l.qty) + '</p></div>';
            }).join('') + '</div>' +
            '<div class="summary mt-5">' +
              '<div class="row"><span>Subtotal</span><span class="num">' + money(order.subtotal) + '</span></div>' +
              (order.discount > 0 ? '<div class="row" style="color:var(--sale)"><span>Discount</span><span class="num">&minus;' + money(order.discount) + '</span></div>' : '') +
              '<div class="row"><span>' + (order.method === 'collect' ? 'Click &amp; collect' : 'Delivery') + '</span>' +
                '<span class="num">' + (order.shipping === 0 ? 'Free' : money(order.shipping)) + '</span></div>' +
              '<div class="row total"><span>Total paid</span><span class="num">' + money(order.total) + '</span></div>' +
              '<p class="fineprint">Includes ' + money(order.gst) + ' GST.</p>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<h2>' + (order.method === 'collect' ? 'Collection' : 'Delivering to') + '</h2>' +
            '<address class="small mt-4" style="font-style:normal;line-height:1.7">' + order.addressHtml + '</address>' +
            '<h2 class="mt-7">What happens next</h2>' +
            '<ul class="timeline mt-4">' +
              '<li data-done="true"><div><b class="small">Order received</b><p class="when">Just now</p></div></li>' +
              '<li data-current="true"><div><b class="small">Picking and packing</b><p class="when">Within ' + order.dispatchDays + ' business day' + (order.dispatchDays === 1 ? '' : 's') + '</p></div></li>' +
              '<li><div><b class="small">' + (order.method === 'collect' ? 'Ready to collect' : 'On its way') + '</b><p class="when">' + esc(order.etaLabel) + '</p></div></li>' +
              '<li><div><b class="small">' + (order.method === 'collect' ? 'Collected' : 'Delivered') + '</b><p class="when">Signature not required unless the order is over ' + money(3000) + '</p></div></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +

        '<div class="flex gap-3 wrapf mt-7">' +
          '<a class="btn btn-primary" href="account.html#orders">Track this order</a>' +
          '<a class="btn btn-secondary" href="shop.html">Keep shopping</a>' +
        '</div>' +
      '</div>';

    // Scroll the window rather than the block: scrollIntoView would tuck the
    // breadcrumb under the sticky header.
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ==========================================================================
     Events
     ====================================================================== */

  qs('[data-methods]').addEventListener('change', function (e) {
    if (e.target.name !== 'method') return;
    method = e.target.value;
    qs('[data-address-block]').hidden = method === 'collect';
    qs('[data-collect-block]').hidden = method !== 'collect';
    renderMethods();
    renderSummary();
    renderPayTypes();
    renderEta();
    renderSteps();
  });

  qs('[data-stores]').addEventListener('change', function (e) {
    if (e.target.name !== 'store') return;
    store = e.target.value;
    renderEta();
  });

  qs('[data-paytypes]').addEventListener('change', function (e) {
    if (e.target.name !== 'paytype') return;
    payType = e.target.value;
    renderPayTypes();
    validate(false);
  });

  /** Retract the submit-time error banner as soon as the form is clean. */
  function clearBannerIfValid() {
    var banner = qs('[data-form-error]');
    if (banner.style.display === 'none') return;
    if (!validate(false).length) banner.style.display = 'none';
  }

  qs('#checkout-form').addEventListener('input', function (e) {
    if (e.target.id === 'postcode') { renderMethods(); renderEta(); }
    if (e.target.dataset) e.target.dataset.touched = '1';
    validate(false);
    clearBannerIfValid();
    renderSteps();
  });

  qs('#checkout-form').addEventListener('blur', function (e) {
    if (!e.target.id) return;
    e.target.dataset.touched = '1';
    validate(false);
    clearBannerIfValid();
    renderSteps();
  }, true);

  qs('#state').addEventListener('change', function () { validate(false); clearBannerIfValid(); renderSteps(); });

  /* light input masks */
  qs('#expiry').addEventListener('input', function (e) {
    var v = e.target.value.replace(/\D/g, '').slice(0, 4);
    e.target.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v;
  });
  qs('#card').addEventListener('input', function (e) {
    var v = e.target.value.replace(/\D/g, '').slice(0, 16);
    e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
  });

  document.addEventListener('click', function (e) {
    var use = e.target.closest('[data-use-address]');
    if (!use) return;
    var a = A.getAddresses()[+use.getAttribute('data-use-address')];
    if (!a) return;
    var parts = String(a.name).split(' ');
    qs('#first').value = parts[0] || '';
    qs('#last').value = parts.slice(1).join(' ') || '';
    qs('#street').value = a.street || '';
    qs('#suburb').value = a.suburb || '';
    qs('#state').value = a.state || '';
    qs('#postcode').value = a.postcode || '';
    qsa('#checkout-form input, #checkout-form select').forEach(function (i) { i.dataset.touched = '1'; });
    validate(false);
    renderMethods();
    renderEta();
    renderSteps();
  });

  qs('#checkout-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = validate(true);
    var banner = qs('[data-form-error]');

    if (bad.length) {
      banner.style.display = 'block';
      banner.textContent = bad.length === 1
        ? 'One field needs attention before we can place the order.'
        : bad.length + ' fields need attention before we can place the order.';
      bad[0].focus();
      bad[0].scrollIntoView({ block: 'center' });
      return;
    }
    banner.style.display = 'none';

    var t = currentTotals();
    var lines = A.getBag();
    var dispatch = slowestDispatch();
    var etaLabel, addressHtml;

    if (method === 'collect') {
      var s = STORES.filter(function (x) { return x.key === store; })[0];
      etaLabel = 'Ready in 2 business hours';
      addressHtml = '<b>' + esc(s.name) + '</b><br>' + esc(s.address) + '<br>' + esc(s.hours);
    } else {
      var est = A.estimate(qs('#postcode').value.trim(), method, dispatch);
      etaLabel = est ? est.label : '1–8 business days';
      addressHtml = esc(qs('#first').value + ' ' + qs('#last').value) + '<br>' +
        esc(qs('#street').value) + '<br>' +
        (qs('#street2').value ? esc(qs('#street2').value) + '<br>' : '') +
        esc(qs('#suburb').value) + ' ' + esc(qs('#state').value) + ' ' + esc(qs('#postcode').value);
    }

    if (qs('#save-address').checked && method !== 'collect') {
      var list = A.getAddresses();
      var addr = {
        name: qs('#first').value + ' ' + qs('#last').value,
        label: '',
        street: qs('#street').value,
        street2: qs('#street2').value,
        suburb: qs('#suburb').value,
        state: qs('#state').value,
        postcode: qs('#postcode').value,
      };
      var dupe = list.some(function (x) {
        return x.street === addr.street && x.postcode === addr.postcode;
      });
      if (!dupe) { list.push(addr); A.setAddresses(list); }
    }

    var order = {
      number: orderNumber(),
      placed: new Date().toISOString(),
      email: qs('#email').value.trim(),
      method: method,
      payType: payType,
      store: method === 'collect' ? store : null,
      lines: lines,
      subtotal: t.subtotal,
      discount: t.discount,
      shipping: t.shipping,
      gst: t.gst,
      total: t.total,
      etaLabel: etaLabel,
      dispatchDays: dispatch,
      addressHtml: addressHtml,
      status: 'packing',
    };

    A.saveOrder(order);
    A.clearBag();
    A.setPromo(null);
    A.syncCounts();
    confirm(order);
  });

  /* ==========================================================================
     Boot
     ====================================================================== */

  var savedPc = A.getPrefs().postcode;
  if (savedPc) qs('#postcode').value = savedPc;

  renderMethods();
  renderStores();
  renderPayTypes();
  renderSummary();
  renderSavedAddresses();
  renderEta();
  renderSteps();
})();
