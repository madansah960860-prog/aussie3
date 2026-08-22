/* ============================================================================
   ANTIPODE — core store module
   Catalogue access, money, persistent state (bag / wishlist / orders),
   header wiring, bag drawer, toasts, list stagger, shared renderers.

   Loaded on every page, after catalog.js.
   ========================================================================= */

(function () {
  'use strict';

  var CAT = window.ANTIPODE_CATALOG || { products: [], meta: {}, collections: {} };
  var META = CAT.meta || {};
  var BY_ID = {};
  CAT.products.forEach(function (p) { BY_ID[p.id] = p; });

  /* ==========================================================================
     Money and numbers
     ====================================================================== */

  var AUD = new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: 'AUD', currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  var AUD0 = new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: 'AUD', currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });

  /** Whole dollars drop the cents — A$139, not A$139.00. */
  function money(n) {
    var s = (Math.round(n * 100) % 100 === 0 ? AUD0 : AUD).format(n);
    return 'A' + s;
  }

  var AU_DATE = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  var AU_DAY = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });

  /* ==========================================================================
     Persistent state
     ====================================================================== */

  var KEY = {
    promo: 'antipode.promo',
    bag: 'antipode.bag',
    wish: 'antipode.wishlist',
    recent: 'antipode.recent',
    orders: 'antipode.orders',
    addresses: 'antipode.addresses',
    prefs: 'antipode.prefs',
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  /* ---- bag: [{ id, size, qty }] ---------------------------------------- */

  function getBag() {
    return read(KEY.bag, []).filter(function (l) { return BY_ID[l.id]; });
  }

  function setBag(lines) {
    write(KEY.bag, lines);
    document.dispatchEvent(new CustomEvent('bag:change', { detail: lines }));
  }

  function bagCount() {
    return getBag().reduce(function (n, l) { return n + l.qty; }, 0);
  }

  function stockFor(product, size) {
    return (product.stock && product.stock[size]) || 0;
  }

  function addToBag(id, size, qty) {
    var p = BY_ID[id];
    if (!p) return { ok: false, reason: 'unknown' };
    size = size || (p.sizes.length === 1 ? p.sizes[0] : null);
    if (!size) return { ok: false, reason: 'size' };

    var available = stockFor(p, size);
    if (available < 1) return { ok: false, reason: 'stock' };

    var lines = getBag();
    var line = lines.filter(function (l) { return l.id === id && l.size === size; })[0];
    var want = (line ? line.qty : 0) + (qty || 1);

    if (want > available) {
      if (line && line.qty >= available) return { ok: false, reason: 'max', max: available };
      want = available;
    }
    if (line) line.qty = want;
    else lines.push({ id: id, size: size, qty: want });

    setBag(lines);
    return { ok: true, capped: want < (line ? line.qty : 0) + (qty || 1) };
  }

  function setQty(id, size, qty) {
    var lines = getBag();
    var p = BY_ID[id];
    var max = p ? stockFor(p, size) : 0;
    var next = [];
    lines.forEach(function (l) {
      if (l.id === id && l.size === size) {
        var q = Math.max(0, Math.min(qty, max));
        if (q > 0) next.push({ id: l.id, size: l.size, qty: q });
      } else next.push(l);
    });
    setBag(next);
  }

  function removeLine(id, size) {
    setBag(getBag().filter(function (l) { return !(l.id === id && l.size === size); }));
  }

  function clearBag() { setBag([]); }

  /* ---- wishlist: [id] --------------------------------------------------- */

  function getWishlist() {
    return read(KEY.wish, []).filter(function (id) { return BY_ID[id]; });
  }

  function inWishlist(id) { return getWishlist().indexOf(id) !== -1; }

  function toggleWishlist(id) {
    var list = getWishlist();
    var i = list.indexOf(id);
    if (i === -1) list.push(id); else list.splice(i, 1);
    write(KEY.wish, list);
    document.dispatchEvent(new CustomEvent('wishlist:change', { detail: list }));
    return i === -1;
  }

  /* ---- recently viewed --------------------------------------------------- */

  function pushRecent(id) {
    var list = read(KEY.recent, []).filter(function (x) { return x !== id && BY_ID[x]; });
    list.unshift(id);
    write(KEY.recent, list.slice(0, 12));
  }
  function getRecent(excludeId) {
    return read(KEY.recent, [])
      .filter(function (id) { return BY_ID[id] && id !== excludeId; })
      .map(function (id) { return BY_ID[id]; });
  }

  /* ---- orders / addresses / prefs ---------------------------------------- */

  function getOrders() { return read(KEY.orders, []); }
  function saveOrder(order) {
    var list = getOrders();
    list.unshift(order);
    write(KEY.orders, list.slice(0, 25));
  }
  function getAddresses() { return read(KEY.addresses, []); }
  function setAddresses(list) { write(KEY.addresses, list); }
  function getPrefs() { return read(KEY.prefs, {}); }
  function setPrefs(p) { write(KEY.prefs, p); }
  function getPromo() { return read(KEY.promo, null); }
  function setPromo(p) { write(KEY.promo, p); }

  /* ==========================================================================
     Totals — GST is *included* in Australian displayed prices, so it is
     extracted from the total rather than added to it.
     ====================================================================== */

  var FREE_SHIP = META.freeShippingThreshold || 150;
  var GST_RATE = META.gstRate || 0.1;

  var SHIPPING = {
    standard: { label: 'Standard', price: 9.95, note: 'Australia Post, tracked' },
    express: { label: 'Express', price: 14.95, note: 'Australia Post Express' },
    collect: { label: 'Click & Collect', price: 0, note: 'Ready in 2 business hours' },
  };

  function totals(lines, method, discount) {
    lines = lines || getBag();
    var subtotal = lines.reduce(function (n, l) {
      var p = BY_ID[l.id];
      return n + (p ? p.price * l.qty : 0);
    }, 0);

    var disc = discount || 0;
    var afterDiscount = Math.max(0, subtotal - disc);

    var ship = SHIPPING[method] || SHIPPING.standard;
    var shipping = 0;
    if (method === 'collect') shipping = 0;
    else if (afterDiscount >= FREE_SHIP) shipping = method === 'express' ? Math.max(0, ship.price - SHIPPING.standard.price) : 0;
    else shipping = ship.price;
    if (afterDiscount === 0) shipping = 0;

    var total = afterDiscount + shipping;
    var gst = total - total / (1 + GST_RATE);

    return {
      subtotal: subtotal,
      discount: disc,
      shipping: shipping,
      shippingFree: shipping === 0 && afterDiscount > 0,
      total: total,
      gst: gst,
      count: lines.reduce(function (n, l) { return n + l.qty; }, 0),
      toFreeShipping: Math.max(0, FREE_SHIP - afterDiscount),
    };
  }

  /* ---- promotion codes --------------------------------------------------- */

  var PROMOS = {
    SOUTHERLY10: { type: 'percent', value: 10, label: '10% off', min: 0 },
    WELCOME25: { type: 'fixed', value: 25, label: 'A$25 off', min: 120 },
    FREIGHT: { type: 'ship', value: 0, label: 'Free standard delivery', min: 0 },
  };

  function applyPromo(code, subtotal) {
    var promo = PROMOS[String(code || '').trim().toUpperCase()];
    if (!promo) return { ok: false, message: 'That code is not recognised.' };
    if (subtotal < promo.min) {
      return { ok: false, message: 'This code needs a subtotal of ' + money(promo.min) + ' or more.' };
    }
    var amount = promo.type === 'percent' ? subtotal * (promo.value / 100)
      : promo.type === 'fixed' ? promo.value : 0;
    return {
      ok: true,
      code: String(code).trim().toUpperCase(),
      amount: Math.min(amount, subtotal),
      label: promo.label,
      freeShipping: promo.type === 'ship',
    };
  }

  /* ==========================================================================
     Australian delivery estimate
     ====================================================================== */

  var STATE_RANGES = [
    [[200, 299], 'ACT'], [[2600, 2618], 'ACT'], [[2900, 2920], 'ACT'],
    [[1000, 2599], 'NSW'], [[2619, 2899], 'NSW'], [[2921, 2999], 'NSW'],
    [[3000, 3999], 'VIC'], [[8000, 8999], 'VIC'],
    [[4000, 4999], 'QLD'], [[9000, 9999], 'QLD'],
    [[5000, 5999], 'SA'],
    [[6000, 6999], 'WA'],
    [[7000, 7999], 'TAS'],
    [[800, 999], 'NT'],
  ];

  var METRO = {
    NSW: [[1000, 2249], [2555, 2574], [2740, 2786]],
    VIC: [[3000, 3207], [8000, 8999]],
    QLD: [[4000, 4207], [9000, 9499]],
    SA: [[5000, 5199]],
    WA: [[6000, 6199]],
    TAS: [[7000, 7099]],
    ACT: [[200, 299], [2600, 2618], [2900, 2920]],
    NT: [[800, 832]],
  };

  /* Business days from the Sydney distribution centre. */
  var TRANSIT = {
    NSW: [1, 2], ACT: [2, 3], VIC: [2, 3], QLD: [2, 4],
    SA: [3, 4], TAS: [3, 5], WA: [4, 7], NT: [5, 8],
  };

  var STATE_NAMES = {
    NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland', WA: 'Western Australia',
    SA: 'South Australia', TAS: 'Tasmania', ACT: 'Australian Capital Territory',
    NT: 'Northern Territory',
  };

  function stateFor(postcode) {
    var n = parseInt(postcode, 10);
    if (!(n >= 200 && n <= 9999)) return null;
    for (var i = 0; i < STATE_RANGES.length; i++) {
      if (n >= STATE_RANGES[i][0][0] && n <= STATE_RANGES[i][0][1]) return STATE_RANGES[i][1];
    }
    return null;
  }

  function isMetro(postcode, state) {
    var n = parseInt(postcode, 10);
    var ranges = METRO[state] || [];
    return ranges.some(function (r) { return n >= r[0] && n <= r[1]; });
  }

  function addBusinessDays(from, days) {
    var d = new Date(from.getTime());
    var added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      var wd = d.getDay();
      if (wd !== 0 && wd !== 6) added++;
    }
    return d;
  }

  /**
   * @returns {null|{state,stateName,metro,min,max,from,to,label}}
   */
  function estimate(postcode, method, dispatchDays) {
    var state = stateFor(postcode);
    if (!state) return null;

    var metro = isMetro(postcode, state);
    var base = TRANSIT[state];
    var min = base[0], max = base[1];

    if (!metro) { min += 1; max += 2; }
    // Express halves transit but can never beat next business day, so on a
    // metro NSW address it legitimately collapses to a single date.
    if (method === 'express') { min = Math.max(1, Math.ceil(min / 2)); max = Math.max(min, Math.ceil(max / 2)); }

    var lead = typeof dispatchDays === 'number' ? dispatchDays : 1;
    var now = new Date();
    var from = addBusinessDays(now, min + lead);
    var to = addBusinessDays(now, max + lead);

    return {
      state: state,
      stateName: STATE_NAMES[state],
      metro: metro,
      min: min + lead,
      max: max + lead,
      from: from,
      to: to,
      label: from.getTime() === to.getTime()
        ? AU_DAY.format(from)
        : AU_DAY.format(from) + ' – ' + AU_DAY.format(to),
    };
  }

  /* ==========================================================================
     Icons — inline SVG, never emoji
     ====================================================================== */

  var ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16l-1.2 13H5.2z"/><path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7.5-4.7-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.3 12 20 12 20Z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    caret: '<svg class="nav-caret" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m1 1.5 5 5 5-5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 12.5 5 5L20 6.5"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M2 6h11v10H2zM13 9h4.4l2.6 3.2V16h-7z"/><circle cx="6.5" cy="18" r="1.8"/><circle cx="16.5" cy="18" r="1.8"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M6 12h12M10 18h4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M6.5 7l.9 13h9.2l.9-13"/></svg>',
  };

  /* ==========================================================================
     Small helpers
     ====================================================================== */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function params() { return new URLSearchParams(location.search); }

  function productUrl(p) { return 'product.html?id=' + encodeURIComponent(p.id); }

  function altText(p, i) {
    var view = ['front view', 'side view', 'detail view', 'back view'][i] || 'alternate view';
    return p.brand + ' ' + p.title + ' in ' + p.colour + ', ' + view;
  }

  function stars(rating, count) {
    var full = Math.round(rating);
    var out = '<span class="stars" role="img" aria-label="' + rating.toFixed(1) + ' out of 5 stars">';
    for (var i = 1; i <= 5; i++) out += ICON.star.replace('<svg', '<svg class="' + (i <= full ? 'on' : 'off') + '"');
    out += '</span>';
    if (count != null) out += ' <span class="micro meta num">' + rating.toFixed(1) + ' (' + count + ')</span>';
    return out;
  }

  function priceHtml(p) {
    var out = '<p class="price' + (p.onSale ? ' is-sale' : '') + '">';
    out += '<span class="now">' + money(p.price) + '</span>';
    if (p.compareAt) {
      var off = Math.round((1 - p.price / p.compareAt) * 100);
      out += '<span class="was"><span class="sr-only">Was </span>' + money(p.compareAt) + '</span>';
      out += '<span class="off">Save ' + off + '%</span>';
    }
    out += '</p>';
    return out;
  }

  /* ==========================================================================
     Product card
     ====================================================================== */

  function cardHtml(p, opts) {
    opts = opts || {};
    var wished = inWishlist(p.id);
    var alt = p.images[1] || null;
    var eager = opts.eager ? ' fetchpriority="high"' : ' loading="lazy"';

    var flags = '';
    if (p.onSale) flags += '<span class="flag flag-sale">Sale</span>';
    else if (p.isNew) flags += '<span class="flag flag-new">New in</span>';
    if (p.totalStock <= 6) flags += '<span class="flag flag-low">Low stock</span>';

    var quick = '';
    if (p.sizes.length > 1) {
      quick = '<div class="card-quick">' + p.sizes.map(function (s) {
        var n = stockFor(p, s);
        return '<button type="button" data-quick-add="' + esc(p.id) + '" data-size="' + esc(s) + '"' +
          (n < 1 ? ' disabled aria-label="' + esc(s) + ' — sold out"' : ' aria-label="Add size ' + esc(s) + ' to bag"') +
          '>' + esc(s.replace('AU ', '')) + '</button>';
      }).join('') + '</div>';
    }

    return '' +
      '<article class="card">' +
        '<div class="card-media">' +
          '<div class="card-flags">' + flags + '</div>' +
          '<img class="primary" src="' + esc(p.images[0]) + '" alt="' + esc(altText(p, 0)) + '" width="1000" height="1250"' + eager + ' decoding="async">' +
          (alt ? '<img class="alt" src="' + esc(alt) + '" alt="" aria-hidden="true" width="1000" height="1250" loading="lazy" decoding="async">' : '') +
          '<button type="button" class="card-wish" data-wish="' + esc(p.id) + '" aria-pressed="' + wished + '" ' +
            'aria-label="' + (wished ? 'Remove ' : 'Save ') + esc(p.title) + (wished ? ' from' : ' to') + ' wishlist">' + ICON.heart + '</button>' +
          quick +
        '</div>' +
        '<div class="card-body">' +
          '<p class="card-brand">' + esc(p.brand) + '</p>' +
          '<h3 class="card-title"><a href="' + productUrl(p) + '">' + esc(p.title) + '</a></h3>' +
          priceHtml(p) +
          '<p class="card-note">' + esc(p.colour) + '</p>' +
        '</div>' +
      '</article>';
  }

  function renderGrid(node, list, opts) {
    if (!node) return;
    opts = opts || {};
    node.innerHTML = list.map(function (p, i) {
      return cardHtml(p, { eager: i < (opts.eagerCount || 0) });
    }).join('');
    if (opts.stagger !== false) stagger(node);
  }

  /* ==========================================================================
     Toasts
     ====================================================================== */

  function toaster() {
    var t = qs('.toaster');
    if (!t) {
      t = el('<div class="toaster" role="status" aria-live="polite"></div>');
      document.body.appendChild(t);
    }
    return t;
  }

  function toast(message, actionHtml) {
    var host = toaster();
    var node = el('<div class="toast"><span>' + message + '</span>' + (actionHtml || '') + '</div>');
    host.appendChild(node);
    setTimeout(function () {
      node.classList.add('leaving');
      setTimeout(function () { node.remove(); }, 260);
    }, 4200);
  }

  /* ==========================================================================
     Stagger.
     Plays a short entrance across the children of a list at render time. It is
     not scroll-gated on purpose: nothing is ever hidden waiting for an observer
     that might not fire, so no context can ship a blank section. The CSS is
     inside a prefers-reduced-motion: no-preference query, so this is a no-op for
     anyone who has asked for less movement.
     ====================================================================== */

  function stagger(node, step) {
    if (!node) return;
    step = step || 40;
    node.classList.add('stagger');
    Array.prototype.forEach.call(node.children, function (child, i) {
      child.style.setProperty('--i', Math.min(i, 12) * step + 'ms');
    });
  }

  /* ==========================================================================
     Header
     ====================================================================== */

  var CATEGORY_LABEL = {
    shirts: 'Shirts', tops: 'Tops & tees', outerwear: 'Outerwear', dresses: 'Dresses',
    shoes: 'Shoes', bags: 'Bags', jewellery: 'Jewellery', watches: 'Watches', eyewear: 'Eyewear',
  };

  function categoriesFor(gender) {
    var counts = {};
    CAT.products.forEach(function (p) {
      if (gender && p.gender !== gender && p.gender !== 'unisex') return;
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.keys(counts).sort(function (a, b) {
      return (CATEGORY_LABEL[a] || a).localeCompare(CATEGORY_LABEL[b] || b);
    }).map(function (c) { return { key: c, label: CATEGORY_LABEL[c] || c, count: counts[c] }; });
  }

  function brandsFor(gender) {
    var set = {};
    CAT.products.forEach(function (p) {
      if (gender && p.gender !== gender && p.gender !== 'unisex') return;
      set[p.brand] = (set[p.brand] || 0) + 1;
    });
    return Object.keys(set).sort();
  }

  function shopHref(q) {
    var sp = new URLSearchParams(q);
    return 'shop.html?' + sp.toString();
  }

  /* Column titles here are navigation group labels, not document headings. They
     are rendered into the sticky header, so marking them up as <h3> would put
     three h3s ahead of every page's <h1> in the heading outline. */
  function megapanelHtml(gender) {
    var cats = categoriesFor(gender);
    var brands = brandsFor(gender).slice(0, 8);
    var featured = CAT.products.filter(function (p) {
      return (p.gender === gender || p.gender === 'unisex') && p.isNew;
    }).slice(0, 2);
    if (featured.length < 2) {
      featured = CAT.products.filter(function (p) { return p.gender === gender || p.gender === 'unisex'; }).slice(0, 2);
    }

    var half = Math.ceil(cats.length / 2);

    return '' +
      '<div class="megapanel" id="mega-' + gender + '">' +
        '<div class="wrap megapanel-inner">' +
          '<div class="megacol" role="group" aria-label="Categories">' +
            '<p class="megacol-label">Categories</p>' +
            cats.slice(0, half).map(function (c) {
              return '<a href="' + shopHref({ gender: gender, category: c.key }) + '">' + esc(c.label) + '</a>';
            }).join('') +
          '</div>' +
          '<div class="megacol" role="group" aria-label="More categories">' +
            '<p class="megacol-label" aria-hidden="true">&nbsp;</p>' +
            cats.slice(half).map(function (c) {
              return '<a href="' + shopHref({ gender: gender, category: c.key }) + '">' + esc(c.label) + '</a>';
            }).join('') +
          '</div>' +
          '<div class="megacol" role="group" aria-label="Labels">' +
            '<p class="megacol-label">Labels</p>' +
            brands.map(function (b) {
              return '<a href="' + shopHref({ gender: gender, brand: b }) + '">' + esc(b) + '</a>';
            }).join('') +
          '</div>' +
          '<div class="megacol" role="group" aria-label="Edits">' +
            '<p class="megacol-label">Edits</p>' +
            '<a href="' + shopHref({ gender: gender, sort: 'newest' }) + '">New this week</a>' +
            '<a href="' + shopHref({ gender: gender, sale: '1' }) + '">On sale</a>' +
            '<a href="' + shopHref({ gender: gender, sort: 'price-desc' }) + '">The considered buy</a>' +
            '<a href="' + shopHref({ gender: gender }) + '">Everything in ' + (gender === 'women' ? 'womenswear' : 'menswear') + '</a>' +
          '</div>' +
          '<div class="megacol" role="group" aria-label="New in">' +
            '<p class="megacol-label">New in</p>' +
            '<div class="megafeature">' +
              featured.map(function (p) {
                return '<a href="' + productUrl(p) + '">' +
                  '<img src="' + esc(p.images[0]) + '" alt="" width="400" height="500" loading="lazy" decoding="async">' +
                  '<span class="t">' + esc(p.brand) + '<br><span class="meta">' + money(p.price) + '</span></span>' +
                  '</a>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function buildHeader() {
    var nav = qs('[data-nav]');
    if (nav) {
      nav.querySelectorAll('[data-mega]').forEach(function (item) {
        item.insertAdjacentHTML('beforeend', megapanelHtml(item.getAttribute('data-mega')));
      });
    }

    // Mark the current page in the nav
    var here = location.pathname.split('/').pop() || 'index.html';
    qsa('[data-nav] .nav-link, .sheet-group a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('?')[0];
      if (href && href === here && !a.hasAttribute('data-no-current')) {
        a.setAttribute('aria-current', 'page');
      }
    });

    syncCounts();
    wireSearch();
    wireMobileSheet();
    wireBagDrawer();

    // Escape closes an open mega panel by moving focus out of it
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = document.activeElement && document.activeElement.closest('.nav-item');
      if (open) document.activeElement.blur();
    });
  }

  function syncCounts() {
    var n = bagCount();
    qsa('[data-bag-count]').forEach(function (node) {
      node.textContent = n > 99 ? '99+' : String(n);
      node.hidden = n === 0;
    });
    qsa('[data-bag-label]').forEach(function (node) {
      node.setAttribute('aria-label', n === 0 ? 'Bag, empty' : 'Bag, ' + n + (n === 1 ? ' item' : ' items'));
    });

    var w = getWishlist().length;
    qsa('[data-wish-count]').forEach(function (node) {
      node.textContent = String(w);
      node.hidden = w === 0;
    });

    qsa('[data-wish]').forEach(function (btn) {
      var on = inWishlist(btn.getAttribute('data-wish'));
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  /* ---- search ------------------------------------------------------------ */

  function searchProducts(term, limit) {
    var q = String(term || '').trim().toLowerCase();
    if (q.length < 2) return [];
    var words = q.split(/\s+/);
    return CAT.products.map(function (p) {
        var hay = (p.title + ' ' + p.brand + ' ' + p.category + ' ' + p.sub + ' ' +
          p.colour + ' ' + p.gender + ' ' + p.tags.join(' ')).toLowerCase();
        var score = 0;
        words.forEach(function (w) {
          if (hay.indexOf(w) === -1) { score = -1; return; }
          if (score === -1) return;
          if (p.title.toLowerCase().indexOf(w) === 0) score += 5;
          else if (p.title.toLowerCase().indexOf(w) !== -1) score += 3;
          else if (p.brand.toLowerCase().indexOf(w) !== -1) score += 3;
          else score += 1;
        });
        return { p: p, score: score };
      })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit || 6)
      .map(function (r) { return r.p; });
  }

  function wireSearch() {
    qsa('[data-search]').forEach(function (form) {
      var input = qs('input', form);
      var out = qs('.suggest', form);
      if (!input || !out) return;

      var timer;
      input.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          var results = searchProducts(input.value);
          out.innerHTML = results.map(function (p) {
            return '<a href="' + productUrl(p) + '">' +
              '<img src="' + esc(p.images[0]) + '" alt="" loading="lazy" decoding="async">' +
              '<span><span class="s-t">' + esc(p.title) + '</span><br>' +
              '<span class="s-b">' + esc(p.brand) + ' · ' + money(p.price) + '</span></span></a>';
          }).join('');
          if (results.length) {
            out.insertAdjacentHTML('beforeend',
              '<a href="shop.html?q=' + encodeURIComponent(input.value) + '"><span class="s-t">See all results for “' + esc(input.value) + '”</span></a>');
          }
        }, 140);
      });

      input.addEventListener('blur', function () {
        setTimeout(function () { out.innerHTML = ''; }, 180);
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = input.value.trim();
        if (q) location.href = 'shop.html?q=' + encodeURIComponent(q);
      });
    });
  }

  /* ---- dialogs ----------------------------------------------------------- */

  function openDialog(dlg, opener) {
    if (!dlg) return;
    dlg.__opener = opener || document.activeElement;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    document.documentElement.style.overflow = 'hidden';
    var first = dlg.querySelector('[autofocus], button, a[href], input, select');
    if (first) first.focus();
  }

  function closeDialog(dlg) {
    if (!dlg) return;
    if (typeof dlg.close === 'function' && dlg.open) dlg.close();
    else dlg.removeAttribute('open');
    document.documentElement.style.overflow = '';
    if (dlg.__opener && document.contains(dlg.__opener)) dlg.__opener.focus();
  }

  function wireDialogDismiss(dlg) {
    if (!dlg) return;
    dlg.addEventListener('close', function () { document.documentElement.style.overflow = ''; });
    // Click on the backdrop area (outside the dialog's own box) closes it
    dlg.addEventListener('click', function (e) {
      if (e.target !== dlg) return;
      var r = dlg.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) closeDialog(dlg);
    });
  }

  function wireMobileSheet() {
    var sheet = qs('#nav-sheet');
    if (!sheet) return;
    wireDialogDismiss(sheet);
    qsa('[data-open-nav]').forEach(function (btn) {
      btn.addEventListener('click', function () { openDialog(sheet, btn); });
    });
    qsa('[data-close-nav]', sheet).forEach(function (btn) {
      btn.addEventListener('click', function () { closeDialog(sheet); });
    });
  }

  /* ---- bag drawer -------------------------------------------------------- */

  function bagDrawerHtml() {
    var lines = getBag();
    if (!lines.length) {
      return '<div class="empty"><h2>Your bag is empty</h2>' +
        '<p>Nothing in here yet. The new-season arrivals are a reasonable place to start.</p>' +
        '<a class="btn btn-primary" href="shop.html?sort=newest">Shop new in</a></div>';
    }
    var t = totals(lines);
    var html = '<div>' + lines.map(function (l) {
      var p = BY_ID[l.id];
      var max = stockFor(p, l.size);
      return '<div class="line">' +
        '<a href="' + productUrl(p) + '"><img src="' + esc(p.images[0]) + '" alt="' + esc(altText(p, 0)) + '" loading="lazy" decoding="async"></a>' +
        '<div class="line-main">' +
          '<div class="line-top">' +
            '<div><p class="card-brand">' + esc(p.brand) + '</p>' +
            '<p class="card-title"><a href="' + productUrl(p) + '">' + esc(p.title) + '</a></p>' +
            '<p class="micro meta">' + esc(p.colour) + ' · ' + esc(l.size) + '</p></div>' +
            '<p class="num" style="font-weight:600">' + money(p.price * l.qty) + '</p>' +
          '</div>' +
          '<div class="line-actions">' +
            qtyStepperHtml(l, max) +
            '<button type="button" class="linkbtn" data-remove="' + esc(l.id) + '" data-size="' + esc(l.size) + '">Remove</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';

    html += '<div class="mt-5">' + freeShipHtml(t) + '</div>';
    return html;
  }

  function qtyStepperHtml(line, max) {
    return '<div class="stepper" role="group" aria-label="Quantity">' +
      '<button type="button" data-qty="-1" data-id="' + esc(line.id) + '" data-size="' + esc(line.size) + '"' +
        (line.qty <= 1 ? ' disabled' : '') + ' aria-label="Decrease quantity">&minus;</button>' +
      '<output class="num">' + line.qty + '</output>' +
      '<button type="button" data-qty="1" data-id="' + esc(line.id) + '" data-size="' + esc(line.size) + '"' +
        (line.qty >= max ? ' disabled' : '') + ' aria-label="Increase quantity">+</button>' +
    '</div>';
  }

  function freeShipHtml(t) {
    if (t.count === 0) return '';
    var pct = Math.min(100, (Math.max(0, t.subtotal - t.discount) / FREE_SHIP) * 100);
    var done = t.toFreeShipping === 0;
    return '<p class="progress-note">' + (done
        ? '<b>Free standard delivery</b> applies to this order.'
        : 'Add <b class="num">' + money(t.toFreeShipping) + '</b> for free standard delivery Australia-wide.') +
      '</p><div class="progress" data-complete="' + done + '"><i style="width:' + pct.toFixed(1) + '%"></i></div>';
  }

  function renderBagDrawer() {
    var body = qs('#bag-drawer .drawer-body');
    var foot = qs('#bag-drawer .drawer-foot');
    if (!body) return;
    body.innerHTML = bagDrawerHtml();
    var t = totals();
    if (foot) {
      foot.hidden = t.count === 0;
      if (t.count > 0) {
        foot.innerHTML =
          '<div class="flex between items-baseline mb-4"><span>Subtotal</span>' +
          '<b class="num">' + money(t.subtotal) + '</b></div>' +
          '<p class="micro meta mb-4">Delivery and any discounts are calculated at checkout. Prices include GST.</p>' +
          '<a class="btn btn-primary btn-block" href="checkout.html">Checkout</a>' +
          '<a class="btn btn-secondary btn-block mt-3" href="cart.html">View bag</a>';
      }
    }
    var count = qs('#bag-drawer [data-drawer-count]');
    if (count) count.textContent = t.count === 1 ? '1 item' : t.count + ' items';
  }

  function wireBagDrawer() {
    var drawer = qs('#bag-drawer');
    if (!drawer) return;
    wireDialogDismiss(drawer);

    qsa('[data-open-bag]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        renderBagDrawer();
        openDialog(drawer, btn);
      });
    });
    qsa('[data-close-bag]', drawer).forEach(function (btn) {
      btn.addEventListener('click', function () { closeDialog(drawer); });
    });

    drawer.addEventListener('click', function (e) {
      var qty = e.target.closest('[data-qty]');
      if (qty) {
        var id = qty.getAttribute('data-id');
        var size = qty.getAttribute('data-size');
        var delta = parseInt(qty.getAttribute('data-qty'), 10);
        var line = getBag().filter(function (l) { return l.id === id && l.size === size; })[0];
        if (line) setQty(id, size, line.qty + delta);
        renderBagDrawer();
        return;
      }
      var rm = e.target.closest('[data-remove]');
      if (rm) {
        removeLine(rm.getAttribute('data-remove'), rm.getAttribute('data-size'));
        renderBagDrawer();
      }
    });
  }

  /* ==========================================================================
     Delegated global actions: wishlist toggle, quick add
     ====================================================================== */

  function wireGlobalActions() {
    document.addEventListener('click', function (e) {
      var wish = e.target.closest('[data-wish]');
      if (wish) {
        e.preventDefault();
        var id = wish.getAttribute('data-wish');
        var added = toggleWishlist(id);
        var p = BY_ID[id];
        toast(added
          ? esc(p.title) + ' saved to your wishlist.'
          : esc(p.title) + ' removed from your wishlist.',
          added ? ' <a href="wishlist.html">View</a>' : '');
        return;
      }

      var quick = e.target.closest('[data-quick-add]');
      if (quick && !quick.disabled) {
        e.preventDefault();
        var pid = quick.getAttribute('data-quick-add');
        var res = addToBag(pid, quick.getAttribute('data-size'), 1);
        var prod = BY_ID[pid];
        if (res.ok) toast('Added ' + esc(prod.title) + ' (' + esc(quick.getAttribute('data-size')) + ') to your bag.', ' <a href="cart.html">View bag</a>');
        else if (res.reason === 'max') toast('Only ' + res.max + ' left in that size — your bag already has them all.');
        else toast('That size is sold out.');
      }
    });

    document.addEventListener('bag:change', function () {
      syncCounts();
      if (qs('#bag-drawer[open]')) renderBagDrawer();
    });
    document.addEventListener('wishlist:change', syncCounts);
  }

  /* ==========================================================================
     Public API
     ====================================================================== */

  window.Antipode = {
    catalog: CAT,
    products: CAT.products,
    meta: META,
    byId: function (id) { return BY_ID[id]; },
    collections: CAT.collections,

    money: money, AU_DATE: AU_DATE, AU_DAY: AU_DAY,
    esc: esc, el: el, qs: qs, qsa: qsa, params: params,
    ICON: ICON, stars: stars, priceHtml: priceHtml,
    productUrl: productUrl, altText: altText,

    cardHtml: cardHtml, renderGrid: renderGrid,
    CATEGORY_LABEL: CATEGORY_LABEL, categoriesFor: categoriesFor, brandsFor: brandsFor,
    shopHref: shopHref, searchProducts: searchProducts,

    getBag: getBag, addToBag: addToBag, setQty: setQty, removeLine: removeLine,
    clearBag: clearBag, bagCount: bagCount, stockFor: stockFor,
    getWishlist: getWishlist, inWishlist: inWishlist, toggleWishlist: toggleWishlist,
    pushRecent: pushRecent, getRecent: getRecent,
    getOrders: getOrders, saveOrder: saveOrder,
    getAddresses: getAddresses, setAddresses: setAddresses,
    getPrefs: getPrefs, setPrefs: setPrefs,
    getPromo: getPromo, setPromo: setPromo,

    totals: totals, applyPromo: applyPromo, SHIPPING: SHIPPING,
    FREE_SHIP: FREE_SHIP, GST_RATE: GST_RATE, freeShipHtml: freeShipHtml,
    qtyStepperHtml: qtyStepperHtml,

    estimate: estimate, stateFor: stateFor, STATE_NAMES: STATE_NAMES,
    addBusinessDays: addBusinessDays,

    toast: toast, stagger: stagger, syncCounts: syncCounts,
    openDialog: openDialog, closeDialog: closeDialog, wireDialogDismiss: wireDialogDismiss,
    renderBagDrawer: renderBagDrawer,
  };

  /* ==========================================================================
     Boot
     ====================================================================== */

  function boot() {
    document.documentElement.classList.add('js');
    buildHeader();
    wireGlobalActions();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
