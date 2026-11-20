/* Скрипт лендинга: все модули включаются data-атрибутами в разметке.
   Модули: якоря и меню, шапка, частицы, пин-сцена со скрабом, летающие слои, наклон,
   карусель-кольцо с табами, аккордеон, окно заявки, квиз, формы, anime.js, Motion. */
(() => {
  const root = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const A = !still && window.anime ? window.anime : null;
  const M = !still && window.Motion ? window.Motion : null;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const onScroll = fn => { let q = false; const run = () => { q = false; fn(); }; addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(run); } }, { passive: true }); addEventListener('resize', run); run(); };
  const hdr = () => ($('[data-header]')?.offsetHeight || 70);

  /* ---------- якоря (на landos стоит <base href>) и мобильное меню ---------- */
  const mnav = $('[data-mnav]'), burger = $('[data-burger]');
  const closeMenu = () => { if (!mnav) return; mnav.classList.remove('is-open'); burger?.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
  burger?.addEventListener('click', () => { mnav.classList.add('is-open'); burger.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; $('a', mnav)?.focus(); });
  $$('[data-mclose]').forEach(b => b.addEventListener('click', closeMenu));
  mnav?.addEventListener('click', e => { if (e.target === mnav) closeMenu(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href').slice(1); const t = id ? document.getElementById(id) : null;
    e.preventDefault(); closeMenu();
    const y = !t || t.dataset.top !== undefined ? 0 : t.getBoundingClientRect().top + scrollY - hdr() + 1;
    scrollTo({ top: y, behavior: still ? 'auto' : 'smooth' });
  });

  /* ---------- шапка: подложка после начала прокрутки ---------- */
  const header = $('[data-header]');
  header && onScroll(() => header.classList.toggle('is-stuck', scrollY > 30));

  /* ---------- частицы в тему (постоянное движение): <div data-particles="14"> ---------- */
  if (!still) $$('[data-particles]').forEach(box => {
    const n = +box.dataset.particles || 12;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      const r = Math.random;
      s.style.cssText = `--x:${(r() * 100).toFixed(1)}%;--s:${(.6 + r() * .9).toFixed(2)};--t:${(9 + r() * 10).toFixed(1)}s;--dl:${(-r() * 20).toFixed(1)}s;--sx:${(-60 + r() * 120).toFixed(0)}px;--rz:${(r() * 360).toFixed(0)}deg;--k:${i % 3}`;
      box.appendChild(s);
    }
  });

  /* ---------- пин-сцена со скрабом кадров ----------
     <section data-scene data-frames="48" data-seq="img/hero/seq/"> > .fx-scene__pin
       [data-stage] (рамка с пропорциями кадра) > img.fx-scene__still + canvas[data-canvas]
       [data-scene-ui] — гаснет к середине; [data-scene-fade] — гаснет раньше */
  const scene = $('[data-scene]');
  if (scene) {
    const pin = scene.firstElementChild, cv = $('[data-canvas]', scene), ctx = cv?.getContext('2d');
    const N = +scene.dataset.frames || 0, base = scene.dataset.seq || 'img/hero/seq/';
    const ui = $$('[data-scene-ui]', scene), fade = $$('[data-scene-fade]', scene);
    const imgs = new Array(N); let last = -1, ready = false;
    const nearest = i => { for (let d = 0; d < N; d++) { const a = imgs[i - d], b = imgs[i + d]; if (a?.complete && a.naturalWidth) return a; if (b?.complete && b.naturalWidth) return b; } return null; };
    const draw = im => {
      const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const k = Math.max(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * k, ih = im.naturalHeight * k;
      ctx.drawImage(im, (w - iw) / 2, (h - ih) / 2, iw, ih);
    };
    const tick = () => {
      const span = scene.offsetHeight - pin.offsetHeight;
      const p = span > 0 ? clamp(-scene.getBoundingClientRect().top / span, 0, 1) : 0;
      scene.style.setProperty('--p', p.toFixed(4));
      const u = 1 - smooth(.12, .42, p), f = 1 - smooth(.04, .2, p);
      ui.forEach(el => { el.style.opacity = u.toFixed(3); el.style.translate = `0 ${(-(1 - u) * 60).toFixed(1)}px`; el.style.visibility = u < .02 ? 'hidden' : ''; });
      fade.forEach(el => { el.style.opacity = f.toFixed(3); el.style.visibility = f < .02 ? 'hidden' : ''; });
      if (!cv || still || !N) return;
      cv.style.opacity = ready || p > .002 ? '1' : '0';
      const i = Math.round(p * (N - 1)); if (i === last) return;
      const im = nearest(i); if (im) { last = i; draw(im); }
    };
    if (cv && N && !still) {
      const order = []; for (let i = 0; i < N; i += 6) order.push(i); for (let i = 0; i < N; i++) if (i % 6) order.push(i);
      let live = 0, done = 0, next = 0;
      const pump = () => { while (live < 6 && next < order.length) { const i = order[next++]; live++; const im = new Image(); im.decoding = 'async';
        im.onload = () => { live--; if (++done >= N) ready = true; last = -1; tick(); pump(); }; im.onerror = () => { live--; pump(); };
        im.src = `${base}${String(i + 1).padStart(3, '0')}.webp`; imgs[i] = im; } };
      pump();
    }
    onScroll(() => { last = -1; tick(); });
  }

  /* ---------- летающие слои: data-float data-speed="-120" data-spin="18" data-zoom=".12" ---------- */
  const floats = $$('[data-float]');
  if (floats.length && !still) onScroll(() => {
    const half = innerHeight / 2, k = innerWidth < 640 ? .55 : 1;
    for (const el of floats) {
      const r = el.parentElement.getBoundingClientRect();
      const p = clamp((half - (r.top + r.height / 2)) / half, -1, 1);
      const z = 1 + ((p + 1) / 2) * (+el.dataset.zoom || 0);
      el.style.transform = `translate3d(0,${(p * (+el.dataset.speed || 0) * k).toFixed(1)}px,0) rotate(${(p * (+el.dataset.spin || 0)).toFixed(2)}deg) scale(${z.toFixed(4)})`;
    }
  });

  /* ---------- 3D-наклон и подсветка за курсором: data-tilt ---------- */
  if (fine && !still) $$('[data-tilt]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${((x - .5) * 10).toFixed(2)}deg`); el.style.setProperty('--rx', `${((.5 - y) * 8).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`); el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });

  /* ---------- объёмная карусель-кольцо: [data-ring] > [data-ring-spin] > .ring__item
     data-w — ширина карточки, data-start — с какой карточки начать, data-auto — автопрокрутка, мс.
     Навигация — внутри [data-ring-box]: [data-ring-prev] [data-ring-next] (где угодно, например по бокам), [data-ring-nav] > [data-ring-dots] ---------- */
  const rings = [];
  $$('[data-ring]').forEach(ring => {
    const spin = $('[data-ring-spin]', ring), base = [...spin.children], uniq = base.length;
    while (spin.children.length < 7) base.forEach(b => { const c = b.cloneNode(true); c.setAttribute('aria-hidden', 'true'); $$('a,button', c).forEach(x => x.tabIndex = -1); spin.appendChild(c); });
    const items = [...spin.children], n = items.length, step = 360 / n;
    const box = ring.closest('[data-ring-box]') || ring.parentElement;
    const nav = box.querySelector('[data-ring-nav]');
    const dotsBox = nav?.querySelector('[data-ring-dots]');
    let rot = 0, anim = null;
    items.forEach((it, i) => it.style.setProperty('--a', `${i * step}deg`));
    const dots = [];
    const nearestTo = u => { let best = null; for (let i = u; i < n; i += uniq) { const t = -i * step, tt = t + Math.round((rot - t) / 360) * 360; if (best === null || Math.abs(tt - rot) < Math.abs(best - rot)) best = tt; } return best; };
    const layout = () => {
      if (!ring.clientWidth) return;
      const cw = Math.min(+ring.dataset.w || 360, ring.clientWidth * (innerWidth < 640 ? .78 : .34));
      const rad = (cw / 2) / Math.tan(Math.PI / n) + (innerWidth < 640 ? 10 : +(ring.dataset.gap || 40));
      ring.style.setProperty('--cw', `${cw.toFixed(0)}px`); ring.style.setProperty('--rad', `${rad.toFixed(0)}px`);
    };
    const mark = () => {
      const idx = ((Math.round(-rot / step) % n) + n) % n;
      items.forEach((it, i) => { let d = ((i - idx) % n + n) % n; if (d > n / 2) d -= n;
        it.classList.toggle('is-front', d === 0); it.classList.toggle('is-back', d !== 0);
        it.style.visibility = Math.abs(d) > 2 ? 'hidden' : ''; });
      dots.forEach((d, i) => d.classList.toggle('is-active', i === idx % uniq));
    };
    const set = v => { rot = v; spin.style.setProperty('--rot', `${v.toFixed(2)}deg`); mark(); };
    const to = target => { anim?.stop?.(); if (M) anim = M.animate(rot, target, { type: 'spring', stiffness: 110, damping: 17, onUpdate: set }); else set(target); };
    const next = d => to((Math.round(rot / step) - d) * step);
    // точки общие для всех колец блока (табы): строит их только видимое кольцо, при смене таба — заново
    const buildDots = () => {
      if (!dotsBox || ring.closest('[hidden]')) return;
      dotsBox.textContent = ''; dots.length = 0;
      for (let i = 0; i < uniq; i++) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', `Карточка ${i + 1}`); b.addEventListener('click', () => { to(nearestTo(i)); hold(); }); dotsBox.appendChild(b); dots.push(b); }
      mark();
    };
    let paused = false, timer = 0;
    const hold = () => { paused = true; clearTimeout(timer); timer = setTimeout(() => { paused = false; }, 9000); };
    box.querySelectorAll('[data-ring-prev]').forEach(b => b.addEventListener('click', () => { if (!ring.closest('[hidden]')) { next(-1); hold(); } }));
    box.querySelectorAll('[data-ring-next]').forEach(b => b.addEventListener('click', () => { if (!ring.closest('[hidden]')) { next(1); hold(); } }));
    ring.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { next(1); hold(); } if (e.key === 'ArrowLeft') { next(-1); hold(); } });
    let sx = 0, r0 = 0, drag = false, moved = 0;
    ring.addEventListener('pointerdown', e => { if (e.button) return; drag = true; moved = 0; sx = e.clientX; r0 = rot; anim?.stop?.(); ring.classList.add('is-drag'); hold(); });
    addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); set(r0 + dx * (160 / Math.max(ring.clientWidth, 320))); });
    addEventListener('pointerup', () => { if (!drag) return; drag = false; ring.classList.remove('is-drag'); to(Math.round(rot / step) * step); });
    ring.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    ring.addEventListener('pointerenter', () => { paused = true; });
    ring.addEventListener('pointerleave', () => { if (!drag) paused = false; });
    if (!still && ring.dataset.auto) {
      let vis = false; new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(ring);
      setInterval(() => { if (vis && !paused && !drag && !document.hidden && !ring.closest('[hidden]')) next(1); }, +ring.dataset.auto);
    }
    ring.tabIndex = 0;
    layout(); set(-(+ring.dataset.start || 0) * step); buildDots();
    addEventListener('resize', layout);
    rings.push({ ring, layout, buildDots });
  });

  /* ---------- табы: [data-tabs] > button[data-tab="x"], панели [data-tab-panel="x"] ---------- */
  $$('[data-tabs]').forEach(tabs => {
    const btns = $$('[data-tab]', tabs);
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => { const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', String(on)); });
      $$('[data-tab-panel]').forEach(p => { p.hidden = p.dataset.tabPanel !== b.dataset.tab; });
      rings.forEach(r => { r.layout(); r.buildDots(); });
      const panel = $(`[data-tab-panel="${b.dataset.tab}"]`);
      panel && scramble($$('[data-scramble]', panel).slice(0, 12));
      if (M && panel) M.animate($$('.ring__item:not([style*="hidden"])', panel), { opacity: [0, 1] }, { duration: .5, delay: M.stagger(.04) });
    }));
  });

  /* ---------- аккордеон: [data-acc] > .acc__item > button.acc__btn + .acc__body ---------- */
  $$('[data-acc] .acc__btn').forEach(b => b.addEventListener('click', () => {
    const it = b.closest('.acc__item'), open = !it.classList.contains('is-open');
    it.classList.toggle('is-open', open); b.setAttribute('aria-expanded', String(open));
    const plus = $('.acc__plus', it);
    if (M && plus) M.animate(plus, { rotate: open ? 180 : 0 }, { type: 'spring', bounce: .5, duration: .6 });
  }));

  /* ---------- формы (демо: адрес отправки подключается к CRM/почте заказчика) ---------- */
  const phoneOk = v => v.replace(/\D/g, '').length >= 10;
  const check = f => {
    let first = null;
    $$('[required]', f).forEach(i => {
      const ok = i.type === 'checkbox' ? i.checked : i.type === 'tel' ? phoneOk(i.value) : !!i.value.trim();
      i.setAttribute('aria-invalid', String(!ok)); if (!ok && !first) first = i;
    });
    first?.focus(); return !first;
  };
  document.addEventListener('input', e => e.target.removeAttribute?.('aria-invalid'));
  $$('[data-form]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault(); const ok = check(f);
    f.classList.toggle('is-err', !ok); f.classList.toggle('is-sent', ok);
  }));

  /* ---------- окно заявки: <button data-lead="Заголовок окна" data-product="…"> + dialog[data-lead-dialog] ---------- */
  const dlg = $('[data-lead-dialog]');
  if (dlg) {
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-lead]'); if (!b) return;
      e.preventDefault();
      const f = $('form', dlg); f.classList.remove('is-sent', 'is-err');
      $('[data-lead-title]', dlg).textContent = b.dataset.lead || 'Оставьте заявку';
      const pr = $('[name="product"]', dlg); if (pr) pr.value = b.dataset.product || '';
      const pl = $('[data-lead-product]', dlg); if (pl) { pl.textContent = b.dataset.product || ''; pl.hidden = !b.dataset.product; }
      dlg.showModal(); setTimeout(() => $('input:not([type=hidden])', dlg)?.focus(), 30);
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    $$('[data-lead-close]', dlg).forEach(b => b.addEventListener('click', () => dlg.close()));
  }

  /* ---------- простые окна: <button data-open="id"> → dialog#id, внутри [data-close] ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-open]'); if (!b) return;
    const d = document.getElementById(b.dataset.open); if (!d?.showModal) return;
    e.preventDefault(); d.showModal();
  });
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });

  /* ---------- квиз: [data-quiz] > [data-step] … , [data-quiz-next], [data-quiz-back], [data-quiz-bar], [data-quiz-num] ---------- */
  $$('[data-quiz]').forEach(q => {
    const steps = $$('[data-step]', q), bar = $('[data-quiz-bar]', q), num = $('[data-quiz-num]', q);
    const nextB = $('[data-quiz-next]', q), backB = $('[data-quiz-back]', q);
    let i = 0;
    const show = k => {
      i = clamp(k, 0, steps.length - 1);
      steps.forEach((s, j) => { s.hidden = j !== i; });
      if (num) num.textContent = String(i + 1);
      if (bar) bar.style.setProperty('--q', ((i + 1) / steps.length).toFixed(3));
      if (backB) backB.hidden = i === 0;
      if (nextB) nextB.textContent = i === steps.length - 1 ? nextB.dataset.last : nextB.dataset.next;
      if (M) M.animate(steps[i], { opacity: [0, 1], x: [24, 0] }, { type: 'spring', bounce: .25, duration: .6 });
    };
    q.addEventListener('submit', e => {
      e.preventDefault();
      const s = steps[i], need = $$('input[type=radio],input[type=checkbox]', s).filter(x => x.name !== 'agree');
      if (need.length && !need.some(x => x.checked)) { s.classList.add('is-err'); need.forEach(x => x.setAttribute('aria-invalid', 'true')); need[0].focus(); return; }
      s.classList.remove('is-err'); need.forEach(x => x.removeAttribute('aria-invalid'));
      if (i < steps.length - 1) { show(i + 1); return; }
      if (check(q)) { q.classList.add('is-sent'); }
    });
    q.addEventListener('change', () => { steps[i].classList.remove('is-err'); $$('[aria-invalid]', steps[i]).forEach(x => x.type !== 'text' && x.type !== 'tel' && x.removeAttribute('aria-invalid')); });
    backB?.addEventListener('click', () => show(i - 1));
    show(0);
  });

  /* ---------- перебор символов (anime.js scrambleText или свой запасной) ---------- */
  function scramble(els) {
    if (!A || !els.length) return;
    els.forEach((el, k) => {
      const fin = el.dataset.final || (el.dataset.final = el.textContent);
      try { if (A.scrambleText) { A.animate(el, { innerHTML: A.scrambleText({ text: fin, chars: '0123456789–%', duration: 700 }), delay: k * 60 }); return; } } catch (e) {}
      let t = 0; const id = setInterval(() => { el.textContent = ++t > 10 ? fin : fin.replace(/\d/g, () => Math.floor(Math.random() * 10)); if (t > 10) clearInterval(id); }, 50);
    });
  }

  /* ---------- anime.js: буквы заголовка + интро, счётчики, рисование SVG, перебор цифр ---------- */
  if (A) {
    try {
      const h1 = $('[data-split]');
      if (h1) {
        h1.setAttribute('aria-label', h1.textContent.trim());
        const { chars } = A.splitText(h1, { words: true, chars: true });
        h1.style.visibility = 'visible';
        const tl = A.createTimeline({ defaults: { ease: 'out(4)' } });
        tl
          .add(chars, { y: ['110%', '0%'], opacity: [0, 1], rotateX: [-80, 0], delay: A.stagger(16), duration: 900, ease: 'outExpo' }, 120)
          .add('[data-intro]', { opacity: [0, 1], y: [26, 0], delay: A.stagger(120), duration: 700 }, 420)
          ;
        if ($('[data-intro-pop]')) tl.add('[data-intro-pop]', { opacity: [0, 1], scale: [.7, 1], delay: A.stagger(140), duration: 700, ease: 'outBack(1.6)' }, 700);
      }
    } catch (e) {}
    try {
      $$('[data-count]').forEach(el => {
        const to = +el.dataset.count, from = +(el.dataset.from || 0), o = { v: from };
        A.animate(o, { v: to, duration: 1800, ease: 'out(3)', delay: +(el.dataset.delay || 0),
          onUpdate: () => { const v = Math.round(o.v); el.textContent = v >= 10000 ? v.toLocaleString('ru-RU').replace(/\s/g, ' ') : String(v); },
          autoplay: A.onScroll({ target: el, enter: 'bottom-=5% top' }) });
      });
    } catch (e) {}
    try {
      $$('[data-draw-group]').forEach(g => {
        const paths = A.svg.createDrawable($$('[data-draw]', g));
        A.animate(paths, { draw: ['0 0', '0 1'], duration: 1300, delay: A.stagger(35), ease: 'inOut(2)', autoplay: A.onScroll({ target: g, enter: 'bottom-=12% top' }) });
      });
    } catch (e) {}
    try {
      $$('[data-scramble-in]').forEach(box => {
        let done = false;
        const io = new IntersectionObserver(es => { if (es[0].isIntersecting && !done) { done = true; scramble($$('[data-scramble]', box).filter(x => !x.closest('[hidden]')).slice(0, 12)); io.disconnect(); } }, { threshold: .3 });
        io.observe(box);
      });
    } catch (e) {}
  }
  /* ---------- самолётик летит над рядом шагов: [data-flight] > [data-flight-plane] (anime.js, ключевые кадры) ---------- */
  if (A) try {
    $$('[data-flight]').forEach(box => {
      const pl = $('[data-flight-plane]', box); if (!pl) return;
      const w = box.clientWidth - 50, n = 12, xs = [], ys = [], rs = [], os = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = t * Math.PI * 3;
        xs.push(Math.round(t * w)); ys.push(Math.round(Math.sin(a) * 34));
        rs.push(Math.round(Math.atan2(Math.cos(a) * 34 * Math.PI * 3 / w, 1) * 57.3 + 4)); os.push(i === 0 || i === n ? 0 : 1);
      }
      A.animate(pl, { x: xs, y: ys, rotate: rs, opacity: os }, { duration: 9000, ease: 'linear', loop: true, loopDelay: 1200 });
    });
  } catch (e) {}
  root.classList.remove('is-anim');

  /* ---------- Motion: пружины кнопок и карточек, групповые появления, зёрна из кнопки ---------- */
  if (M) {
    try {
      M.hover('[data-spring]', el => { M.animate(el, { scale: 1.045 }, { type: 'spring', bounce: .5, duration: .5 }); return () => M.animate(el, { scale: 1 }, { type: 'spring', bounce: .3, duration: .4 }); });
      M.press('[data-spring]', el => { M.animate(el, { scale: .94 }, { duration: .12 }); return () => M.animate(el, { scale: 1 }, { type: 'spring', bounce: .55, duration: .5 }); });
      M.inView('[data-group]', el => {
        const its = $$('[data-group-item]', el);
        M.animate(its, { opacity: [0, 1], y: [50, 0], rotateX: [18, 0] }, { delay: M.stagger(.08, { from: el.dataset.group || 'first' }), type: 'spring', bounce: .28, duration: 1 });
      }, { amount: .15 });
      if (!CSS.supports('animation-timeline: scroll()')) M.scroll(M.animate('[data-progress]', { scaleX: [0, 1] }));
    } catch (e) {}
  }
  /* зёрна разлетаются из кнопки при нажатии: data-burst */
  if (!still) document.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-burst]'); if (!b) return;
    for (let i = 0; i < 10; i++) {
      const g = document.createElement('i'); g.className = 'fx-burst';
      const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 70;
      g.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d - 30).toFixed(0)}px;--r:${(Math.random() * 360).toFixed(0)}deg`;
      document.body.appendChild(g); g.addEventListener('animationend', () => g.remove());
    }
  });
})();
