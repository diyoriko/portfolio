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
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Image viewer');
  overlay.innerHTML = '<img alt=""><button class="lb-close" aria-label="Close">&times;</button><video autoplay loop muted playsinline style="display:none">';
  document.body.appendChild(overlay);
  let previousFocus = null;

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
    previousFocus = document.activeElement;
    overlay.querySelector('.lb-close').focus();
  }

  function closeOverlay() {
    overlay.classList.remove('open');
    overlay.style.touchAction = '';
    lbVideo.pause();
    lbVideo.removeAttribute('src');
    lbVideo.style.display = 'none';
    lbImg.style.display = '';
    resetZoom();
    if (previousFocus) previousFocus.focus();
  }

  /* Focus trap */
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      overlay.querySelector('.lb-close').focus();
    }
  });

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
  const history = [];
  let historyIdx = -1;

  /* Project map for "open" command */
  const projectMap = {
    teletype: 'teletype', sami: 'sami', vedic: 'vedic', hunter: 'hunter',
    enxt: 'enxt', skysmart: 'skysmart', osme: 'osme', flora: 'flora',
    qlean: 'qlean', prosto: 'prosto', kombo: 'kombo', appteka: 'appteka',
    hse: 'hse', 'singularity-hub': 'singularity-hub', 'singularity-words': 'singularity-words',
    /* RU aliases */
    телетайп: 'teletype', сами: 'sami', ловец: 'hunter', просто: 'prosto', комбо: 'kombo',
  };

  /* Fortune quotes */
  const fortunes = [
    '"Good design is as little design as possible." — Dieter Rams',
    '"Design is not just what it looks like. Design is how it works." — Steve Jobs',
    '"Simplicity is the ultimate sophistication." — Leonardo da Vinci',
    '"The details are not the details. They make the design." — Charles Eames',
    '"Less, but better." — Dieter Rams',
    '"Design is intelligence made visible." — Alina Wheeler',
    '"White space is to be regarded as an active element, not a passive background." — Jan Tschichold',
    '"A user interface is like a joke. If you have to explain it, it\'s not that good." — Martin LeBlanc',
    '"Typography is the craft of endowing human language with a durable visual form." — Robert Bringhurst',
    '"Have no fear of perfection — you\'ll never reach it." — Salvador Dalí',
    '"The best design is the one you don\'t notice." — Joe Sparano',
    '"Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away." — Antoine de Saint-Exupéry',
    '"Make it simple, but significant." — Don Draper',
    '"Color does not add a pleasant quality to design — it reinforces it." — Pierre Bonnard',
    '"Design creates culture. Culture shapes values. Values determine the future." — Robert L. Peters',
    '"Every great design begins with an even better story." — Lorinda Mamo',
    '"People ignore design that ignores people." — Frank Chimero',
    '"Styles come and go. Good design is a language, not a style." — Massimo Vignelli',
    '"The public is more familiar with bad design than good design. It is, in effect, conditioned to prefer bad design." — Paul Rand',
    '"You can\'t use up creativity. The more you use, the more you have." — Maya Angelou',
    '"Design is thinking made visual." — Saul Bass',
    '"Content precedes design. Design in the absence of content is not design, it\'s decoration." — Jeffrey Zeldman',
    '"Whitespace is like air: it is necessary for design to breathe." — Wojciech Zieliński',
    '"Good design is obvious. Great design is transparent." — Joe Sparano',
    '"If you think good design is expensive, you should look at the cost of bad design." — Ralf Speth',
    '"The best error message is the one that never shows up." — Thomas Fuchs',
    '"Consistency is one of the most powerful usability principles." — Jakob Nielsen',
    '"A beautiful product that doesn\'t work very well is ugly." — Jonathan Ive',
    '"Design is the silent ambassador of your brand." — Paul Rand',
    '"Creativity is just connecting things." — Steve Jobs',
  ];

  const commandNames = ['help', 'projects', 'contact', 'skills', 'about', 'open', 'neofetch', 'fortune', 'sudo', 'rm', 'matrix', 'ls', 'git', 'radar', 'clear', 'exit'];

  const commands = {
    help: () => isRu
      ? 'projects\ncontact\nskills\nabout\nopen <проект>    перейти к кейсу\nls -la           файловая система\ngit log          последние коммиты\nradar            что меняет дизайн\nneofetch         системная инфо\nfortune          цитата о дизайне\nsudo\nrm -rf /\nmatrix'
      : 'projects\ncontact\nskills\nabout\nopen <project>   go to case\nls -la           file system\ngit log          recent commits\nradar            design × AI feed\nneofetch         system info\nfortune          design quote\nsudo\nrm -rf /\nmatrix',
    projects: () => isRu
      ? 'Телетайп · Сами · Vedik Astroloji · Ловец · ENXT · Skysmart · Osme · Flora Delivery · Qlean · Просто · Комбо'
      : 'Teletype · Sami · Vedik Astroloji · Hunter · ENXT · Skysmart · Osme · Flora Delivery · Qlean · Prosto · Kombo',
    contact: () => 'telegram: @diyoriko\nemail: diyor.khakimov@gmail.com\nlinkedin: /in/diyoriko',
    skills: () =>
      'Design:  Product, Brand, UI/UX, Packaging, Print\nCode:    TypeScript, AI Agents, Bots, Automation',
    about: () => isRu
      ? 'Диёр Хакимов — продуктовый и бренд-дизайнер, 6+ лет опыта.\nЖиву в Каше, Турция. Работаю удалённо.'
      : 'Diyor Khakimov — product & brand designer, 6+ years of experience.\nBased in Kaş, Turkey. Working remotely.',
    neofetch: () => {
      const ua = navigator.userAgent;
      const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Unknown';
      const os = ua.includes('Mac') ? 'macOS' : ua.includes('Win') ? 'Windows' : ua.includes('Linux') ? 'Linux' : 'Unknown';
      const res = window.innerWidth + 'x' + window.innerHeight;
      const projects = 15;
      return '<span style="color:#f8401c">     ██████╗  </span>  <span style="color:#f8401c">diyor</span>@design\n' +
             '<span style="color:#f8401c">     ██╔══██╗ </span>  ──────────────\n' +
             '<span style="color:#f8401c">     ██║  ██║ </span>  OS: ' + os + '\n' +
             '<span style="color:#f8401c">     ██║  ██║ </span>  Browser: ' + browser + '\n' +
             '<span style="color:#f8401c">     ██████╔╝ </span>  Resolution: ' + res + '\n' +
             '<span style="color:#f8401c">     ╚═════╝  </span>  Stack: HTML/CSS/JS (vanilla)\n' +
             '              Projects: ' + projects + '\n' +
             '              Frameworks: 0\n' +
             '              Dependencies: 0';
    },
    fortune: () => {
      if (!commands._fortunePool || !commands._fortunePool.length)
        commands._fortunePool = fortunes.slice().sort(() => Math.random() - 0.5);
      return commands._fortunePool.pop();
    },
    sudo: () => isRu ? 'У вас нет прав. Но есть вкус.' : 'Permission denied. But you have great taste.',
    'rm -rf /': () => {
      /* Page destruction effect */
      const els = document.querySelectorAll('main > *, .nav, .ghost');
      els.forEach((el, i) => {
        el.style.transition = 'all 0.8s ease';
        el.style.transitionDelay = (i * 60) + 'ms';
        el.style.transform = 'rotate(' + (Math.random() * 40 - 20) + 'deg) translateY(' + (window.innerHeight + 200) + 'px)';
        el.style.opacity = '0';
      });
      setTimeout(() => {
        els.forEach(el => {
          el.style.transition = 'all 0.6s ease';
          el.style.transform = '';
          el.style.opacity = '';
        });
      }, 2500);
      return isRu ? 'Удаление... шучу. Всё вернётся.' : 'Deleting... just kidding. It\'ll come back.';
    },
    matrix: () => { startMatrix(); return isRu ? 'Добро пожаловать в Матрицу...' : 'Welcome to the Matrix...'; },
    ls: () =>
      '<span style="color:#4fc3f7">drwxr-xr-x</span>  diyor  staff   15 cases    <span style="color:#f8401c">projects/</span>\n' +
      '<span style="color:#4fc3f7">drwxr-xr-x</span>  diyor  staff  411M        <span style="color:#f8401c">assets/img/</span>\n' +
      '<span style="color:#4fc3f7">drwxr-xr-x</span>  diyor  staff    9 files   <span style="color:#f8401c">assets/embed/</span>\n' +
      '<span style="color:#4fc3f7">drwxr-xr-x</span>  diyor  staff  800K        <span style="color:#f8401c">assets/fonts/</span>\n' +
      '<span style="color:#4fc3f7">-rw-r--r--</span>  diyor  staff   42K        script.js\n' +
      '<span style="color:#4fc3f7">-rw-r--r--</span>  diyor  staff   38K        styles.css\n' +
      '<span style="color:#4fc3f7">-rw-r--r--</span>  diyor  staff   20K        index.html\n' +
      '<span style="color:#4fc3f7">-rw-r--r--</span>  diyor  staff    4K        about.html\n' +
      '<span style="color:#4fc3f7">-rw-r--r--</span>  diyor  staff    2K        404.html\n' +
      '<span style="color:#4fc3f7">-rw-r--r--</span>  diyor  staff    1K        favicon.svg\n' +
      '\n' + (isRu ? 'Всего: 0 фреймворков, 0 зависимостей, ~100% ручного кода' : 'Total: 0 frameworks, 0 dependencies, ~100% hand-coded'),
    radar: () =>
      '<span style="color:#f8401c">▌ RADAR</span> — ' + (isRu ? 'что сейчас меняет дизайн' : 'what\'s changing design right now') + '\n\n' +
      '<span style="color:#ffb74d">2026.03.24</span>  <span style="color:#f8401c">[figma×ai]</span>    Agents, Meet the Figma Canvas\n' +
      '<span style="color:#ffb74d">2026.03.20</span>  <span style="color:#f8401c">[design eng]</span>  Designing Frontends with GPT-5.4\n' +
      '<span style="color:#ffb74d">2026.03</span>     <span style="color:#f8401c">[tools]</span>       UI/UX Pro Max Skill — 50K+ stars\n' +
      '<span style="color:#ffb74d">2026.03</span>     <span style="color:#f8401c">[systems]</span>    Design Systems & AI: MCP Is The Unlock\n' +
      '<span style="color:#ffb74d">2026</span>        <span style="color:#f8401c">[design eng]</span>  Vibe Coding Guide for Designers\n' +
      '<span style="color:#ffb74d">2026.02.25</span>  <span style="color:#f8401c">[tools]</span>       Claude Code for Designers\n' +
      '<span style="color:#ffb74d">2026</span>        <span style="color:#f8401c">[figma×ai]</span>    Figma Make — General Availability\n' +
      '\n<span style="color:#888">' + (isRu ? 'Полный список → about.html#radar' : 'Full list → about.html#radar') + '</span>',
    'git log': () =>
      '<span style="color:#ffb74d">d226f26</span> feat: terminal upgrade, audit fixes, GoatCounter fix\n' +
      '<span style="color:#ffb74d">a5e99b7</span> fix: tighten about-links gap on mobile\n' +
      '<span style="color:#ffb74d">d74c6d6</span> fix: center text-glow higher inside banner on mobile\n' +
      '<span style="color:#ffb74d">4197812</span> fix: about-bottom double padding on mobile\n' +
      '<span style="color:#ffb74d">5b6c0e5</span> fix: About page mobile scroll + text-glow size\n' +
      '\n<span style="color:#888">— github.com/diyoriko/portfolio</span>',
    clear: () => '__CLEAR__',
    exit: () => '__EXIT__',
  };

  function create() {
    el = document.createElement('div');
    el.id = 'terminal';
    el.innerHTML =
      '<div id="term-header"><span>~/diyor.design</span><button id="term-close">&times;</button></div>' +
      '<div id="term-body"><div id="term-output"></div>' +
      '<div id="term-line"><span id="term-prompt">→</span><input id="term-input" type="text" autocomplete="off" spellcheck="false"></div></div>' +
      '<div id="term-footer">↑↓ history · Tab autocomplete · clear · Esc close</div>';
    document.body.appendChild(el);

    const style = document.createElement('style');
    style.textContent =
      '#terminal{position:fixed;bottom:24px;right:24px;width:500px;max-width:calc(100vw - 32px);' +
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
      '#term-input{flex:1;background:none;border:none;color:#fff;font:inherit;outline:none;caret-color:#f8401c}' +
      '#term-footer{padding:8px 14px;background:#252525;color:#555;font-size:11px;border-top:1px solid #333}';
    document.head.appendChild(style);

    const input = el.querySelector('#term-input');
    const output = el.querySelector('#term-output');
    const welcome = isRu ? 'Привет. Введи help для списка команд.' : 'Hi. Type help for available commands.';
    output.innerHTML = '<span class="out">' + welcome + '</span>\n';
    input.focus();

    input.addEventListener('keydown', (e) => {
      /* History navigation */
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (history.length && historyIdx < history.length - 1) {
          historyIdx++;
          input.value = history[history.length - 1 - historyIdx];
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIdx > 0) {
          historyIdx--;
          input.value = history[history.length - 1 - historyIdx];
        } else {
          historyIdx = -1;
          input.value = '';
        }
        return;
      }

      /* Tab autocomplete */
      if (e.key === 'Tab') {
        e.preventDefault();
        const partial = input.value.trim().toLowerCase();
        if (!partial) return;
        /* Check "open <partial>" */
        if (partial.startsWith('open ')) {
          const proj = partial.slice(5);
          const match = Object.keys(projectMap).find(k => k.startsWith(proj));
          if (match) input.value = 'open ' + match;
          return;
        }
        const match = commandNames.find(c => c.startsWith(partial));
        if (match) input.value = match;
        return;
      }

      if (e.key !== 'Enter') return;
      const raw = input.value.trim();
      const cmd = raw.toLowerCase();
      input.value = '';
      if (!cmd) return;

      /* Save to history */
      history.push(raw);
      historyIdx = -1;

      output.innerHTML += '<span class="cmd">→ ' + raw + '</span>\n';

      /* Handle "open <project>" */
      if (cmd.startsWith('open ')) {
        const proj = cmd.slice(5).trim();
        const slug = projectMap[proj];
        if (slug) {
          const prefix = isRu ? '' : '../en/';
          const isInProjects = location.pathname.includes('/projects/');
          const base = isInProjects ? '' : 'projects/';
          output.innerHTML += '<span class="out">' + (isRu ? 'Открываю ' : 'Opening ') + slug + '...</span>\n';
          el.querySelector('#term-body').scrollTop = 9999;
          setTimeout(() => { window.location.href = base + slug + '.html'; }, 400);
        } else {
          output.innerHTML += '<span class="out">' + (isRu ? 'Проект не найден. Введи projects для списка.' : 'Project not found. Type projects for the list.') + '</span>\n';
        }
        el.querySelector('#term-body').scrollTop = 9999;
        return;
      }

      /* Handle multi-word commands */
      const normCmd = cmd.replace(/\s+/g, ' ');
      if (normCmd === 'rm -rf /' || normCmd === 'rm -rf' || normCmd === 'rm') {
        const result = commands['rm -rf /']();
        output.innerHTML += '<span class="out">' + result + '</span>\n';
        el.querySelector('#term-body').scrollTop = 9999;
        return;
      }
      if (normCmd === 'git log' || normCmd === 'git') {
        const result = commands['git log']();
        output.innerHTML += '<span class="out">' + result + '</span>\n';
        el.querySelector('#term-body').scrollTop = 9999;
        return;
      }
      if (normCmd === 'ls -la' || normCmd === 'ls -l' || normCmd === 'ls' || normCmd === 'll') {
        const result = commands['ls']();
        output.innerHTML += '<span class="out">' + result + '</span>\n';
        el.querySelector('#term-body').scrollTop = 9999;
        return;
      }

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

  const isMobile = window.innerWidth <= 480;

  const sep = '<span style="width:1px;height:14px;background:rgba(0,0,0,.12);display:inline-block;vertical-align:middle;margin:0 12px"></span>';
  const ghIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:middle"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
  const ghLink = '<a href="https://github.com/diyoriko/portfolio" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:4px;vertical-align:middle">' + ghIcon + ' GitHub</a>';

  const badge = document.createElement('div');

  if (isMobile) {
    badge.innerHTML =
      '<span style="opacity:.5">vanilla everything</span>' + sep + ghLink;
  } else {
    badge.innerHTML =
      '<span style="opacity:.5">0 frameworks · 0 dependencies · vanilla everything</span>' + sep +
      '<span data-action="grid" style="cursor:pointer"><span style="opacity:.5">Shift+G</span> grid</span>' + sep +
      '<span data-action="terminal" style="cursor:pointer"><span style="opacity:.5">~</span> terminal</span>' + sep +
      ghLink;
  }

  badge.style.cssText =
    'position:fixed;bottom:16px;left:50%;transform:translateX(-50%) translateY(20px);' +
    'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;' +
    'color:#999;background:rgba(255,255,255,.55);padding:8px 16px;border-radius:6px;' +
    '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);' +
    'border:1px solid rgba(0,0,0,.06);' +
    'pointer-events:auto;white-space:nowrap;' +
    'transition:all .3s;z-index:1;cursor:default;opacity:0';

  document.body.appendChild(badge);

  /* Fade-in after 2s — don't distract from first impression */
  setTimeout(() => {
    badge.style.opacity = '1';
    badge.style.transform = 'translateX(-50%) translateY(0)';
  }, 2000);

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

/* --- Reading Progress Bar --- */

function initReadingProgress() {
  if (!document.querySelector('.main--case')) return;

  const bar = document.createElement('div');
  bar.className = 'reading-progress';
  document.body.appendChild(bar);

  function update() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(window.scrollY / docHeight, 1) * 100 : 0;
    bar.style.width = pct + '%';
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { update(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });
  update();
}

/* --- Arrow key navigation between cases --- */

function initCaseArrowNav() {
  const prevLink = document.querySelector('.case-nav-prev');
  const nextLink = document.querySelector('.case-nav-next');
  if (!prevLink && !nextLink) return;

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (document.getElementById('terminal')) return;
    if (document.querySelector('.case-lightbox.open')) return;

    if (e.key === 'ArrowLeft' && prevLink) {
      window.location.href = prevLink.href;
    } else if (e.key === 'ArrowRight' && nextLink) {
      window.location.href = nextLink.href;
    }
  });
}

/* --- Matrix Rain (terminal command) --- */

function startMatrix() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
  const fontSize = 14;
  const cols = Math.floor(canvas.width / fontSize);
  const drops = Array(cols).fill(1);

  let frame = 0;
  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f0';
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }

    frame++;
    if (frame < 300) requestAnimationFrame(draw);
    else { canvas.style.transition = 'opacity 1s'; canvas.style.opacity = '0'; setTimeout(() => canvas.remove(), 1000); }
  }
  requestAnimationFrame(draw);
}

/* --- Console.log signature --- */

function initConsoleSig() {
  console.log(
    '%c' +
    ' ██████╗  ██╗██╗   ██╗ ██████╗ ██████╗ \n' +
    ' ██╔══██╗ ██║╚██╗ ██╔╝██╔═══██╗██╔══██╗\n' +
    ' ██║  ██║ ██║ ╚████╔╝ ██║   ██║██████╔╝\n' +
    ' ██║  ██║ ██║  ╚██╔╝  ██║   ██║██╔══██╗\n' +
    ' ██████╔╝ ██║   ██║   ╚██████╔╝██║  ██║\n' +
    ' ╚═════╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝',
    'color:#F8401C;font-size:10px;font-family:monospace;line-height:1.2'
  );
  console.log(
    '%cProduct & Brand Designer\n' +
    'diyor.design\n\n' +
    'You read source? Let\'s talk → t.me/diyoriko\n' +
    'Press ~ for secret terminal  |  Shift+G for design system',
    'font-size:12px;font-family:system-ui;color:#888;line-height:1.6'
  );
}

/* --- Animated stat counters --- */

function initStatCounters() {
  const stats = document.querySelectorAll('.case-stat-value');
  if (!stats.length) return;

  const ob = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      ob.unobserve(entry.target);
      animateStat(entry.target);
    });
  }, { threshold: 0.5 });

  stats.forEach(el => ob.observe(el));
}

function animateStat(el) {
  const raw = el.textContent.trim();
  /* Parse prefix (+, −, -), number, suffix (%, +, etc.) */
  const match = raw.match(/^([+\u2212−-]?)(\d+(?:[.,]\d+)?)(.*)$/);
  if (!match) return; /* non-numeric like "4–18", skip */

  const prefix = match[1];
  const target = parseFloat(match[2].replace(',', '.'));
  const suffix = match[3];
  const isFloat = match[2].includes('.') || match[2].includes(',');
  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); /* ease-out cubic */
    const val = target * ease;
    el.textContent = prefix + (isFloat ? val.toFixed(1) : Math.round(val)) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* --- Cursor trail on 404 --- */

function initCursorTrail() {
  if (!document.querySelector('.e404')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const CELL = 24; /* matches .pixel-grid background-size */
  const POOL_SIZE = 30;
  const colors = ['#F8401C'];
  const pool = [];
  let idx = 0;
  const visited = new Set();

  /* Pre-allocate pool of pixel squares */
  for (let i = 0; i < POOL_SIZE; i++) {
    const px = document.createElement('div');
    px.style.cssText =
      'position:fixed;width:' + CELL + 'px;height:' + CELL + 'px;pointer-events:none;z-index:9990;' +
      'opacity:0;transition:opacity 1.2s ease;';
    document.body.appendChild(px);
    pool.push(px);
  }

  document.addEventListener('mousemove', (e) => {
    /* Snap to grid */
    const gx = Math.floor(e.clientX / CELL) * CELL;
    const gy = Math.floor(e.clientY / CELL) * CELL;
    const key = gx + ',' + gy;

    /* Skip if this cell was recently painted */
    if (visited.has(key)) return;
    visited.add(key);
    setTimeout(() => visited.delete(key), 1200);

    const px = pool[idx];
    idx = (idx + 1) % POOL_SIZE;

    px.style.transition = 'none';
    px.style.background = colors[0];
    px.style.left = gx + 'px';
    px.style.top = gy + 'px';
    px.style.opacity = '0.25';

    requestAnimationFrame(() => {
      px.style.transition = 'opacity 1.2s ease';
      px.style.opacity = '0';
    });
  });
}

/* --- Radar hover counter easter egg --- */

function initRadarCounter() {
  const feed = document.querySelector('.radar-feed');
  if (!feed) return;

  const counter = document.querySelector('.radar-counter');
  let count = 0;
  const isRu = !location.pathname.includes('/en/');

  feed.querySelectorAll('.radar-line').forEach(line => {
    line.addEventListener('mouseenter', () => {
      count++;
      if (count === 10) {
        counter.textContent = isRu ? 'Тебе интересно. Это хорошо.' : 'You\'re curious. Good.';
        counter.style.color = '#F8401C';
      } else if (count > 10) {
        counter.textContent = '';
        counter.style.color = '';
      }
    });
  });
}

/* --- Radar tag filter --- */

function initRadarFilter() {
  const tags = document.querySelector('.radar-tags');
  if (!tags) return;

  const buttons = tags.querySelectorAll('.radar-filter');
  const lines = document.querySelectorAll('.radar-line[data-tag]');

  tags.addEventListener('click', (e) => {
    const btn = e.target.closest('.radar-filter');
    if (!btn) return;

    const tag = btn.dataset.tag;

    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    lines.forEach(line => {
      if (tag === 'all' || line.dataset.tag === tag) {
        line.classList.remove('filtered-out');
      } else {
        line.classList.add('filtered-out');
      }
    });
  });
}

/* --- Radar: pick of the day (random card pulse) --- */

function initRadarPickOfDay() {
  const lines = document.querySelectorAll('.radar-line:not(.filtered-out)');
  if (!lines.length) return;
  /* Seed from date so same card highlights all day */
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const idx = seed % lines.length;
  lines[idx].classList.add('radar-pick');
}

/* --- Konami Code easter egg --- */

function initKonamiCode() {
  const code = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA'];
  let pos = 0;

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === code[pos]) {
      pos++;
      if (pos === code.length) {
        pos = 0;
        activateKonami();
      }
    } else {
      pos = 0;
    }
  });

  function activateKonami() {
    /* Invert colors */
    document.body.style.filter = 'invert(1) hue-rotate(180deg)';
    document.body.style.transition = 'filter 0.3s';

    /* Confetti burst */
    const colors = ['#F8401C', '#f48fb1', '#ffb74d', '#4fc3f7', '#81c784', '#ce93d8'];
    for (let i = 0; i < 80; i++) {
      const c = document.createElement('div');
      const size = Math.random() * 8 + 4;
      c.style.cssText =
        'position:fixed;pointer-events:none;z-index:9999;border-radius:' + (Math.random() > 0.5 ? '50%' : '0') + ';' +
        'width:' + size + 'px;height:' + size + 'px;' +
        'background:' + colors[Math.floor(Math.random() * 6)] + ';' +
        'left:' + (Math.random() * 100) + 'vw;top:-10px;' +
        'opacity:1;transition:all ' + (Math.random() * 2 + 1.5) + 's ease;';
      document.body.appendChild(c);
      requestAnimationFrame(() => {
        c.style.top = (60 + Math.random() * 40) + 'vh';
        c.style.left = (parseFloat(c.style.left) + (Math.random() * 20 - 10)) + 'vw';
        c.style.opacity = '0';
        c.style.transform = 'rotate(' + (Math.random() * 720 - 360) + 'deg)';
      });
      setTimeout(() => c.remove(), 3500);
    }

    /* Restore after 3s */
    setTimeout(() => {
      document.body.style.filter = '';
    }, 3000);
  }
}

/* --- Skeleton cleanup (mark loaded images) --- */

function initSkeletonCleanup() {
  document.querySelectorAll('.case-img-full, .case-img-row img, picture img').forEach(img => {
    if (img.complete) { img.dataset.loaded = ''; return; }
    img.addEventListener('load', () => { img.dataset.loaded = ''; }, { once: true });
  });
  document.querySelectorAll('.case-video video').forEach(v => {
    if (v.readyState >= 2) { v.dataset.loaded = ''; return; }
    v.addEventListener('loadeddata', () => { v.dataset.loaded = ''; }, { once: true });
  });
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
  initReadingProgress();
  initCaseArrowNav();
  initConsoleSig();
  initStatCounters();
  initCursorTrail();
  initSkeletonCleanup();
  initRadarCounter();
  initRadarFilter();
  initRadarPickOfDay();
  initKonamiCode();

  /* GoatCounter loads async — poll until ready, skip if blocked */
  try {
    const gcInterval = setInterval(() => {
      if (window.goatcounter && window.goatcounter.count) {
        clearInterval(gcInterval);
        initGoatCounterEvents();
      }
    }, 500);
    setTimeout(() => clearInterval(gcInterval), 5000);
  } catch (_) { /* blocked by adblocker, ignore */ }
});

/* Suppress View Transitions AbortError (normal when user clicks fast) */
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.name === 'AbortError') e.preventDefault();
});

