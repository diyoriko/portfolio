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

/* --- Mobile Navigation --- */

function initMobileNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const navLinks = nav.querySelector('.nav-links');
  const navLang = nav.querySelector('.nav-lang');
  if (!navLinks || !navLang) return;

  /* Create burger button */
  const burger = document.createElement('button');
  burger.className = 'nav-burger';
  burger.setAttribute('aria-label', 'Menu');
  burger.setAttribute('aria-expanded', 'false');
  burger.innerHTML = '<span></span>';
  nav.appendChild(burger);

  /* Create mobile overlay */
  const overlay = document.createElement('div');
  overlay.className = 'nav-mobile';

  /* Clone nav links */
  const links = navLinks.querySelectorAll('a');
  links.forEach((link) => {
    const clone = link.cloneNode(true);
    overlay.appendChild(clone);
  });

  /* Clone lang switcher */
  const langDiv = document.createElement('div');
  langDiv.className = 'nav-mobile-lang';
  const langLinks = navLang.querySelectorAll('a');
  langLinks.forEach((link) => {
    const clone = link.cloneNode(true);
    langDiv.appendChild(clone);
  });
  overlay.appendChild(langDiv);

  document.body.appendChild(overlay);

  /* Toggle */
  burger.addEventListener('click', () => {
    const isOpen = burger.classList.toggle('open');
    overlay.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  /* Close on link click */
  overlay.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      burger.classList.remove('open');
      overlay.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

/* --- Init --- */

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initCaseTabs();
  initMobileNav();
});
