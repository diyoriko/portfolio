/* Portfolio — diyor.design */

const REVEAL_THRESHOLD = 0.15;

/* --- Scroll Reveal --- */

function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: REVEAL_THRESHOLD }
  );

  reveals.forEach((el, i) => {
    el.style.transitionDelay = `${i * 50}ms`;
    observer.observe(el);
  });
}

/* --- Case Tabs --- */

function initCaseTabs() {
  const tabs = document.querySelectorAll('.case-tab');
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      const container = tab.closest('main');

      /* Deactivate all tabs and panels */
      container.querySelectorAll('.case-tab').forEach((t) => t.classList.remove('active'));
      container.querySelectorAll('.case-tab-panel').forEach((p) => p.classList.remove('active'));

      /* Activate selected */
      tab.classList.add('active');
      const panel = container.querySelector(`.case-tab-panel[data-panel="${targetId}"]`);
      if (panel) {
        panel.classList.add('active');
        /* Re-trigger reveal for newly visible sections */
        panel.querySelectorAll('.reveal:not(.visible)').forEach((el) => {
          observer.observe(el);
        });
      }
    });
  });
}

/* Shared observer reference for re-observing on tab switch */
let observer;

/* --- Init --- */

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initCaseTabs();
});
