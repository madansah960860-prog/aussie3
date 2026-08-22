/* ============================================================================
   ANTIPODE — product detail
   ========================================================================= */

(function () {
  'use strict';

  var A = window.Antipode;
  if (!A) return;
  var qs = A.qs, qsa = A.qsa, esc = A.esc, money = A.money;

  var id = A.params().get('id');
  var p = id && A.byId(id);
  var host = qs('[data-pdp]');

  if (!p) {
    document.title = 'Product not found — ANTIPODE';
    qs('[data-crumbs]').innerHTML =
      '<a href="index.html">Home</a><span class="sep" aria-hidden="true">/</span>' +
      '<a href="shop.html">Shop</a><span class="sep" aria-hidden="true">/</span>' +
      '<span aria-current="page">Not found</span>';
    host.innerHTML =
      '<div class="empty"><h2>We could not find that product</h2>' +
      '<p>It may have sold through, or the link may be incomplete. Everything currently in store is on the shop page.</p>' +
      '<a class="btn btn-primary" href="shop.html">Shop everything</a></div>';
    return;
  }

  document.title = p.brand + ' ' + p.title + ' — ANTIPODE';
  A.pushRecent(p.id);

  var GENDER_WORD = { women: 'Womenswear', men: 'Menswear', unisex: 'Unisex' };

  qs('[data-crumbs]').innerHTML = [
    '<a href="index.html">Home</a>',
    '<a href="' + A.shopHref({ gender: p.gender }) + '">' + GENDER_WORD[p.gender] + '</a>',
    '<a href="' + A.shopHref({ gender: p.gender, category: p.category }) + '">' +
      esc(A.CATEGORY_LABEL[p.category] || p.category) + '</a>',
    '<span aria-current="page">' + esc(p.title) + '</span>',
  ].join('<span class="sep" aria-hidden="true">/</span>');

  /* ==========================================================================
     Selection state
     ====================================================================== */

  var oneSize = p.sizes.length === 1;
  var selected = oneSize ? p.sizes[0] : null;

  /* Pre-select the shopper's saved size when it is actually available. */
  var prefs = A.getPrefs();
  if (!selected) {
    var want = p.category === 'shoes' ? prefs.shoe : prefs.clothing;
    if (want && p.sizes.indexOf(want) !== -1 && A.stockFor(p, want) > 0) selected = want;
  }

  /* ==========================================================================
     Render
     ====================================================================== */

  function galleryHtml() {
    var imgs = '<div class="gallery" data-gallery>' + p.images.map(function (src, i) {
      return '<img src="' + esc(src) + '" alt="' + esc(A.altText(p, i)) + '" width="1000" height="1250" ' +
        (i === 0 ? 'fetchpriority="high"' : 'loading="lazy"') + ' decoding="async">';
    }).join('') + '</div>';

    // Below 960px the gallery is a swipe rail; without an indicator there is no
    // sign that more photographs exist.
    var dots = p.images.length > 1
      ? '<div class="gallery-dots" data-dots role="tablist" aria-label="Product images">' +
          p.images.map(function (_, i) {
            return '<button type="button" role="tab" data-dot="' + i + '"' +
              ' aria-selected="' + (i === 0) + '" aria-label="Image ' + (i + 1) + ' of ' + p.images.length + '"></button>';
          }).join('') +
        '</div>'
      : '';

    return '<div class="gallery-wrap">' + imgs + dots + '</div>';
  }

  function wireGallery() {
    var rail = qs('[data-gallery]');
    var dots = qsa('[data-dot]');
    if (!rail || !dots.length) return;

    function activeIndex() {
      var mid = rail.scrollLeft + rail.clientWidth / 2;
      var best = 0, bestDist = Infinity;
      Array.prototype.forEach.call(rail.children, function (img, i) {
        var c = img.offsetLeft + img.offsetWidth / 2;
        var d = Math.abs(c - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    }

    var frame;
    rail.addEventListener('scroll', function () {
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = null;
        var i = activeIndex();
        dots.forEach(function (d, di) { d.setAttribute('aria-selected', String(di === i)); });
      });
    }, { passive: true });

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        var target = rail.children[i];
        if (target) rail.scrollTo({ left: target.offsetLeft - rail.offsetLeft, behavior: 'smooth' });
      });
    });
  }

  function sizesHtml() {
    if (oneSize) {
      return '<p class="small muted">One size</p>';
    }
    return '<div class="sizes" role="group" aria-label="Choose a size">' + p.sizes.map(function (s) {
      var n = A.stockFor(p, s);
      var out = n < 1;
      return '<button type="button" data-size="' + esc(s) + '"' +
        ' aria-pressed="' + (selected === s) + '"' +
        (out ? ' aria-disabled="true"' : '') +
        ' aria-label="' + esc(s) + (out ? ', sold out' : n <= 3 ? ', only ' + n + ' left' : '') + '">' +
        esc(s) + '</button>';
    }).join('') + '</div>';
  }

  function stockHtml() {
    if (!selected) {
      return '<p class="stockline"><span class="dot" style="background:var(--line-strong)"></span>Choose a size to see availability</p>';
    }
    var n = A.stockFor(p, selected);
    if (n < 1) return '<p class="stockline out"><span class="dot"></span>' + esc(selected) + ' is sold out</p>';
    if (n <= 3) return '<p class="stockline low"><span class="dot"></span>Only ' + n + ' left in ' + esc(selected) + '</p>';
    return '<p class="stockline ok"><span class="dot"></span>In stock in ' + esc(selected) + '</p>';
  }

  function pay4Html() {
    if (p.price < 50) return '';
    return '<div class="payin4"><span>or 4 interest-free payments of</span> <b>' +
      money(p.price / 4) + '</b> <span>fortnightly</span></div>';
  }

  function reviewsHtml() {
    return p.reviews.map(function (r) {
      return '<article class="review">' +
        '<div class="review-head">' +
          A.stars(r.rating) +
          '<span class="who">' + esc(r.name) + '</span>' +
          '<span class="micro meta">' + esc(r.place) + '</span>' +
          (r.verified ? '<span class="verified">Verified purchase</span>' : '') +
        '</div>' +
        '<p class="small">' + esc(r.body) + '</p>' +
        '<p class="micro meta mt-2">' +
          (r.size ? 'Bought ' + esc(r.size) + ' · ' : '') +
          '<time datetime="' + esc(r.date) + '">' + A.AU_DATE.format(new Date(r.date)) + '</time>' +
        '</p>' +
      '</article>';
    }).join('');
  }

  function render() {
    host.innerHTML =
      '<div class="pdp">' +
        galleryHtml() +

        '<div class="pdp-info">' +
          '<div>' +
            '<a class="pdp-brand" href="' + A.shopHref({ brand: p.brand }) + '">' + esc(p.brand) + '</a>' +
            '<h1 class="mt-2">' + esc(p.title) + '</h1>' +
          '</div>' +

          '<div class="pdp-price">' +
            '<span class="now"' + (p.onSale ? ' style="color:var(--sale)"' : '') + '>' + money(p.price) + '</span>' +
            (p.compareAt
              ? '<span class="was"><span class="sr-only">Was </span>' + money(p.compareAt) + '</span>' +
                '<span class="off" style="color:var(--sale);font-weight:600">Save ' +
                  Math.round((1 - p.price / p.compareAt) * 100) + '%</span>'
              : '') +
          '</div>' +
          '<p class="micro meta">Price includes GST</p>' +

          '<p class="small"><a class="textlink" href="#reviews">' + A.stars(p.rating, p.reviewCount) + '</a></p>' +

          '<p class="small muted">Colour: <b style="color:var(--ink)">' + esc(p.colour) + '</b></p>' +

          '<div>' +
            '<div class="flex between items-baseline mb-3">' +
              '<span class="fieldset-label">Size</span>' +
              '<a class="linkbtn" href="about.html#sizing">Size guide</a>' +
            '</div>' +
            sizesHtml() +
            '<div data-stock class="mt-3">' + stockHtml() + '</div>' +
            '<p class="err" data-size-error role="alert" style="display:none">Choose a size first.</p>' +
          '</div>' +

          '<div class="pdp-actions">' +
            '<button type="button" class="btn btn-primary grow" data-add>Add to bag</button>' +
            '<button type="button" class="btn btn-secondary" data-wish="' + esc(p.id) + '" ' +
              'aria-pressed="' + A.inWishlist(p.id) + '">' + A.ICON.heart + '<span>Save</span></button>' +
          '</div>' +

          pay4Html() +

          '<div class="estimator">' +
            '<div class="flex gap-3 items-center mb-3">' + A.ICON.truck.replace('<svg', '<svg style="width:20px;height:20px;color:var(--ink-2)"') +
              '<span class="small"><b>Free standard delivery over ' + money(A.FREE_SHIP) + '</b></span></div>' +
            '<div class="estimator-row">' +
              '<div class="field"><label for="pc">Delivery estimate to postcode</label>' +
                '<input id="pc" type="text" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="2010" autocomplete="postal-code"></div>' +
              '<button type="button" class="btn btn-secondary" data-estimate>Check</button>' +
            '</div>' +
            '<p class="estimator-out" data-estimate-out role="status" aria-live="polite">' +
              'Dispatches from Sydney in ' + p.shipsInDays + ' business day' + (p.shipsInDays === 1 ? '' : 's') + '.</p>' +
          '</div>' +

          '<div class="mt-4">' +
            '<details class="accordion" open><summary>Description</summary>' +
              '<div class="accordion-body"><p>' + esc(p.description) + '</p></div></details>' +

            '<details class="accordion"><summary>Details &amp; materials</summary>' +
              '<div class="accordion-body"><dl class="spec">' +
                '<dt>Material</dt><dd>' + esc(p.material) + '</dd>' +
                '<dt>Colour</dt><dd>' + esc(p.colour) + '</dd>' +
                '<dt>Fit</dt><dd>' + esc(p.fit) + '</dd>' +
                '<dt>Made</dt><dd>' + esc(p.origin) + '</dd>' +
                '<dt>Care</dt><dd>' + esc(p.care) + '</dd>' +
                '<dt>Item code</dt><dd class="num">' + esc(p.sku) + '</dd>' +
              '</dl></div></details>' +

            '<details class="accordion"><summary>Delivery &amp; returns</summary>' +
              '<div class="accordion-body">' +
                '<p>Standard delivery ' + money(A.SHIPPING.standard.price) + ', free on orders over ' + money(A.FREE_SHIP) +
                  '. Express ' + money(A.SHIPPING.express.price) + '. Click and collect from our Surry Hills counter is free.</p>' +
                (p.price > 3000
                  ? '<p>This piece ships insured with signature on delivery and is covered by a five-year service plan through our Sydney workshop.</p>'
                  : '') +
                '<p>Return anything unworn with tags attached within 30 days for a full refund. Return postage is on us. ' +
                  'Your rights under the Australian Consumer Law apply in addition to this policy.</p>' +
              '</div></details>' +

            '<details class="accordion"><summary>Reviews (' + p.reviewCount + ')</summary>' +
              '<div class="accordion-body" id="reviews">' +
                '<div class="flex gap-3 items-baseline mb-4">' + A.stars(p.rating) +
                  '<b class="num">' + p.rating.toFixed(1) + ' out of 5</b>' +
                  '<span class="micro meta">' + p.reviewCount + ' review' + (p.reviewCount === 1 ? '' : 's') + '</span></div>' +
                reviewsHtml() +
              '</div></details>' +
          '</div>' +
        '</div>' +
      '</div>';

    wire();
  }

  /* ==========================================================================
     Behaviour
     ====================================================================== */

  function refreshStock() {
    qs('[data-stock]').innerHTML = stockHtml();
    qsa('.sizes [data-size]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-size') === selected));
    });
  }

  function wire() {
    wireGallery();

    qsa('.sizes [data-size]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-disabled') === 'true') {
          A.toast(btn.getAttribute('data-size') + ' is sold out. Tell us if you want it back — we restock most house pieces.');
          return;
        }
        selected = btn.getAttribute('data-size');
        qs('[data-size-error]').style.display = 'none';
        refreshStock();
      });
    });

    qs('[data-add]').addEventListener('click', function () {
      if (!selected) {
        var err = qs('[data-size-error]');
        err.style.display = 'block';
        var first = qs('.sizes [data-size]:not([aria-disabled])');
        if (first) first.focus();
        return;
      }
      var res = A.addToBag(p.id, selected, 1);
      if (res.ok) {
        A.renderBagDrawer();
        A.openDialog(qs('#bag-drawer'), qs('[data-add]'));
      } else if (res.reason === 'max') {
        A.toast('Only ' + res.max + ' left in ' + selected + ', and they are already in your bag.');
      } else {
        A.toast('That size is sold out.');
        refreshStock();
      }
    });

    var reviewsLink = qs('a[href="#reviews"]');
    if (reviewsLink) {
      reviewsLink.addEventListener('click', function () {
        var panel = qs('#reviews');
        var details = panel && panel.closest('details');
        if (details) details.open = true;
      });
    }

    var pc = qs('#pc');
    var out = qs('[data-estimate-out]');

    function runEstimate() {
      var value = pc.value.trim();
      if (!/^\d{4}$/.test(value)) {
        out.innerHTML = '<span style="color:var(--sale)">Enter a four-digit Australian postcode.</span>';
        return;
      }
      var e = A.estimate(value, 'standard', p.shipsInDays);
      if (!e) {
        out.innerHTML = '<span style="color:var(--sale)">That is not an Australian postcode we deliver to.</span>';
        return;
      }
      var ex = A.estimate(value, 'express', p.shipsInDays);
      out.innerHTML =
        '<b>' + e.label + '</b> to ' + esc(e.stateName) + ' ' + value +
        ' <span class="meta">(' + (e.metro ? 'metro' : 'regional') + ', standard)</span><br>' +
        '<span class="meta">Express: ' + ex.label + '</span>';
    }

    qs('[data-estimate]').addEventListener('click', runEstimate);
    pc.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); runEstimate(); } });

    // A saved postcode makes the estimate appear without asking again
    var saved = A.getPrefs().postcode;
    if (saved) { pc.value = saved; runEstimate(); }
    pc.addEventListener('change', function () {
      if (/^\d{4}$/.test(pc.value.trim())) {
        var pr = A.getPrefs(); pr.postcode = pc.value.trim(); A.setPrefs(pr);
      }
    });
  }

  render();

  /* ==========================================================================
     Related rails
     ====================================================================== */

  function rail(title, note, list, targetHref, targetLabel) {
    if (!list.length) return '';
    var section = document.createElement('section');
    section.className = 'section-tight';
    section.innerHTML =
      '<div class="section-head"><div class="lead"><h2>' + esc(title) + '</h2>' +
        (note ? '<span class="note">' + esc(note) + '</span>' : '') + '</div>' +
        (targetHref ? '<a class="arrowlink" href="' + targetHref + '">' + esc(targetLabel) +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a>' : '') +
      '</div><div class="rail"></div>';
    host.parentNode.appendChild(section);
    A.renderGrid(qs('.rail', section), list.slice(0, 4));
    return section;
  }

  var sameBrand = A.products.filter(function (x) { return x.brand === p.brand && x.id !== p.id; });
  rail('More from ' + p.brand, null, sameBrand,
    A.shopHref({ brand: p.brand }), 'All ' + p.brand);

  var alike = A.products.filter(function (x) {
    return x.id !== p.id && x.category === p.category && sameBrand.indexOf(x) === -1;
  });
  rail('Others in ' + (A.CATEGORY_LABEL[p.category] || p.category).toLowerCase(), null, alike,
    A.shopHref({ category: p.category }), 'All ' + (A.CATEGORY_LABEL[p.category] || p.category).toLowerCase());

  var recent = A.getRecent(p.id);
  rail('Recently viewed', null, recent, null, null);
})();
