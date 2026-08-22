/* ============================================================================
   ANTIPODE — account: orders, addresses, preferences
   Everything is local to this browser. There is no server.
   ========================================================================= */

(function () {
  'use strict';

  var A = window.Antipode;
  if (!A) return;
  var qs = A.qs, qsa = A.qsa, esc = A.esc, money = A.money;

  /* ==========================================================================
     Tabs
     ====================================================================== */

  var tabs = qsa('[role="tab"]');
  var panels = qsa('[data-panel]');

  function select(index, focus) {
    tabs.forEach(function (t, i) {
      var on = i === index;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    if (focus) tabs[index].focus();
    history.replaceState(null, '', '#' + tabs[index].id.replace('tab-', ''));
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(i); });
    tab.addEventListener('keydown', function (e) {
      var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1
        : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (next === null) return;
      e.preventDefault();
      select((next + tabs.length) % tabs.length, true);
    });
  });

  /* ==========================================================================
     Orders
     ====================================================================== */

  var STATUS_STEPS = [
    { key: 'received', label: 'Order received' },
    { key: 'packing', label: 'Picking and packing' },
    { key: 'sent', label: 'On its way' },
    { key: 'delivered', label: 'Delivered' },
  ];

  /* Orders advance on the clock so the tracking view is not permanently frozen
     at "packing" — a demonstration of the states, not a real fulfilment feed. */
  function stageOf(order) {
    var hours = (Date.now() - new Date(order.placed).getTime()) / 3600000;
    if (hours < 2) return 1;
    if (hours < 24 * order.dispatchDays) return 2;
    if (hours < 24 * (order.dispatchDays + 3)) return 2;
    return 3;
  }

  function orderHtml(order, i) {
    var stage = stageOf(order);
    var open = i === 0;
    return '<details class="order"' + (open ? ' open' : '') + '>' +
      '<summary>' +
        '<div class="order-sum">' +
          '<div>' +
            '<p class="card-brand">' + esc(order.number) + '</p>' +
            '<p style="font-weight:600">' + order.lines.length +
              (order.lines.length === 1 ? ' item' : ' items') + ' · ' + money(order.total) + '</p>' +
            '<p class="micro meta">Placed ' + A.AU_DATE.format(new Date(order.placed)) + '</p>' +
          '</div>' +
          '<span class="status status-' + STATUS_STEPS[stage].key + '">' + STATUS_STEPS[stage].label + '</span>' +
        '</div>' +
      '</summary>' +
      '<div class="order-body">' +
        '<div class="order-grid">' +
          '<div>' +
            '<div class="mini-lines">' + order.lines.map(function (l) {
              var p = A.byId(l.id);
              if (!p) return '';
              return '<div class="mini-line">' +
                '<a href="' + A.productUrl(p) + '"><img src="' + esc(p.images[0]) + '" alt="' + esc(A.altText(p, 0)) +
                  '" width="1000" height="1250" loading="lazy" decoding="async"></a>' +
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
            '<h3>Tracking</h3>' +
            '<ul class="timeline mt-4">' + STATUS_STEPS.map(function (s, si) {
              return '<li' + (si < stage ? ' data-done="true"' : '') + (si === stage ? ' data-current="true"' : '') + '>' +
                '<div><b class="small">' + esc(s.label) + '</b>' +
                '<p class="when">' + esc(si === 2 ? order.etaLabel : si === 0 ? A.AU_DATE.format(new Date(order.placed)) : si === 1 ? 'Within ' + order.dispatchDays + ' business day' + (order.dispatchDays === 1 ? '' : 's') : 'On arrival') + '</p></div>' +
              '</li>';
            }).join('') + '</ul>' +

            '<h3 class="mt-6">' + (order.method === 'collect' ? 'Collect from' : 'Delivering to') + '</h3>' +
            '<address class="small mt-3" style="font-style:normal;line-height:1.7">' + order.addressHtml + '</address>' +

            '<div class="flex gap-3 wrapf mt-5">' +
              '<button type="button" class="btn btn-secondary btn-sm" data-reorder="' + esc(order.number) + '">Buy these again</button>' +
              '<a class="btn btn-secondary btn-sm" href="about.html#returns">Start a return</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</details>';
  }

  function renderOrders() {
    var orders = A.getOrders();
    var host = qs('[data-orders]');
    if (!orders.length) {
      host.innerHTML = '<div class="empty"><h2>No orders yet</h2>' +
        '<p>Once you place an order it appears here with live tracking. Orders are stored in this browser, so they will not follow you to another device.</p>' +
        '<a class="btn btn-primary" href="shop.html">Shop everything</a></div>';
      return;
    }
    // An h2 above the list keeps the order cards' h3s from jumping from the h1.
    host.innerHTML = '<h2 class="sr-only">Your orders</h2>' + orders.map(orderHtml).join('');
  }

  document.addEventListener('click', function (e) {
    var re = e.target.closest('[data-reorder]');
    if (!re) return;
    var order = A.getOrders().filter(function (o) { return o.number === re.getAttribute('data-reorder'); })[0];
    if (!order) return;
    var added = 0, skipped = 0;
    order.lines.forEach(function (l) {
      var res = A.addToBag(l.id, l.size, l.qty);
      if (res.ok) added++; else skipped++;
    });
    A.toast(added
      ? added + (added === 1 ? ' item' : ' items') + ' back in your bag' + (skipped ? ', ' + skipped + ' no longer available in that size.' : '.')
      : 'None of those are available in the same size any more.',
      added ? ' <a href="cart.html">View bag</a>' : '');
  });

  /* ==========================================================================
     Addresses
     ====================================================================== */

  function renderAddresses() {
    var list = A.getAddresses();
    var host = qs('[data-addresses]');
    if (!list.length) {
      host.innerHTML = '<p class="muted">No saved addresses yet. Add one below, or tick "save this address" at checkout.</p>';
      return;
    }
    host.innerHTML = '<div class="addr-grid">' + list.map(function (a, i) {
      return '<div class="addr">' +
        '<p class="card-brand">' + esc(a.label || 'Address ' + (i + 1)) + '</p>' +
        '<address class="small mt-2" style="font-style:normal;line-height:1.7">' +
          '<b>' + esc(a.name) + '</b><br>' + esc(a.street) + '<br>' +
          (a.street2 ? esc(a.street2) + '<br>' : '') +
          esc(a.suburb) + ' ' + esc(a.state) + ' ' + esc(a.postcode) +
        '</address>' +
        '<button type="button" class="linkbtn mt-2" data-del-addr="' + i + '">Remove</button>' +
      '</div>';
    }).join('') + '</div>';
  }

  qs('[data-addresses]').addEventListener('click', function (e) {
    var del = e.target.closest('[data-del-addr]');
    if (!del) return;
    var list = A.getAddresses();
    list.splice(+del.getAttribute('data-del-addr'), 1);
    A.setAddresses(list);
    renderAddresses();
    A.toast('Address removed.');
  });

  qs('[data-addr-form]').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var checks = [
      ['a-name', function (v) { return v.trim().length > 1; }],
      ['a-street', function (v) { return v.trim().length > 2; }],
      ['a-suburb', function (v) { return v.trim().length > 1; }],
      ['a-state', function (v) { return v !== ''; }],
      ['a-postcode', function (v) { return /^\d{4}$/.test(v.trim()) && !!A.stateFor(v.trim()); }],
    ];
    var bad = null;
    checks.forEach(function (c) {
      var input = qs('#' + c[0]);
      var ok = c[1](input.value);
      input.closest('.field').classList.toggle('invalid', !ok);
      input.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok && !bad) bad = input;
    });

    var st = qs('#a-state'), pc = qs('#a-postcode');
    if (!bad && /^\d{4}$/.test(pc.value.trim())) {
      var derived = A.stateFor(pc.value.trim());
      if (derived !== st.value) {
        qs('#a-postcode-err').textContent = 'Postcode ' + pc.value.trim() + ' is in ' + derived + ', not ' + st.value + '.';
        pc.closest('.field').classList.add('invalid');
        bad = pc;
      } else {
        qs('#a-postcode-err').textContent = 'Enter a valid four-digit postcode.';
      }
    }

    if (bad) { bad.focus(); return; }

    var list = A.getAddresses();
    list.push({
      name: qs('#a-name').value.trim(),
      label: qs('#a-label').value.trim(),
      street: qs('#a-street').value.trim(),
      street2: '',
      suburb: qs('#a-suburb').value.trim(),
      state: st.value,
      postcode: pc.value.trim(),
    });
    A.setAddresses(list);
    form.reset();
    renderAddresses();
    A.toast('Address saved.');
  });

  /* ==========================================================================
     Preferences
     ====================================================================== */

  var CLOTHING_SIZES = ['', 'AU 6', 'AU 8', 'AU 10', 'AU 12', 'AU 14', 'AU 16', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
  var SHOE_SIZES = ['', 'AU 5', 'AU 6', 'AU 7', 'AU 8', 'AU 9', 'AU 10', 'AU 11', 'AU 12'];

  function fillSelect(el, values) {
    el.innerHTML = values.map(function (v) {
      return '<option value="' + esc(v) + '">' + (v === '' ? 'No preference' : esc(v)) + '</option>';
    }).join('');
  }

  fillSelect(qs('#p-cloth'), CLOTHING_SIZES);
  fillSelect(qs('#p-shoe'), SHOE_SIZES);

  function renderPrefs() {
    var p = A.getPrefs();
    qs('#p-cloth').value = p.clothing || '';
    qs('#p-shoe').value = p.shoe || '';
    qs('#p-dept').value = p.dept || '';
    qs('[data-prefs] [name="marketing"]').checked = !!p.marketing;
    qs('[data-prefs] [name="sms"]').checked = !!p.sms;
  }

  qs('[data-prefs]').addEventListener('submit', function (e) {
    e.preventDefault();
    var p = A.getPrefs();
    p.clothing = qs('#p-cloth').value;
    p.shoe = qs('#p-shoe').value;
    p.dept = qs('#p-dept').value;
    p.marketing = qs('[data-prefs] [name="marketing"]').checked;
    p.sms = qs('[data-prefs] [name="sms"]').checked;
    A.setPrefs(p);
    qs('[data-prefs-msg]').textContent = 'Saved. Product pages will use these sizes.';
  });

  qs('[data-wipe]').addEventListener('click', function () {
    if (!window.confirm('Clear your bag, wishlist, orders, addresses and preferences from this browser? This cannot be undone.')) return;
    ['antipode.bag', 'antipode.wishlist', 'antipode.recent', 'antipode.orders',
     'antipode.addresses', 'antipode.prefs', 'antipode.promo'].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (err) { /* private mode */ }
    });
    renderOrders();
    renderAddresses();
    renderPrefs();
    A.syncCounts();
    A.toast('Everything stored on this device has been cleared.');
  });

  /* ==========================================================================
     Boot
     ====================================================================== */

  renderOrders();
  renderAddresses();
  renderPrefs();

  var hash = (location.hash || '').replace('#', '');
  var index = ['orders', 'addresses', 'prefs'].indexOf(hash);
  if (index > 0) select(index);
})();
