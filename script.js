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
          if (observer) observer.observe(el);
        });
      }
    });
  });
}

/* --- GoatCounter Events --- */

function initGoatCounterEvents() {
  if (!window.goatcounter || !window.goatcounter.count) return;

  function gc(name, title) {
    window.goatcounter.count({ path: name, title: title, event: true });
  }

  /* External project links */
  document.querySelectorAll('.project-name-link').forEach((el) => {
    el.addEventListener('click', () => {
      const name = el.closest('.project-item')
        ?.querySelector('.project-name-title')?.textContent?.trim() || 'unknown';
      gc('ext-' + name.toLowerCase().replace(/\s+/g, '-'), 'External: ' + name);
    });
  });

  /* Language switcher */
  document.querySelectorAll('.nav-lang a').forEach((el) => {
    el.addEventListener('click', () => {
      const lang = el.href.includes('/en/') || el.textContent.trim() === 'En' ? 'en' : 'ru';
      gc('lang-switch-to-' + lang, 'Language: ' + lang.toUpperCase());
    });
  });

  /* Contact links on about page */
  document.querySelectorAll('.about-links a').forEach((el) => {
    el.addEventListener('click', () => {
      const channel = el.textContent.trim().toLowerCase();
      gc('contact-' + channel, 'Contact: ' + channel);
    });
  });

  /* Case tab switches */
  document.querySelectorAll('.case-tab').forEach((el) => {
    el.addEventListener('click', () => {
      const tabName = el.getAttribute('data-tab');
      const caseName = document.title.split('—')[0].trim().toLowerCase().replace(/\s+/g, '-');
      gc('tab-' + caseName + '-' + tabName, 'Tab: ' + caseName + ' / ' + tabName);
    });
  });

  /* Scroll depth on case pages (fire once at 90%) */
  if (document.querySelector('.main--case')) {
    let scrollFired = false;
    window.addEventListener('scroll', () => {
      if (scrollFired) return;
      const pct = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (pct >= 0.9) {
        scrollFired = true;
        const caseName = document.title.split('—')[0].trim().toLowerCase().replace(/\s+/g, '-');
        gc('read-complete-' + caseName, 'Read complete: ' + caseName);
      }
    });
  }
}

/* Shared observer reference for re-observing on tab switch */
let observer;

/* --- Init --- */

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initCaseTabs();

  /* GoatCounter loads async — poll until ready */
  const gcInterval = setInterval(() => {
    if (window.goatcounter && window.goatcounter.count) {
      clearInterval(gcInterval);
      initGoatCounterEvents();
    }
  }, 200);
  setTimeout(() => clearInterval(gcInterval), 5000);
});
