/* ============================================================================
   ANTIPODE — journal: index and article
   ========================================================================= */

(function () {
  'use strict';

  var A = window.Antipode;
  if (!A) return;
  var qs = A.qs, esc = A.esc;

  var ARTICLES = window.ANTIPODE_JOURNAL || [];
  var slug = A.params().get('a');
  var article = ARTICLES.filter(function (x) { return x.slug === slug; })[0];
  var host = qs('[data-journal]');
  var crumbs = qs('[data-crumbs]');

  function date(d) { return A.AU_DATE.format(new Date(d)); }

  function bodyHtml(blocks) {
    return blocks.map(function (b) {
      if (b.t === 'h') return '<h2>' + esc(b.v) + '</h2>';
      if (b.t === 'q') return '<blockquote><p>' + esc(b.v) + '</p></blockquote>';
      if (b.t === 'ul') return '<ul>' + b.v.map(function (li) { return '<li>' + esc(li) + '</li>'; }).join('') + '</ul>';
      return '<p>' + esc(b.v) + '</p>';
    }).join('');
  }

  /* ==========================================================================
     Article view
     ====================================================================== */

  if (article) {
    document.title = article.title + ' — ANTIPODE Journal';
    crumbs.innerHTML =
      '<a href="index.html">Home</a><span class="sep" aria-hidden="true">/</span>' +
      '<a href="journal.html">Journal</a><span class="sep" aria-hidden="true">/</span>' +
      '<span aria-current="page">' + esc(article.title) + '</span>';

    var others = ARTICLES.filter(function (x) { return x.slug !== article.slug; }).slice(0, 3);

    host.innerHTML =
      '<article>' +
        '<header class="steel on-steel section">' +
          '<div class="wrap-narrow">' +
            '<p class="micro brass" style="text-transform:uppercase;letter-spacing:0.1em">' +
              esc(article.kicker) + '</p>' +
            '<h1 class="display mt-4" style="font-size:clamp(2.25rem,1.5rem + 3.4vw,4rem)">' + esc(article.title) + '</h1>' +
            '<p class="editorial mt-5" style="color:var(--on-dark-2);max-width:42ch">' + esc(article.lead) + '</p>' +
            '<hr class="brass-rule mt-6">' +
            '<p class="micro mt-4" style="color:var(--on-dark-2)">' +
              '<time datetime="' + esc(article.date) + '">' + date(article.date) + '</time> · ' +
              article.readMinutes + ' minute read</p>' +
          '</div>' +
        '</header>' +

        '<div class="wrap-narrow section">' +
          '<img src="' + esc(article.image) + '" alt="' + esc(article.imageAlt) + '" width="1000" height="1250" ' +
            'style="width:100%;max-width:520px;margin-inline:auto;aspect-ratio:4/5;object-fit:contain;background:var(--paper)" ' +
            'fetchpriority="high" decoding="async">' +

          '<div class="article-body mt-7">' + bodyHtml(article.body) + '</div>' +

          '<div class="flex gap-3 wrapf mt-7">' +
            article.links.map(function (l) {
              return '<a class="btn btn-primary" href="' + esc(l.href) + '">' + esc(l.label) + '</a>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</article>' +

      (others.length
        ? '<section class="wrap section-tight">' +
            '<div class="section-head"><div class="lead"><h2>More from the journal</h2></div>' +
              '<a class="arrowlink" href="journal.html">All writing' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a></div>' +
            '<div class="journal-index" data-more-journal>' + others.map(cardHtml).join('') + '</div>' +
          '</section>'
        : '');

    A.stagger(qs('[data-more-journal]'), 90);
    return;
  }

  /* ==========================================================================
     Index view
     ====================================================================== */

  function cardHtml(a) {
    return '<article class="journal-item">' +
      '<a href="journal.html?a=' + esc(a.slug) + '" tabindex="-1" aria-hidden="true">' +
        '<img src="' + esc(a.image) + '" alt="" width="900" height="600" loading="lazy" decoding="async">' +
      '</a>' +
      '<p class="card-brand mt-3">' + esc(a.kicker) + ' · ' + a.readMinutes + ' min read</p>' +
      '<h3><a href="journal.html?a=' + esc(a.slug) + '">' + esc(a.title) + '</a></h3>' +
      '<p class="small muted mt-2">' + esc(a.lead) + '</p>' +
      '<p class="micro meta mt-2"><time datetime="' + esc(a.date) + '">' + date(a.date) + '</time></p>' +
    '</article>';
  }

  document.title = 'Journal — ANTIPODE';
  crumbs.innerHTML =
    '<a href="index.html">Home</a><span class="sep" aria-hidden="true">/</span>' +
    '<span aria-current="page">Journal</span>';

  var lead = ARTICLES[0];
  var rest = ARTICLES.slice(1);

  host.innerHTML =
    '<div class="wrap">' +
      '<div class="shop-head mt-4">' +
        '<h1>Journal</h1>' +
        '<p class="editorial mt-3" style="font-size:1.25rem;color:var(--ink-2)">' +
          'Season notes, sizing, and how to keep the things you buy.</p>' +
      '</div>' +
    '</div>' +

    (lead
      ? '<div class="wrap section-tight">' +
          '<article class="journal-lead">' +
            '<a class="journal-lead-media" href="journal.html?a=' + esc(lead.slug) + '" tabindex="-1" aria-hidden="true">' +
              '<img src="' + esc(lead.image) + '" alt="" width="1000" height="1250" fetchpriority="high" decoding="async">' +
            '</a>' +
            '<div>' +
              '<p class="card-brand">' + esc(lead.kicker) + ' · ' + lead.readMinutes + ' min read</p>' +
              '<h2 class="mt-3" style="font-size:var(--t-h1)"><a href="journal.html?a=' + esc(lead.slug) + '" style="text-decoration:none">' +
                esc(lead.title) + '</a></h2>' +
              '<p class="editorial mt-4" style="font-size:1.25rem;color:var(--ink-2)">' + esc(lead.lead) + '</p>' +
              '<p class="micro meta mt-4"><time datetime="' + esc(lead.date) + '">' + date(lead.date) + '</time></p>' +
              '<a class="btn btn-primary mt-5" href="journal.html?a=' + esc(lead.slug) + '">Read this</a>' +
            '</div>' +
          '</article>' +
        '</div>'
      : '') +

    '<div class="wrap section">' +
      '<div class="section-head"><div class="lead"><h2>Everything else</h2></div></div>' +
      '<div class="journal-index" data-journal-grid>' + rest.map(cardHtml).join('') + '</div>' +
    '</div>';

  A.stagger(qs('[data-journal-grid]'), 90);
})();
