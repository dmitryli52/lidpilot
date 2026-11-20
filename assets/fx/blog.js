/* Блог: раскладка статьи (основа – блог платформы Лидгена) (выполняется ДО site.js, чтобы анимации/формы/аккордеон подхватили перенесённые блоки) */
(function () {
  var pr = document.querySelector('[data-prose]');
  if (!pr) return;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var kids = function () { return Array.prototype.slice.call(pr.children); };
  var isFaqH = function (h) { return /частые вопросы|faq|вопросы и ответы/i.test(h.textContent); };
  var plus = '<i class="acc__plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></i>';
  var accItem = function (q, html) {
    var d = document.createElement('div'); d.className = 'acc__item';
    d.innerHTML = '<button class="acc__btn" type="button" aria-expanded="false"><span></span>' + plus + '</button><div class="acc__body"><div></div></div>';
    d.querySelector('span').textContent = q; d.querySelector('.acc__body>div').innerHTML = html; return d;
  };

  /* 1. FAQ из тела статьи → в общий аккордеон */
  kids().forEach(function (h) {
    if (h.tagName !== 'H2' || !isFaqH(h)) return;
    var acc = document.querySelector('[data-faq-acc]'), items = [], cur = null, n = h.nextElementSibling;
    while (n && n.tagName !== 'H2') {
      var nx = n.nextElementSibling;
      if (n.tagName === 'H3') { cur = { q: n.textContent.trim(), a: '' }; items.push(cur); }
      else if (cur && n.tagName !== 'HR') cur.a += n.outerHTML;
      n.remove(); n = nx;
    }
    if (!items.length) return;
    if (!acc) {
      var box = document.createElement('div'); box.className = 'bfaq';
      box.innerHTML = '<h2>Частые вопросы</h2><div class="acc" data-acc data-faq-acc></div>';
      pr.after(box); acc = box.querySelector('[data-faq-acc]');
    }
    var seen = $$('.acc__btn span', acc).map(function (s) { return s.textContent.trim().toLowerCase(); });
    items.forEach(function (it) { if (seen.indexOf(it.q.toLowerCase()) < 0) acc.appendChild(accItem(it.q, it.a)); });
    h.remove();
  });

  /* 2. таблицы — в скролл-обёртку */
  $$('table', pr).forEach(function (t) { var w = document.createElement('div'); w.className = 'tbl'; t.before(w); w.appendChild(t); });

  /* 3. факт-бокс → инфографика: «Показатель: значение» или первое число — крупно */
  var num = /(?:до|от|на|более|около|в|×|x)?\s?[−-]?\d[\d\s]*(?:[.,]\d+)?\s?(?:%|процент\w*|раз[а]?|секунд\w*|сек\.?|минут\w*|мин\.?|час\w*|дн(?:ей|я|и)|рабочих дн\w*|недел\w*|месяц\w*|₽|руб\w*|тыс\.?|млн|лид\w*|заяв\w*)?/i;
  $$('aside.factbox li', pr).forEach(function (li) {
    if (li.querySelector('b.fv')) return;
    var t = li.textContent.trim().replace(/\.$/, ''), v = '', l = t, i = t.lastIndexOf(':');
    if (i > 0 && t.length - i < 44) { v = t.slice(i + 1).trim(); l = t.slice(0, i).trim(); }
    else { var m = t.match(num); if (m && /\d/.test(m[0])) { v = m[0].trim(); l = t; } }
    if (!v) return;
    li.textContent = ''; var b = document.createElement('b'); b.className = 'fv'; b.textContent = v;
    li.appendChild(b); li.appendChild(document.createTextNode(l.charAt(0).toUpperCase() + l.slice(1)));
  });
  $$('aside.factbox', pr).forEach(function (a) { a.classList.add('fx-rv-pop'); });

  /* 4. «Кейс …» / «Пример …» (h3) → карточка */
  $$('h3', pr).forEach(function (h) {
    if (h.parentElement !== pr || !/^(кейс|пример)/i.test(h.textContent.trim())) return;
    var c = document.createElement('div'); c.className = 'bcase fx-rv'; h.before(c);
    var n = h; while (n && (n === h || !/^H[23]$|^HR$|^ASIDE$/.test(n.tagName))) { var nx = n.nextElementSibling; c.appendChild(n); n = nx; }
  });
  $$('blockquote', pr).forEach(function (q) { q.classList.add('fx-rv'); });

  /* 5. вставки (демо кабинета, цифры, форма, второе демо) между разделами */
  var hs = kids().filter(function (e) { return e.tagName === 'H2'; });
  var slots = [2, 4, 6, 8], inj = $$('[data-inj-box] > [data-inj]');
  inj.forEach(function (b, k) { var h = hs[slots[k]]; if (h) h.before(b); else pr.appendChild(b); });
  var ib = document.querySelector('[data-inj-box]'); if (ib && !ib.children.length) ib.remove();

  /* 6. нумерация разделов + оглавление + прогресс чтения */
  hs = kids().filter(function (e) { return e.tagName === 'H2'; });
  var nav = document.querySelector('[data-toc] nav'), links = [];
  hs.forEach(function (h, i) {
    h.setAttribute('data-n', String(i + 1).padStart(2, '0'));
    if (!h.id) h.id = 'r' + (i + 1);
    if (!nav) return;
    var a = document.createElement('a'); a.href = '#' + h.id; a.textContent = h.textContent.replace(/\?$/, '');
    nav.appendChild(a); links.push(a);
  });
  if (!nav) return;
  if (!links.length) { var t = document.querySelector('[data-toc]'); if (t) t.remove(); return; }
  var bar = document.querySelector('.toc__bar i');
  var onScroll = function () {
    var r = pr.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight * .6)));
    if (bar) bar.style.width = (p * 100).toFixed(1) + '%';
    var cur = 0; hs.forEach(function (h, i) { if (h.getBoundingClientRect().top < 160) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle('is-on', i === cur); });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();
