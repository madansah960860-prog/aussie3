/* ============================================================================
   ANTIPODE — wishlist
   ========================================================================= */

(function () {
  'use strict';

  var A = window.Antipode;
  if (!A) return;
  var qs = A.qs;

  function render() {
    var ids = A.getWishlist();
    var list = ids.map(function (id) { return A.byId(id); }).filter(Boolean);
    var has = list.length > 0;

    qs('[data-grid]').hidden = !has;
    qs('[data-empty]').hidden = has;
    qs('[data-clear-wishlist]').hidden = !has;
    qs('[data-wl-count]').textContent = has
      ? (list.length === 1 ? '1 piece saved' : list.length + ' pieces saved')
      : '';

    if (has) A.renderGrid(qs('[data-grid]'), list, { eagerCount: 4 });
    A.syncCounts();
  }

  qs('[data-clear-wishlist]').addEventListener('click', function () {
    A.getWishlist().slice().forEach(function (id) { A.toggleWishlist(id); });
    A.toast('Wishlist cleared.');
  });

  document.addEventListener('wishlist:change', render);
  render();
})();
