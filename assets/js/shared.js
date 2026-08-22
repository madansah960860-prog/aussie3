/* ============================================================================
   ANTIPODE — chrome bits shared by every page
   Mobile-sheet category lists and the newsletter sign-up.
   ========================================================================= */

(function () {
  'use strict';

  var A = window.Antipode;
  if (!A) return;

  A.qsa('[data-sheet-cats]').forEach(function (node) {
    var gender = node.getAttribute('data-sheet-cats');
    node.innerHTML =
      '<a href="' + A.shopHref({ gender: gender }) + '" data-no-current>Everything in ' +
        (gender === 'women' ? 'womenswear' : 'menswear') + '</a>' +
      A.categoriesFor(gender).map(function (c) {
        return '<a href="' + A.shopHref({ gender: gender, category: c.key }) + '" data-no-current>' +
          A.esc(c.label) + '</a>';
      }).join('');
  });

  A.qsa('[data-newsletter]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = A.qs('input', form);
      if (!input.checkValidity()) { input.reportValidity(); return; }
      A.toast('Thanks — season notes will go to ' + A.esc(input.value) + '.');
      form.reset();
    });
  });
})();
