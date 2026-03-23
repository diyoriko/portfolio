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
    tab.addEventListener('click', () => activateTab(tab));

    /* Arrow key navigation */
    tab.addEventListener('keydown', (e) => {
      const allTabs = Array.from(tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
      const idx = allTabs.indexOf(tab);
      let next;
      if (e.key === 'ArrowRight') next = allTabs[(idx + 1) % allTabs.length];
      else if (e.key === 'ArrowLeft') next = allTabs[(idx - 1 + allTabs.length) % allTabs.length];
      if (next) { e.preventDefault(); next.focus(); next.click(); }
    });
  });

  function activateTab(tab) {
    const targetId = tab.getAttribute('data-tab');
    const container = tab.closest('main');

    container.querySelectorAll('.case-tab').forEach((t) => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');
    });
    container.querySelectorAll('.case-tab-panel').forEach((p) => p.classList.remove('active'));

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    tab.setAttribute('tabindex', '0');
    const panel = container.querySelector(`.case-tab-panel[data-panel="${targetId}"]`);
    if (panel) {
      panel.classList.add('active');
      panel.querySelectorAll('.reveal:not(.visible)').forEach((el) => {
        if (observer) observer.observe(el);
      });
    }
  }
}

/* --- External links inside project cards (stop bubbling to parent <a>) --- */

function initProjectLinks() {
  document.querySelectorAll('.project-name-link[data-href]').forEach((link) => {
    function openLink(e) {
      e.stopPropagation();
      e.preventDefault();
      window.open(link.dataset.href, '_blank');
    }
    link.addEventListener('click', openLink);
    link.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') openLink(e);
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

/* --- Lightbox --- */

function initLightbox() {
  const overlay = document.createElement('div');
  overlay.className = 'case-lightbox';
  overlay.innerHTML = '<img>';
  document.body.appendChild(overlay);

  const lbImg = overlay.querySelector('img');
  let scale = 1, panX = 0, panY = 0;
  const SCALE_MIN = 1, SCALE_MAX = 5, SCALE_STEP = 0.15;

  /* Drag state */
  let isDragging = false, dragStartX = 0, dragStartY = 0, dragMoved = false;

  function applyTransform() {
    if (scale > 1) {
      lbImg.style.transform = 'scale(' + scale + ') translate(' + (panX / scale) + 'px,' + (panY / scale) + 'px)';
      lbImg.style.cursor = 'grab';
    } else {
      lbImg.style.transform = '';
      lbImg.style.cursor = 'zoom-in';
      panX = 0; panY = 0;
    }
  }

  function resetZoom() {
    scale = 1; panX = 0; panY = 0;
    applyTransform();
  }

  function openOverlay(src) {
    lbImg.src = src;
    lbImg.style.maxWidth = '95vw';
    lbImg.style.maxHeight = '95vh';
    lbImg.style.width = 'auto';
    lbImg.style.height = 'auto';
    resetZoom();
    overlay.classList.add('open');
    overlay.style.touchAction = 'none';
  }

  function closeOverlay() {
    overlay.classList.remove('open');
    overlay.style.touchAction = '';
    resetZoom();
  }

  document.addEventListener('click', (e) => {
    const img = e.target.closest('.case-img-full, .case-img-row img');
    if (!img) return;
    let src = img.src;
    const picture = img.closest('picture');
    if (picture) {
      const source = picture.querySelector('source[srcset]');
      if (source) src = source.getAttribute('srcset');
    }
    openOverlay(src);
  });

  /* Close on click — but not if dragging */
  overlay.addEventListener('click', (e) => {
    if (dragMoved) { dragMoved = false; return; }
    closeOverlay();
  });

  /* Drag to pan when zoomed */
  overlay.addEventListener('mousedown', (e) => {
    if (scale <= 1) return;
    isDragging = true; dragMoved = false;
    dragStartX = e.clientX - panX;
    dragStartY = e.clientY - panY;
    lbImg.style.cursor = 'grabbing';
    e.preventDefault();
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panX = e.clientX - dragStartX;
    panY = e.clientY - dragStartY;
    dragMoved = true;
    applyTransform();
  });

  overlay.addEventListener('mouseup', () => {
    isDragging = false;
    if (scale > 1) lbImg.style.cursor = 'grab';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOverlay();
  });

  /* Wheel zoom */
  overlay.addEventListener('wheel', (e) => {
    if (!overlay.classList.contains('open')) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      scale = Math.min(SCALE_MAX, scale + SCALE_STEP);
    } else {
      scale = Math.max(SCALE_MIN, scale - SCALE_STEP);
    }
    applyTransform();
  }, { passive: false });

  /* Touch pinch-to-zoom + single-finger pan */
  let lastPinchDist = 0, touchStartX = 0, touchStartY = 0;

  overlay.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    } else if (e.touches.length === 1 && scale > 1) {
      isDragging = true; dragMoved = false;
      touchStartX = e.touches[0].clientX - panX;
      touchStartY = e.touches[0].clientY - panY;
    }
  }, { passive: true });

  overlay.addEventListener('touchmove', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastPinchDist > 0) {
        const delta = dist / lastPinchDist;
        scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale * delta));
        applyTransform();
      }
      lastPinchDist = dist;
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      e.preventDefault();
      panX = e.touches[0].clientX - touchStartX;
      panY = e.touches[0].clientY - touchStartY;
      dragMoved = true;
      applyTransform();
    }
  }, { passive: false });

  overlay.addEventListener('touchend', () => {
    lastPinchDist = 0;
    isDragging = false;
  }, { passive: true });
}

/* --- QA overlay (localhost only) --- */

function initQA() {
  if (!location.hostname.match(/^(localhost|127\.0\.0\.1)$/)) return;
  const s = document.createElement('script');
  s.src = '/qa.js';
  document.body.appendChild(s);
}

/* --- Init --- */

document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initCaseTabs();
  initProjectLinks();
  initLightbox();
  initQA();

  /* GoatCounter loads async — poll until ready */
  const gcInterval = setInterval(() => {
    if (window.goatcounter && window.goatcounter.count) {
      clearInterval(gcInterval);
      initGoatCounterEvents();
    }
  }, 200);
  setTimeout(() => clearInterval(gcInterval), 5000);
});
