/* ============================================================================
   ANTIPODE — homepage
   ========================================================================= */

(function () {
  'use strict';

  var A = window.Antipode;
  if (!A) return;
  var qs = A.qs, qsa = A.qsa, esc = A.esc, money = A.money;

  /** First product whose title contains `needle`, else the first of `pool`. */
  function pick(pool, needle) {
    var hit = pool.filter(function (p) {
      return p.title.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
    })[0];
    return hit || pool[0];
  }

  var all = A.products;
  var women = all.filter(function (p) { return p.gender === 'women'; });
  var men = all.filter(function (p) { return p.gender === 'men'; });

  /* ---- hero plates -------------------------------------------------------- */

  function plate(p, eager) {
    return '<figure>' +
      '<a href="' + A.productUrl(p) + '" aria-label="' + esc(p.brand + ' ' + p.title) + '">' +
        '<img src="' + esc(p.images[0]) + '" alt="' + esc(A.altText(p, 0)) + '" width="1000" height="1250" ' +
          (eager ? 'fetchpriority="high"' : 'loading="lazy"') + ' decoding="async">' +
      '</a>' +
      '<figcaption>' +
        '<span>' + esc(p.brand) + '<br><span class="meta">' + esc(p.title) + '</span></span>' +
        '<span class="num nowrap">' + money(p.price) + '</span>' +
      '</figcaption>' +
    '</figure>';
  }

  var heroArt = qs('[data-hero-art]');
  if (heroArt) {
    var outerW = women.filter(function (p) { return p.category === 'outerwear'; });
    var outerM = men.filter(function (p) { return p.category === 'outerwear' || p.category === 'shirts'; });
    var a = pick(outerW.length ? outerW : women, 'moto');
    var b = pick(outerM.length ? outerM : men, 'field');
    heroArt.innerHTML = plate(a, true) + plate(b, true);
  }

  /* ---- rails -------------------------------------------------------------- */

  function fillRail(name, list) {
    var node = qs('[data-rail="' + name + '"]');
    if (!node) return list.length;
    A.renderGrid(node, list);
    return list.length;
  }

  var newIn = all.filter(function (p) { return p.isNew; }).slice(0, 8);
  if (newIn.length < 4) newIn = all.slice(0, 8);
  fillRail('new', newIn.slice(0, 4));

  var onSale = all.filter(function (p) { return p.onSale; }).slice(0, 4);
  if (onSale.length) fillRail('sale', onSale);
  else { var s = qs('[data-sale-section]'); if (s) s.hidden = true; }

  /* ---- departments -------------------------------------------------------- */

  var dept = qs('[data-departments]');
  if (dept) {
    var deptDefs = [
      {
        key: 'women', label: 'Womenswear', href: 'shop.html?gender=women',
        product: pick(women.filter(function (p) { return p.category === 'dresses'; }), 'tartan'),
        note: 'Dresses, tailoring, knitwear, shoes and fine jewellery.',
      },
      {
        key: 'men', label: 'Menswear', href: 'shop.html?gender=men',
        product: pick(men.filter(function (p) { return p.category === 'shoes'; }), 'jordan'),
        note: 'Shirting, outerwear, sneakers and watches.',
      },
    ];

    dept.innerHTML = deptDefs.map(function (d) {
      var cats = A.categoriesFor(d.key).slice(0, 6);
      return '<article class="dept-item">' +
        '<a class="dept-media" href="' + d.href + '">' +
          '<img src="' + esc(d.product.images[0]) + '" alt="' + esc(A.altText(d.product, 0)) + '" width="1000" height="1250" loading="lazy" decoding="async">' +
        '</a>' +
        '<div class="dept-body">' +
          '<h3><a href="' + d.href + '">' + esc(d.label) + '</a></h3>' +
          '<p class="small muted">' + esc(d.note) + '</p>' +
          '<ul class="dept-links">' + cats.map(function (c) {
            return '<li><a href="' + A.shopHref({ gender: d.key, category: c.key }) + '">' + esc(c.label) +
              ' <span class="meta num">' + c.count + '</span></a></li>';
          }).join('') + '</ul>' +
          '<a class="btn btn-secondary" href="' + d.href + '">Shop all ' + esc(d.label.toLowerCase()) + '</a>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  /* ---- category list ------------------------------------------------------ */

  var catList = qs('[data-categories]');
  if (catList) {
    catList.innerHTML = A.categoriesFor(null).map(function (c) {
      return '<li><a href="' + A.shopHref({ category: c.key }) + '">' +
        '<span>' + esc(c.label) + '</span><span class="meta num">' + c.count + '</span></a></li>';
    }).join('');
  }

  /* ---- fine watches ------------------------------------------------------- */

  var watchArt = qs('[data-watch-art]');
  if (watchArt) {
    var watches = all
      .filter(function (p) { return p.category === 'watches'; })
      .sort(function (x, y) { return y.price - x.price; })
      .slice(0, 3);
    watchArt.innerHTML = watches.map(function (p) {
      return '<figure>' +
        '<a href="' + A.productUrl(p) + '"><img src="' + esc(p.images[0]) + '" alt="' + esc(A.altText(p, 0)) +
          '" width="1000" height="1250" loading="lazy" decoding="async"></a>' +
        '<figcaption>' +
          '<span>' + esc(p.brand) + '<br><span class="meta">' + esc(p.title) + '</span></span>' +
          '<span class="num nowrap">' + money(p.price) + '</span>' +
        '</figcaption>' +
      '</figure>';
    }).join('');
  }

  /* ---- journal teaser ----------------------------------------------------- */

  var teaser = qs('[data-journal-teaser]');
  var JOURNAL = window.ANTIPODE_JOURNAL || [];
  if (teaser && JOURNAL.length) {
    teaser.innerHTML = JOURNAL.slice(0, 2).map(function (art) {
      return '<article class="journal-item">' +
        '<a href="journal.html?a=' + esc(art.slug) + '" tabindex="-1" aria-hidden="true">' +
          '<img src="' + esc(art.image) + '" alt="" width="900" height="600" loading="lazy" decoding="async">' +
        '</a>' +
        '<p class="card-brand mt-3">' + esc(art.kicker) + ' · ' + art.readMinutes + ' min read</p>' +
        '<h3><a href="journal.html?a=' + esc(art.slug) + '">' + esc(art.title) + '</a></h3>' +
        '<p class="small muted mt-2">' + esc(art.lead) + '</p>' +
      '</article>';
    }).join('');
  }

  A.stagger(dept, 90);
  A.stagger(watchArt, 70);
  A.stagger(teaser, 90);
})();
