/*
 * embed-theme.js — shared theme inheritance for iframe embeds.
 *
 * Reads parent <html> theme class (`dark`/`light`) via same-origin window.parent
 * and mirrors it onto this iframe's <html data-theme>. Watches the parent for
 * MutationObserver updates so the iframe reacts live when the user toggles
 * theme on the case page. Falls back to `prefers-color-scheme` when the iframe
 * is opened standalone or cross-origin access is blocked.
 *
 * Usage in an embed:
 *   <script src="embed-theme.js"></script>
 * Then style with:
 *   html[data-theme="dark"] body { ... }
 *   html[data-theme="light"] body { ... }
 */
(function () {
  var root = document.documentElement;

  function readSystem() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function readParent() {
    try {
      if (window.parent === window) return readSystem();
      var pr = window.parent.document.documentElement;
      if (pr.classList.contains('dark')) return 'dark';
      if (pr.classList.contains('light')) return 'light';
      return readSystem();
    } catch (e) {
      return readSystem();
    }
  }

  function apply() {
    root.setAttribute('data-theme', readParent());
  }

  apply();

  /* React to parent toggling theme. */
  try {
    if (window.parent !== window) {
      var obs = new MutationObserver(apply);
      obs.observe(window.parent.document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  } catch (e) {
    /* cross-origin or detached, ignore */
  }

  /* React to system theme change when standalone. */
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
  } catch (e) {
    /* old Safari */
  }
})();
