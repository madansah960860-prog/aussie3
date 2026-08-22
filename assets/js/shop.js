/* ============================================================================
   ANTIPODE — shop listing
   Every filter is written to the URL, so any view is linkable, shareable and
   survives a reload or a back button.
   ========================================================================= */

(function () {
  'use strict';

  var A = window.Antipode;
  if (!A) return;
  var qs = A.qs, qsa = A.qsa, esc = A.esc, money = A.money;

  var PAGE = 24;

  /* ==========================================================================
     Derived facets
     ====================================================================== */

  /* A colour can belong to more than one family: "Steel and gold" is findable
     under both Grey and Gold, which is what a shopper expects. */
  var COLOUR_FAMILIES = [
    { key: 'black',  label: 'Black',         test: /black|blackout/ },
    { key: 'white',  label: 'White & ivory', test: /white|ivory|cream|off-white/ },
    { key: 'grey',   label: 'Grey & steel',  test: /grey|charcoal|steel|silver/ },
    { key: 'blue',   label: 'Blue',          test: /blue|navy|cobalt|sky/ },
    { key: 'green',  label: 'Green',         test: /green|sage|malachite/ },
    { key: 'red',    label: 'Red',           test: /red|burgundy|maroon/ },
    { key: 'pink',   label: 'Pink & rose',   test: /pink|rose/ },
    { key: 'purple', label: 'Purple',        test: /purple/ },
    { key: 'brown',  label: 'Brown & tan',   test: /brown|tan|camel|sand|ochre|nude/ },
    { key: 'gold',   label: 'Gold & brass',  test: /gold|brass/ },
    { key: 'multi',  label: 'Print & multi', test: /multi|assorted|floral|print|check|tartan|plaid|spot|stripe/ },
  ];

  function familiesOf(colour) {
    var c = String(colour).toLowerCase();
    var hit = COLOUR_FAMILIES.filter(function (f) { return f.test.test(c); }).map(function (f) { return f.key; });
    return hit.length ? hit : ['multi'];
  }

  A.products.forEach(function (p) { p._fam = familiesOf(p.colour); });

  /* Price buckets, not a slider: this catalogue runs from A$15 to A$26,000, a
     range no linear slider can address usefully. */
  var PRICE_BUCKETS = [
    { key: 'u100',  label: 'Under A$100',       min: 0,    max: 100 },
    { key: '100',   label: 'A$100 – A$250',     min: 100,  max: 250 },
    { key: '250',   label: 'A$250 – A$500',     min: 250,  max: 500 },
    { key: '500',   label: 'A$500 – A$1,500',   min: 500,  max: 1500 },
    { key: '1500',  label: 'A$1,500 and above', min: 1500, max: Infinity },
  ];

  var SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size'];
  function sizeRank(s) {
    var i = SIZE_ORDER.indexOf(s);
    if (i !== -1) return i < 6 ? i : 999;
    var n = parseFloat(String(s).replace('AU ', ''));
    return 100 + (isNaN(n) ? 0 : n);
  }
  var ALL_SIZES = (function () {
    var set = {};
    A.products.forEach(function (p) { p.sizes.forEach(function (s) { set[s] = 1; }); });
    return Object.keys(set).sort(function (a, b) { return sizeRank(a) - sizeRank(b); });
  })();

  var GENDERS = [
    { key: 'women', label: 'Womenswear' },
    { key: 'men', label: 'Menswear' },
    { key: 'unisex', label: 'Unisex' },
  ];

  /* ==========================================================================
     State <-> URL
     ====================================================================== */

  var MULTI = ['gender', 'category', 'brand', 'colour', 'size', 'price'];

  function readUrl() {
    var sp = A.params();
    var s = { sort: sp.get('sort') || 'featured', q: (sp.get('q') || '').trim(), sale: sp.get('sale') === '1', instock: sp.get('instock') === '1', shown: PAGE };
    MULTI.forEach(function (k) {
      var v = sp.get(k);
      s[k] = v ? v.split(',').map(function (x) { return decodeURIComponent(x).trim(); }).filter(Boolean) : [];
    });
    return s;
  }

  function writeUrl(push) {
    var sp = new URLSearchParams();
    MULTI.forEach(function (k) { if (state[k].length) sp.set(k, state[k].join(',')); });
    if (state.q) sp.set('q', state.q);
    if (state.sale) sp.set('sale', '1');
    if (state.instock) sp.set('instock', '1');
    if (state.sort !== 'featured') sp.set('sort', state.sort);
    var url = location.pathname + (sp.toString() ? '?' + sp.toString() : '');
    if (push) history.pushState(null, '', url); else history.replaceState(null, '', url);
  }

  var state = readUrl();

  /* ==========================================================================
     Filtering
     ====================================================================== */

  /**
   * @param {object} st  state to apply
   * @param {string} [skip]  dimension to ignore, so a facet can count the
   *                         options it would offer rather than the ones already
   *                         selected within itself
   */
  function match(p, st, skip) {
    if (skip !== 'gender' && st.gender.length) {
      var okGender = st.gender.indexOf(p.gender) !== -1;
      // Choosing a department also surfaces the unisex pieces, which is what a
      // shopper browsing "Menswear" expects of the sunglasses and jewellery.
      if (!okGender && p.gender === 'unisex' &&
          (st.gender.indexOf('women') !== -1 || st.gender.indexOf('men') !== -1)) okGender = true;
      if (!okGender) return false;
    }
    if (skip !== 'category' && st.category.length && st.category.indexOf(p.category) === -1) return false;
    if (skip !== 'brand' && st.brand.length && st.brand.indexOf(p.brand) === -1) return false;
    if (skip !== 'colour' && st.colour.length && !st.colour.some(function (c) { return p._fam.indexOf(c) !== -1; })) return false;
    if (skip !== 'size' && st.size.length && !st.size.some(function (sz) { return A.stockFor(p, sz) > 0; })) return false;
    if (skip !== 'price' && st.price.length) {
      var ok = st.price.some(function (key) {
        var b = PRICE_BUCKETS.filter(function (x) { return x.key === key; })[0];
        return b && p.price >= b.min && p.price < b.max;
      });
      if (!ok) return false;
    }
    if (skip !== 'sale' && st.sale && !p.onSale) return false;
    if (skip !== 'instock' && st.instock && p.totalStock < 1) return false;
    return true;
  }

  function searchSet(q) {
    if (!q) return null;
    var ids = {};
    A.searchProducts(q, 200).forEach(function (p) { ids[p.id] = 1; });
    return ids;
  }

  function results(st, skip) {
    var ids = searchSet(st.q);
    return A.products.filter(function (p) {
      if (ids && !ids[p.id]) return false;
      return match(p, st, skip);
    });
  }

  var SORTS = {
    featured: function (a, b) {
      var sa = (a.isNew ? 2 : 0) + (a.onSale ? 1 : 0);
      var sb = (b.isNew ? 2 : 0) + (b.onSale ? 1 : 0);
      return sb - sa || b.rating - a.rating || a.title.localeCompare(b.title);
    },
    newest: function (a, b) { return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.rating - a.rating; },
    'price-asc': function (a, b) { return a.price - b.price; },
    'price-desc': function (a, b) { return b.price - a.price; },
    rating: function (a, b) { return b.rating - a.rating || b.reviewCount - a.reviewCount; },
    name: function (a, b) { return a.title.localeCompare(b.title); },
  };

  /* ==========================================================================
     Facet rendering
     ====================================================================== */

  function countsFor(dimension, keyOf) {
    var pool = results(state, dimension);
    var counts = {};
    pool.forEach(function (p) {
      var keys = keyOf(p);
      (Array.isArray(keys) ? keys : [keys]).forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
    });
    return counts;
  }

  function checkRow(dim, value, label, count) {
    var on = state[dim].indexOf(value) !== -1;
    var disabled = !count && !on;
    return '<label class="check' + (disabled ? ' is-off' : '') + '">' +
      '<input type="checkbox" data-dim="' + dim + '" value="' + esc(value) + '"' +
        (on ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' +
      '<span>' + esc(label) + '</span>' +
      '<span class="facet-count">' + (count || 0) + '</span>' +
    '</label>';
  }

  function facet(title, bodyHtml, open) {
    return '<details class="facet"' + (open ? ' open' : '') + '>' +
      '<summary>' + esc(title) + '</summary>' +
      '<div class="facet-body">' + bodyHtml + '</div>' +
    '</details>';
  }

  function renderFacets() {
    var host = qs('[data-facets]');
    if (!host) return;

    var gc = countsFor('gender', function (p) { return p.gender; });
    var cc = countsFor('category', function (p) { return p.category; });
    var bc = countsFor('brand', function (p) { return p.brand; });
    var fc = countsFor('colour', function (p) { return p._fam; });
    var pc = countsFor('price', function (p) {
      var b = PRICE_BUCKETS.filter(function (x) { return p.price >= x.min && p.price < x.max; })[0];
      return b ? b.key : [];
    });
    var szPool = results(state, 'size');
    var sc = {};
    ALL_SIZES.forEach(function (s) {
      sc[s] = szPool.filter(function (p) { return A.stockFor(p, s) > 0; }).length;
    });

    var html = '';

    html += facet('Department', GENDERS.map(function (g) {
      return checkRow('gender', g.key, g.label, gc[g.key]);
    }).join(''), true);

    html += facet('Category', A.catalog.categories.map(function (c) {
      return checkRow('category', c, A.CATEGORY_LABEL[c] || c, cc[c]);
    }).join(''), true);

    html += facet('Size', '<div class="sizegrid">' + ALL_SIZES.map(function (s) {
      var on = state.size.indexOf(s) !== -1;
      var off = !sc[s] && !on;
      return '<label' + (off ? ' class="is-off"' : '') + '>' +
        '<input type="checkbox" data-dim="size" value="' + esc(s) + '"' + (on ? ' checked' : '') + (off ? ' disabled' : '') + '>' +
        '<span>' + esc(s) + '</span></label>';
    }).join('') + '</div>', true);

    html += facet('Price', PRICE_BUCKETS.map(function (b) {
      return checkRow('price', b.key, b.label, pc[b.key]);
    }).join(''), true);

    html += facet('Colour', COLOUR_FAMILIES.map(function (f) {
      return checkRow('colour', f.key, f.label, fc[f.key]);
    }).join(''), false);

    html += facet('Label', A.catalog.brands.map(function (b) {
      return checkRow('brand', b, b, bc[b]);
    }).join(''), false);

    var saleCount = results(state, 'sale').filter(function (p) { return p.onSale; }).length;
    html += facet('Availability',
      '<label class="check"><input type="checkbox" data-flag="sale"' + (state.sale ? ' checked' : '') + '>' +
        '<span>On sale only</span><span class="facet-count">' + saleCount + '</span></label>' +
      '<label class="check"><input type="checkbox" data-flag="instock"' + (state.instock ? ' checked' : '') + '>' +
        '<span>In stock only</span></label>', true);

    host.innerHTML = html;
  }

  /* ==========================================================================
     Applied chips + heading
     ====================================================================== */

  function labelFor(dim, value) {
    if (dim === 'gender') return (GENDERS.filter(function (g) { return g.key === value; })[0] || {}).label || value;
    if (dim === 'category') return A.CATEGORY_LABEL[value] || value;
    if (dim === 'colour') return (COLOUR_FAMILIES.filter(function (f) { return f.key === value; })[0] || {}).label || value;
    if (dim === 'price') return (PRICE_BUCKETS.filter(function (b) { return b.key === value; })[0] || {}).label || value;
    return value;
  }

  function renderApplied() {
    var host = qs('[data-applied]');
    var chips = [];
    MULTI.forEach(function (dim) {
      state[dim].forEach(function (v) {
        chips.push('<button type="button" class="chip" data-remove-dim="' + dim + '" data-value="' + esc(v) + '">' +
          esc(labelFor(dim, v)) +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
          '<span class="sr-only">Remove filter</span></button>');
      });
    });
    if (state.sale) chips.push('<button type="button" class="chip" data-remove-flag="sale">On sale only<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg><span class="sr-only">Remove filter</span></button>');
    if (state.instock) chips.push('<button type="button" class="chip" data-remove-flag="instock">In stock only<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg><span class="sr-only">Remove filter</span></button>');
    if (state.q) chips.push('<button type="button" class="chip" data-remove-q>Search: ' + esc(state.q) + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg><span class="sr-only">Clear search</span></button>');

    host.innerHTML = chips.join('');
    host.hidden = chips.length === 0;

    var n = chips.length;
    qsa('[data-clear-all]').forEach(function (b) { b.hidden = n === 0; });
    var badge = qs('[data-active-count]');
    if (badge) badge.textContent = n ? '(' + n + ')' : '';
  }

  var GENDER_WORD = { women: 'Womenswear', men: 'Menswear', unisex: 'Unisex' };

  function renderHeading(total) {
    var title, blurb = '';

    if (state.q) {
      title = 'Search results';
      blurb = 'Showing what matches “' + state.q + '”.';
    } else if (state.sale && !state.category.length) {
      title = 'Sale';
      blurb = 'Reduced while stock lasts. Sale pieces are final sizes and can still be returned within 30 days.';
    } else {
      var g = state.gender.length === 1 ? GENDER_WORD[state.gender[0]] : null;
      var c = state.category.length === 1 ? (A.CATEGORY_LABEL[state.category[0]] || state.category[0]) : null;
      if (g && c) title = c + ' — ' + g;
      else if (c) title = c;
      else if (g) title = g;
      else title = 'Everything';

      if (c && !g) blurb = CATEGORY_BLURB[state.category[0]] || '';
      else if (g && !c) blurb = g === 'Womenswear'
        ? 'Dresses, tailoring, knitwear, shoes, bags and fine jewellery.'
        : g === 'Menswear' ? 'Shirting, outerwear, sneakers and watches.'
        : 'Pieces we buy without a department in mind.';
    }

    qs('[data-title]').textContent = title;
    var b = qs('[data-blurb]');
    b.textContent = blurb;
    b.hidden = !blurb;
    document.title = title + ' — ANTIPODE';

    // breadcrumb
    var crumbs = ['<a href="index.html">Home</a>'];
    if (state.gender.length === 1 || state.category.length) crumbs.push('<a href="shop.html">Shop</a>');
    if (state.gender.length === 1) {
      crumbs.push(state.category.length
        ? '<a href="' + A.shopHref({ gender: state.gender[0] }) + '">' + GENDER_WORD[state.gender[0]] + '</a>'
        : '<span aria-current="page">' + GENDER_WORD[state.gender[0]] + '</span>');
    }
    if (state.category.length === 1) {
      crumbs.push('<span aria-current="page">' + esc(A.CATEGORY_LABEL[state.category[0]] || state.category[0]) + '</span>');
    }
    if (crumbs.length === 1) crumbs.push('<span aria-current="page">Shop</span>');
    qs('[data-crumbs]').innerHTML = crumbs.join('<span class="sep" aria-hidden="true">/</span>');
  }

  var CATEGORY_BLURB = {
    shirts: 'Poplin, flannel and overshirts. Australian sizing, fit notes on every product page.',
    tops: 'Jersey, knit and technical. The layer you wear on its own indoors.',
    outerwear: 'Waxed cotton, wool and taped-seam shells, bought for the southerly.',
    dresses: 'Day, evening and two-piece sets. Measured length listed on every page.',
    shoes: 'Sneakers, heels and flats in Australian sizing, which follows UK.',
    bags: 'Totes, top-handles and backpacks. Dimensions listed, no guessing.',
    jewellery: 'Solid gold, sterling silver and plated brass, priced accordingly.',
    watches: 'Quartz through to Swiss automatic. Above A$3,000 ships insured with a five-year service plan.',
    eyewear: 'Acetate, metal and bio-acetate frames. Lens category listed on every page.',
  };

  /* ==========================================================================
     Render
     ====================================================================== */

  function render(resetPaging) {
    if (resetPaging) state.shown = PAGE;

    var list = results(state).sort(SORTS[state.sort] || SORTS.featured);
    var total = list.length;
    var page = list.slice(0, state.shown);

    var grid = qs('[data-grid]');
    var empty = qs('[data-empty]');
    var more = qs('[data-more]');

    if (total === 0) {
      grid.innerHTML = '';
      grid.hidden = true;
      empty.hidden = false;
      more.hidden = true;
    } else {
      grid.hidden = false;
      empty.hidden = true;
      A.renderGrid(grid, page, { eagerCount: 4 });
      more.hidden = state.shown >= total;
      more.textContent = 'Load more (' + Math.min(PAGE, total - state.shown) + ' of ' + (total - state.shown) + ' remaining)';
    }

    qs('[data-count]').textContent = total === 0
      ? 'No products'
      : total === 1 ? '1 product'
      : 'Showing ' + page.length + ' of ' + total + ' products';

    var apply = qs('[data-apply-label]');
    if (apply) apply.textContent = total === 1 ? 'Show 1 product' : 'Show ' + total + ' products';

    qs('[data-sort]').value = state.sort;

    renderFacets();
    renderApplied();
    renderHeading(total);
    A.syncCounts();
  }

  /* ==========================================================================
     Events
     ====================================================================== */

  function toggle(dim, value) {
    var i = state[dim].indexOf(value);
    if (i === -1) state[dim].push(value); else state[dim].splice(i, 1);
    writeUrl(true);
    render(true);
  }

  qs('#filters').addEventListener('change', function (e) {
    var dim = e.target.getAttribute('data-dim');
    if (dim) { toggle(dim, e.target.value); return; }
    var flag = e.target.getAttribute('data-flag');
    if (flag) {
      state[flag] = e.target.checked;
      writeUrl(true);
      render(true);
    }
  });

  qs('#filters').addEventListener('submit', function (e) { e.preventDefault(); });

  document.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-remove-dim]');
    if (chip) { toggle(chip.getAttribute('data-remove-dim'), chip.getAttribute('data-value')); return; }

    var flag = e.target.closest('[data-remove-flag]');
    if (flag) { state[flag.getAttribute('data-remove-flag')] = false; writeUrl(true); render(true); return; }

    if (e.target.closest('[data-remove-q]')) { state.q = ''; writeUrl(true); render(true); return; }

    if (e.target.closest('[data-clear-all]') || e.target.closest('[data-clear-all-2]')) {
      MULTI.forEach(function (k) { state[k] = []; });
      state.sale = false; state.instock = false; state.q = '';
      writeUrl(true);
      render(true);
      return;
    }

    if (e.target.closest('[data-more]')) {
      state.shown += PAGE;
      render(false);
      // move focus to the first newly added card so keyboard users are not dumped at the top
      var cards = qsa('[data-grid] .card');
      var first = cards[state.shown - PAGE];
      if (first) { var link = qs('a', first); if (link) link.focus(); }
    }
  });

  qs('[data-sort]').addEventListener('change', function (e) {
    state.sort = e.target.value;
    writeUrl(true);
    render(true);
  });

  window.addEventListener('popstate', function () {
    state = readUrl();
    render(true);
  });

  /* ---- mobile filter sheet: move the one form in and out ------------------ */

  var sheet = qs('#filter-sheet');
  var slot = qs('[data-filter-slot]');
  var home = qs('[data-filter-home]');
  var form = qs('#filters');

  if (sheet) {
    A.wireDialogDismiss(sheet);
    qsa('[data-open-filters]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        slot.appendChild(form);
        form.classList.add('in-sheet');
        A.openDialog(sheet, btn);
      });
    });
    qsa('[data-close-filters]', sheet).forEach(function (btn) {
      btn.addEventListener('click', function () { A.closeDialog(sheet); });
    });
    sheet.addEventListener('close', function () {
      home.appendChild(form);
      form.classList.remove('in-sheet');
    });
  }

  render(true);
})();
