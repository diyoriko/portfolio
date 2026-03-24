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
  overlay.innerHTML = '<img><video autoplay loop muted playsinline style="display:none">';
  document.body.appendChild(overlay);

  const lbImg = overlay.querySelector('img');
  const lbVideo = overlay.querySelector('video');
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

  function openOverlay(src, isVideo) {
    if (isVideo) {
      lbImg.style.display = 'none';
      lbVideo.style.display = '';
      lbVideo.src = src;
      lbVideo.play();
    } else {
      lbVideo.style.display = 'none';
      lbImg.style.display = '';
      lbImg.src = src;
      lbImg.style.maxWidth = '95vw';
      lbImg.style.maxHeight = '95vh';
      lbImg.style.width = 'auto';
      lbImg.style.height = 'auto';
    }
    resetZoom();
    overlay.classList.add('open');
    overlay.style.touchAction = 'none';
  }

  function closeOverlay() {
    overlay.classList.remove('open');
    overlay.style.touchAction = '';
    lbVideo.pause();
    lbVideo.removeAttribute('src');
    lbVideo.style.display = 'none';
    lbImg.style.display = '';
    resetZoom();
  }

  document.addEventListener('click', (e) => {
    /* Video lightbox */
    const vid = e.target.closest('.case-video video, .case-hero-video video');
    if (vid) {
      const source = vid.querySelector('source[src]');
      const src = source ? source.src : vid.src;
      openOverlay(src, true);
      return;
    }
    /* Image lightbox */
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

/* --- Mobile burger menu --- */

function initBurger() {
  const burger = document.querySelector('.nav-burger');
  const mobile = document.querySelector('.nav-mobile');
  if (!burger || !mobile) return;

  /* Populate mobile menu from desktop nav */
  const links = document.querySelector('.nav-links');
  const lang = document.querySelector('.nav-lang');
  if (links) {
    links.querySelectorAll('a').forEach(a => {
      const clone = a.cloneNode(true);
      mobile.appendChild(clone);
    });
  }
  if (lang) {
    const langDiv = document.createElement('div');
    langDiv.className = 'nav-mobile-lang';
    langDiv.innerHTML = lang.innerHTML;
    mobile.appendChild(langDiv);
  }

  burger.addEventListener('click', () => {
    const open = burger.classList.toggle('open');
    mobile.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    mobile.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  /* Close on link click */
  mobile.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      burger.classList.remove('open');
      mobile.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      mobile.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });

  /* Close on Escape */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobile.classList.contains('open')) {
      burger.click();
    }
  });
}

/* --- Dynamic Favicon per case page --- */

function initDynamicFavicon() {
  const colors = {
    flora: '#f48fb1', enxt: '#1976d2', teletype: '#4caf50', skysmart: '#ff9800',
    osme: '#9c27b0', sami: '#222', hunter: '#222', vedic: '#ca4f7d',
    qlean: '#00bcd4', prosto: '#ff5722', kombo: '#795548',
    'singularity-hub': '#3f51b5', 'singularity-words': '#3f51b5'
  };
  const match = location.pathname.match(/projects\/([a-z-]+)\.html/);
  if (!match) return;
  const color = colors[match[1]];
  if (!color) return;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="${color}"/></svg>`;
  const link = document.querySelector('link[rel="icon"]');
  if (link) link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/* --- Terminal Easter Egg (press ~) --- */

function initTerminal() {
  let el = null;
  const isRu = !location.pathname.includes('/en/');

  const commands = {
    help: () => isRu
      ? 'Команды: help, projects, contact, skills, about, clear, exit'
      : 'Commands: help, projects, contact, skills, about, clear, exit',
    projects: () => isRu
      ? 'Телетайп · Сами · Vedik Astroloji · Ловец · ENXT · Skysmart · Osme · Flora Delivery · Qlean · Просто · Комбо'
      : 'Teletype · Sami · Vedik Astroloji · Hunter · ENXT · Skysmart · Osme · Flora Delivery · Qlean · Prosto · Kombo',
    contact: () => 'telegram: @diyoriko\nemail: diyor.khakimov@gmail.com\nlinkedin: /in/diyoriko',
    skills: () => isRu
      ? 'Product Design · Brand Identity · UI/UX · Packaging · Print\nTypeScript · AI Agents · Telegram Bots · Automation'
      : 'Product Design · Brand Identity · UI/UX · Packaging · Print\nTypeScript · AI Agents · Telegram Bots · Automation',
    about: () => isRu
      ? 'Диёр Хакимов — продуктовый и бренд-дизайнер, 6+ лет опыта.\nЖиву в Каше, Турция. Работаю удалённо.'
      : 'Diyor Khakimov — product & brand designer, 6+ years of experience.\nBased in Kaş, Turkey. Working remotely.',
    clear: () => '__CLEAR__',
    exit: () => '__EXIT__',
  };

  function create() {
    el = document.createElement('div');
    el.id = 'terminal';
    el.innerHTML =
      '<div id="term-header"><span>~/diyor.design</span><button id="term-close">&times;</button></div>' +
      '<div id="term-body"><div id="term-output"></div>' +
      '<div id="term-line"><span id="term-prompt">→</span><input id="term-input" type="text" autocomplete="off" spellcheck="false"></div></div>';
    document.body.appendChild(el);

    const style = document.createElement('style');
    style.textContent =
      '#terminal{position:fixed;bottom:24px;right:24px;width:420px;max-width:calc(100vw - 32px);' +
      'background:#1a1a1a;border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.35);z-index:9999;' +
      'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;overflow:hidden;' +
      'animation:termIn .25s ease}' +
      '@keyframes termIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}' +
      '#term-header{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;' +
      'background:#252525;color:#888;font-size:12px;user-select:none}' +
      '#term-close{background:none;border:none;color:#666;font-size:18px;cursor:pointer;padding:0 4px;line-height:1}' +
      '#term-close:hover{color:#fff}' +
      '#term-body{padding:12px 14px 14px;max-height:320px;overflow-y:auto}' +
      '#term-output{color:#ccc;white-space:pre-wrap;word-break:break-word;line-height:1.5}' +
      '#term-output .cmd{color:#f8401c}' +
      '#term-output .out{color:#aaa}' +
      '#term-line{display:flex;align-items:center;gap:8px;margin-top:8px}' +
      '#term-prompt{color:#f8401c;flex-shrink:0}' +
      '#term-input{flex:1;background:none;border:none;color:#fff;font:inherit;outline:none;caret-color:#f8401c}';
    document.head.appendChild(style);

    const input = el.querySelector('#term-input');
    const output = el.querySelector('#term-output');
    const welcome = isRu ? 'Привет. Введи help для списка команд.' : 'Hi. Type help for available commands.';
    output.innerHTML = '<span class="out">' + welcome + '</span>\n';
    input.focus();

    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const cmd = input.value.trim().toLowerCase();
      input.value = '';
      if (!cmd) return;
      output.innerHTML += '<span class="cmd">→ ' + cmd + '</span>\n';
      const fn = commands[cmd];
      if (fn) {
        const result = fn();
        if (result === '__CLEAR__') { output.innerHTML = ''; return; }
        if (result === '__EXIT__') { destroy(); return; }
        output.innerHTML += '<span class="out">' + result + '</span>\n';
      } else {
        const msg = isRu ? 'Неизвестная команда. Введи help.' : 'Unknown command. Type help.';
        output.innerHTML += '<span class="out">' + msg + '</span>\n';
      }
      el.querySelector('#term-body').scrollTop = 9999;
    });

    el.querySelector('#term-close').addEventListener('click', destroy);
  }

  function destroy() {
    if (el) { el.remove(); el = null; }
  }

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote' || e.key === '`' || e.key === 'ё' || e.key === 'Ё') {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      if (el) destroy(); else create();
    }
    if (e.key === 'Escape' && el) {
      destroy();
    }
  });
}

/* --- Confetti on email copy --- */

function initEmailConfetti() {
  const emailLink = document.querySelector('a[href^="mailto:"]');
  if (!emailLink) return;

  emailLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = emailLink.href.replace('mailto:', '');
    navigator.clipboard.writeText(email).then(() => {
      /* Show "Copied" tooltip */
      const tip = document.createElement('span');
      tip.textContent = document.documentElement.lang === 'en' ? 'Copied!' : 'Скопировано!';
      tip.style.cssText =
        'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'background:#222;color:#fff;padding:8px 20px;border-radius:8px;font-family:var(--font-sans);' +
        'font-size:14px;z-index:10000;animation:tipFade 1.5s ease forwards;pointer-events:none';
      if (!document.getElementById('tip-fade-style')) {
        var style = document.createElement('style');
        style.id = 'tip-fade-style';
        style.textContent = '@keyframes tipFade{0%{opacity:0;transform:translate(-50%,-50%) scale(.9)}10%{opacity:1;transform:translate(-50%,-50%) scale(1)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%)}}';
        document.head.appendChild(style);
      }
      document.body.appendChild(tip);
      setTimeout(() => { tip.remove(); }, 1600);

      /* Confetti burst */
      fireConfetti();
    }).catch(() => {
      window.location.href = emailLink.href;
    });
  });

  function fireConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9998;pointer-events:none';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const colors = ['#F8401C', '#f48fb1', '#ffb74d', '#4fc3f7', '#81c784', '#ce93d8', '#fff176'];
    const pieces = [];
    const cx = canvas.width / 2, cy = canvas.height / 2;

    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      pieces.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.12 + Math.random() * 0.08,
        opacity: 1,
      });
    }

    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;
        p.opacity -= 0.012;
        if (p.opacity <= 0) return;
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      frame++;
      if (alive && frame < 120) requestAnimationFrame(draw);
      else canvas.remove();
    }
    requestAnimationFrame(draw);
  }
}

/* --- "Vanilla" Badge --- */

function initVanillaBadge() {
  /* Only on index pages */
  const p = location.pathname;
  if (p.includes('/projects/') || p.includes('about')) return;

  const badge = document.createElement('div');
  badge.innerHTML =
    '<span style="opacity:.5">0 frameworks · 0 dependencies · vanilla everything</span>' +
    '<span style="width:1px;height:14px;background:rgba(0,0,0,.12);display:inline-block;vertical-align:middle;margin:0 12px"></span>' +
    '<span data-action="grid" style="cursor:pointer"><span style="opacity:.5">Shift+G</span> grid</span>' +
    '<span style="width:1px;height:14px;background:rgba(0,0,0,.12);display:inline-block;vertical-align:middle;margin:0 12px"></span>' +
    '<span data-action="terminal" style="cursor:pointer"><span style="opacity:.5">~</span> terminal</span>' +
    '<span style="width:1px;height:14px;background:rgba(0,0,0,.12);display:inline-block;vertical-align:middle;margin:0 12px"></span>' +
    '<a href="https://github.com/diyoriko/portfolio" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:4px;vertical-align:middle">' +
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:middle"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>' +
      ' GitHub</a>';
  badge.style.cssText =
    'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);' +
    'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;' +
    'color:#999;background:rgba(255,255,255,.55);padding:8px 16px;border-radius:6px;' +
    '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);' +
    'border:1px solid rgba(0,0,0,.06);' +
    'pointer-events:auto;white-space:nowrap;' +
    'transition:all .3s;z-index:1;cursor:default';
  document.body.appendChild(badge);

  /* Hover near bottom: solid white, black text */
  document.addEventListener('mousemove', (e) => {
    const hot = e.clientY > window.innerHeight - 80;
    badge.style.background = hot ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,.55)';
    badge.style.color = hot ? '#000' : '#999';
  });

  /* Make "terminal" and "grid" clickable */
  badge.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'terminal') {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }));
    } else if (action.dataset.action === 'grid') {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG', shiftKey: true }));
    }
  });

}

/* --- Design System Toggle --- */

function initDesignSystemToggle() {
  let overlay = null;
  let styleEl = null;


  function create() {
    overlay = document.createElement('div');
    overlay.id = 'ds-overlay';

    styleEl = document.createElement('style');
    styleEl.id = 'ds-style';
    styleEl.textContent =
      '#ds-overlay{position:fixed;inset:0;z-index:9990;pointer-events:none;animation:dsIn .2s ease}' +
      '@keyframes dsIn{from{opacity:0}to{opacity:1}}' +
      '#ds-grid{position:absolute;inset:0;max-width:calc(var(--content-max) + var(--side-padding)*2);' +
      'margin:0 auto;padding:0 var(--side-padding);display:flex;gap:20px}' +
      '#ds-grid .col{flex:1;background:rgba(248,64,28,0.04);border-left:1px solid rgba(248,64,28,0.1);' +
      'border-right:1px solid rgba(248,64,28,0.1)}' +
      '#ds-panel{position:fixed;bottom:52px;left:50%;transform:translateX(-50%);' +
      'background:#1a1a1a;color:#ccc;border-radius:12px;padding:14px 20px;' +
      'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;' +
      'display:flex;gap:20px;align-items:center;pointer-events:auto;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.3);white-space:nowrap}' +
      '#ds-panel .sw{width:14px;height:14px;border-radius:3px;display:inline-block;' +
      'vertical-align:middle;margin-right:5px;box-shadow:0 0 0 1px rgba(255,255,255,.15)}' +
      '#ds-panel .sep{width:1px;height:20px;background:rgba(255,255,255,.12)}' +
      '#ds-panel .lb{color:#666;font-size:9px;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:1px}';
    document.head.appendChild(styleEl);

    const root = getComputedStyle(document.documentElement);
    const bg = root.getPropertyValue('--bg').trim();
    const accent = root.getPropertyValue('--accent').trim();
    const text = root.getPropertyValue('--text-body').trim();
    const dim = root.getPropertyValue('--text-dim').trim();
    const font = root.getPropertyValue('--font-sans').trim().split(',')[0].replace(/'/g, '');
    const mono = root.getPropertyValue('--font-mono').trim().split(',')[0].replace(/'/g, '');

    let gridHTML = '<div id="ds-grid">';
    for (let i = 0; i < 12; i++) gridHTML += '<div class="col"></div>';
    gridHTML += '</div>';

    overlay.innerHTML = gridHTML +
      '<div id="ds-panel">' +
        '<div><span class="lb">Colors</span>' +
        `<span class="sw" style="background:${bg}"></span>bg ` +
        `<span class="sw" style="background:${accent}"></span>accent ` +
        `<span class="sw" style="background:${text}"></span>text ` +
        `<span class="sw" style="background:${dim}"></span>dim</div>` +
        '<div class="sep"></div>' +
        `<div><span class="lb">Type</span>${font} · ${mono}</div>` +
        '<div class="sep"></div>' +
        '<div><span class="lb">Layout</span>1156px · 12 col · 20px gap</div>' +
      '</div>';

    document.body.appendChild(overlay);
  }

  function destroy() {
    if (overlay) { overlay.remove(); overlay = null; }
    if (styleEl) { styleEl.remove(); styleEl = null; }
  }

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.shiftKey && e.code === 'KeyG') {
      e.preventDefault();
      if (overlay) destroy(); else create();
    }
  });
}

/* --- Slideshows --- */

function initSlideshows() {
  document.querySelectorAll('[data-slideshow]').forEach(wrap => {
    const track = wrap.querySelector('.case-slideshow-track');
    const imgs = track.querySelectorAll('img');
    const counter = wrap.querySelector('[data-counter]');
    const prev = wrap.querySelector('[data-prev]');
    const next = wrap.querySelector('[data-next]');
    if (!track || imgs.length < 2) return;

    let current = 0;
    const total = imgs.length;

    function go(idx) {
      current = (idx + total) % total;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
      if (counter) counter.textContent = (current + 1) + '/' + total;
    }

    if (prev) prev.addEventListener('click', () => go(current - 1));
    if (next) next.addEventListener('click', () => go(current + 1));
  });
}

/* --- Nav scroll line --- */

function initNavScrollLine() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
}

/* --- Init --- */

document.addEventListener('DOMContentLoaded', () => {
  initNavScrollLine();
  initScrollReveal();
  initCaseTabs();
  initProjectLinks();
  initSlideshows();
  initLightbox();
  initBurger();
  initDynamicFavicon();
  initTerminal();
  initEmailConfetti();
  initDesignSystemToggle();
  initVanillaBadge();

  /* GoatCounter loads async — poll until ready */
  const gcInterval = setInterval(() => {
    if (window.goatcounter && window.goatcounter.count) {
      clearInterval(gcInterval);
      initGoatCounterEvents();
    }
  }, 200);
  setTimeout(() => clearInterval(gcInterval), 5000);
});
