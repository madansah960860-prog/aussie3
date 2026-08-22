/* ============================================================================
   ANTIPODE — bag
   ========================================================================= */

(function () {
  'use strict';

  var A = window.Antipode;
  if (!A) return;
  var qs = A.qs, qsa = A.qsa, esc = A.esc, money = A.money;

  var promo = A.getPromo();

  function lineHtml(l) {
    var p = A.byId(l.id);
    var max = A.stockFor(p, l.size);
    var low = max <= 3;
    return '<div class="line">' +
      '<a href="' + A.productUrl(p) + '"><img src="' + esc(p.images[0]) + '" alt="' + esc(A.altText(p, 0)) +
        '" width="1000" height="1250" loading="lazy" decoding="async"></a>' +
      '<div class="line-main">' +
        '<div class="line-top">' +
          '<div>' +
            '<p class="card-brand">' + esc(p.brand) + '</p>' +
            '<p class="card-title"><a href="' + A.productUrl(p) + '">' + esc(p.title) + '</a></p>' +
            '<p class="micro meta mt-1">' + esc(p.colour) + ' · ' + esc(l.size) + '</p>' +
            (low ? '<p class="micro mt-1" style="color:var(--warn);font-weight:500">Only ' + max + ' left in this size</p>' : '') +
          '</div>' +
          '<div style="text-align:right">' +
            '<p class="num" style="font-weight:600">' + money(p.price * l.qty) + '</p>' +
            (l.qty > 1 ? '<p class="micro meta num">' + money(p.price) + ' each</p>' : '') +
          '</div>' +
        '</div>' +
        '<div class="line-actions">' +
          A.qtyStepperHtml(l, max) +
          '<button type="button" class="linkbtn" data-save="' + esc(l.id) + '" data-size="' + esc(l.size) + '">Save for later</button>' +
          '<button type="button" class="linkbtn" data-remove="' + esc(l.id) + '" data-size="' + esc(l.size) + '">Remove</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function summaryHtml(t) {
    return '<h2>Order summary</h2>' +
      A.freeShipHtml(t) +
      '<div class="row mt-4"><span>Subtotal (' + t.count + (t.count === 1 ? ' item' : ' items') + ')</span>' +
        '<span class="num">' + money(t.subtotal) + '</span></div>' +
      (t.discount > 0
        ? '<div class="row" style="color:var(--sale)"><span>Discount · ' + esc(promo ? promo.code : '') + '</span>' +
          '<span class="num">&minus;' + money(t.discount) + '</span></div>'
        : '') +
      '<div class="row"><span>Standard delivery</span><span class="num">' +
        (t.shipping === 0 ? '<b style="color:var(--success)">Free</b>' : money(t.shipping)) + '</span></div>' +
      '<div class="row total"><span>Total</span><span class="num">' + money(t.total) + '</span></div>' +
      '<p class="fineprint">Includes ' + money(t.gst) + ' GST. Delivery method is chosen at checkout.</p>' +
      (t.total >= 50
        ? '<div class="payin4 mt-2"><span>or 4 interest-free payments of</span> <b>' + money(t.total / 4) + '</b></div>'
        : '') +
      '<a class="btn btn-primary btn-block mt-4" href="checkout.html">Checkout</a>' +
      '<a class="btn btn-secondary btn-block mt-3" href="shop.html">Keep shopping</a>';
  }

  function render() {
    var lines = A.getBag();
    var hasItems = lines.length > 0;

    qs('[data-cart]').hidden = !hasItems;
    qs('[data-empty]').hidden = hasItems;
    qs('[data-also]').hidden = !hasItems;

    if (!hasItems) {
      if (promo) { promo = null; A.setPromo(null); }
      A.syncCounts();
      return;
    }

    qs('[data-lines]').innerHTML = lines.map(lineHtml).join('');

    var base = A.totals(lines);
    var discount = 0;
    if (promo) {
      var re = A.applyPromo(promo.code, base.subtotal);
      if (re.ok) { discount = re.amount; promo = re; A.setPromo(re); }
      else { promo = null; A.setPromo(null); }
    }
    var t = A.totals(lines, 'standard', discount);
    if (promo && promo.freeShipping && t.shipping > 0) {
      t.total -= t.shipping;
      t.shipping = 0;
      t.shippingFree = true;
      t.gst = t.total - t.total / (1 + A.GST_RATE);
    }

    qs('[data-summary]').innerHTML = summaryHtml(t);

    /* recommendations: same categories as the bag, nothing already in it */
    var inBag = {};
    lines.forEach(function (l) { inBag[l.id] = 1; });
    var cats = {};
    lines.forEach(function (l) { cats[A.byId(l.id).category] = 1; });
    var also = A.products
      .filter(function (p) { return !inBag[p.id] && cats[p.category]; })
      .sort(function (a, b) { return b.rating - a.rating; })
      .slice(0, 4);
    if (!also.length) also = A.products.filter(function (p) { return p.isNew && !inBag[p.id]; }).slice(0, 4);
    A.renderGrid(qs('[data-also-grid]'), also);

    A.syncCounts();
  }

  /* ==========================================================================
     Events
     ====================================================================== */

  document.addEventListener('click', function (e) {
    var step = e.target.closest('[data-qty]');
    if (step) {
      var line = A.getBag().filter(function (l) {
        return l.id === step.getAttribute('data-id') && l.size === step.getAttribute('data-size');
      })[0];
      if (line) A.setQty(line.id, line.size, line.qty + parseInt(step.getAttribute('data-qty'), 10));
      render();
      return;
    }

    var rm = e.target.closest('[data-remove]');
    if (rm && rm.closest('main')) {
      var p = A.byId(rm.getAttribute('data-remove'));
      A.removeLine(rm.getAttribute('data-remove'), rm.getAttribute('data-size'));
      A.toast('Removed ' + esc(p.title) + ' from your bag.');
      render();
      return;
    }

    var save = e.target.closest('[data-save]');
    if (save) {
      var pid = save.getAttribute('data-save');
      if (!A.inWishlist(pid)) A.toggleWishlist(pid);
      A.removeLine(pid, save.getAttribute('data-size'));
      A.toast('Moved to your wishlist.', ' <a href="wishlist.html">View</a>');
      render();
    }
  });

  qs('[data-promo]').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = qs('#promo-code');
    var msg = qs('[data-promo-msg]');
    var subtotal = A.totals(A.getBag()).subtotal;
    var res = A.applyPromo(input.value, subtotal);

    if (!res.ok) {
      msg.textContent = res.message;
      msg.className = 'promo-msg is-error';
      return;
    }
    promo = res;
    A.setPromo(res);
    msg.textContent = res.label + ' applied.';
    msg.className = 'promo-msg is-ok';
    input.value = '';
    render();
  });

  /* ---- delivery estimate -------------------------------------------------- */

  var pc = qs('#cart-post');
  var out = qs('[data-estimate-out]');

  function estimate() {
    var v = pc.value.trim();
    if (!/^\d{4}$/.test(v)) {
      out.innerHTML = '<span style="color:var(--sale)">Enter a four-digit Australian postcode.</span>';
      return;
    }
    var slowest = A.getBag().reduce(function (n, l) {
      return Math.max(n, A.byId(l.id).shipsInDays);
    }, 1);
    var std = A.estimate(v, 'standard', slowest);
    if (!std) {
      out.innerHTML = '<span style="color:var(--sale)">That is not an Australian postcode we deliver to.</span>';
      return;
    }
    var exp = A.estimate(v, 'express', slowest);
    out.innerHTML =
      '<b>' + std.label + '</b> to ' + esc(std.stateName) + ' <span class="meta">(' + (std.metro ? 'metro' : 'regional') + ')</span><br>' +
      '<span class="meta">Express: ' + exp.label + '. Based on the slowest item in your bag.</span>';
    var pr = A.getPrefs(); pr.postcode = v; A.setPrefs(pr);
  }

  qs('[data-estimate]').addEventListener('click', estimate);
  pc.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); estimate(); } });

  var savedPc = A.getPrefs().postcode;
  if (savedPc) { pc.value = savedPc; estimate(); }

  document.addEventListener('bag:change', render);
  render();
})();
