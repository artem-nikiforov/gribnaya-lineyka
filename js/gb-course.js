/* ════════════════════════════════════════════════════════════════════════
   ГРИБНАЯ ЛИНЕЙКА · ЛОГИКА СТРАНИЦ КУРСА
   ────────────────────────────────────────────────────────────────────────
   1. Параллакс обложки и шапок глав + споры
   2. Разделы блюд: видео, шпаргалка, упаковка, отметка «пройдено»
   3. Глава «Ингредиенты»: ролики, вес грибов, проверка
      Глава «Упаковка»: 3D-модель — в js/gb-pack3d.js
   4. Глава «Упаковка»: ситуационный тест
   5. Глава «Тренажёр»: роль, запуск, лучшие результаты, допуск к финалу
   6. Отметки «пройдено» на карточках оглавления
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const icon = (id, cls) => `<svg class="ku-ico ${cls || ""}"><use href="#${id}"/></svg>`;
  const KUv = {
    get: (n) => (window.KU ? window.KU.vars.get(n) : undefined),
    set: (n, v) => { if (window.KU) window.KU.vars.set(n, v); },
    done: (id) => { if (window.KU) window.KU.progress.markDone(id); },
    isDone: (id) => !!(window.KU && window.KU.progress.isDone(id)),
  };

  /* ══ 0. ДОЛЖНОСТЬ И РОЛЬ ════════════════════════════════════════════
     АУП (менеджер, директор, зам) — «Приготовление», «Ингредиенты» и
     тренажёр «Повар» на одном блюде. Член бригады — «Приготовление» и
     тренажёр под выбранную роль, без главы «Ингредиенты». */
  const POS_NAME = { aup: "АУП (менеджер, директор, зам)", crew: "Член бригады" };
  const ROLE_NAME = { cook: "Повар", cashier: "Кассир", universal: "Универсал" };
  const chaptersFor = (pos) => pos === "aup" ? ["cooking", "ingredients", "trainer"] : ["cooking", "trainer"];
  const position = () => KUv.get("position-key");
  const crewRole = () => KUv.get("role-key");
  // у АУП роль не выбирают: тренажёр всегда «Повар»
  const roleKeyOf = () => position() === "aup" ? "cook" : crewRole();

  function applyPosition() {
    const pos = position();
    const role = crewRole();
    const who = $("#gb-who"), contents = $("#gb-contents"), roleBox = $("#gb-who-role");
    $$("[data-pos]").forEach(b => { const on = b.dataset.pos === pos; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on); });
    $$("#gb-who-role [data-role]").forEach(b => { const on = b.dataset.role === role; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on); });
    if (roleBox) roleBox.hidden = pos !== "crew";
    const ready = pos === "aup" || (pos === "crew" && role);
    if (contents) contents.hidden = !ready;
    // курс линейный: выбор делается один раз — после него карточки закрыты
    $$("[data-pos], #gb-who-role [data-role]").forEach(b => {
      const chosen = b.dataset.pos ? b.dataset.pos === pos : b.dataset.role === role;
      b.disabled = !!ready; b.classList.toggle("is-dim", !!ready && !chosen);
    });
    const note = $("#gb-who-note");
    if (note) note.textContent = !pos ? "Выбери должность — после этого откроются главы курса."
      : pos === "crew" && !role ? "Выбери позицию — после этого откроются главы курса."
      : `Выбрано: ${pos === "aup" ? "АУП" : "член бригады, " + ROLE_NAME[role].toLowerCase()}. Главы курса — ниже.`;
    const toWho = () => $("#gb-who").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    const start = $("#gb-start");
    if (start) start.onclick = ready ? () => kuNavigate(chaptersFor(pos)[0]) : toWho;
    const scroll = $(".gb-hero__scroll");
    if (scroll) scroll.onclick = (e) => { e.preventDefault(); ready ? $("#gb-contents").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }) : toWho(); };
    if (!ready) return;
    const ids = chaptersFor(pos);
    if (window.kuSetChapters) window.kuSetChapters(ids);
    // карточки оглавления: только нужные главы, в нужном порядке и с нумерацией
    const grid = $(".gb-chapters");
    ids.forEach((id, i) => {
      const card = $(`[data-chapter="${id}"]`);
      if (!card) return;
      card.hidden = false;
      card.id = "ku-home-card-" + (i + 1);
      card.style.setProperty("--d", i + 1);
      const num = card.querySelector(".gb-chapter-card__num");
      if (num) num.textContent = "Глава " + (i + 1);
      if (grid) grid.appendChild(card);                       // порядок карточек = порядок глав
      const head = $(`[data-chapter-num="${id}"]`);
      if (head) head.textContent = "Глава " + (i + 1);
    });
    $$("[data-chapter]").forEach(c => { if (!ids.includes(c.dataset.chapter)) c.hidden = true; });
    const lead = $("#gb-trainer-lead");
    if (lead) lead.textContent = pos === "aup"
      ? "Короткий тренажёр повара: собери и упакуй Ангус Белые грибы два раза без ошибок."
      : "Тренажёр — под позицию, которую ты выбрал в начале курса.";
    // переходы между главами зависят от состава
    const ingrNext = $("#gb-ingr-next"), cookNext = $("#gb-cooking-next");
    if (cookNext) cookNext.innerHTML = pos === "aup"
      ? `${icon("i-right", "arrow")} Дальше: ингредиенты`
      : `${icon("i-trophy")} Дальше: тренажёр`;
    if (cookNext) cookNext.onclick = () => kuNavigate(pos === "aup" ? "ingredients" : "trainer");
    if (ingrNext) { ingrNext.innerHTML = `${icon("i-trophy")} Дальше: тренажёр`; ingrNext.onclick = () => kuNavigate("trainer"); }
    setVar("position", POS_NAME[pos] || "");
    setVar("role", pos === "aup" ? "Повар (АУП: короткий тренажёр)" : ROLE_NAME[role] || "");
    paintRoles();
    paint();
    markCards();
  }
  function initWho() {
    const locked = () => position() === "aup" || (position() === "crew" && !!crewRole());
    $$("[data-pos]").forEach(b => b.addEventListener("click", () => {
      if (locked()) return;
      KUv.set("position-key", b.dataset.pos);
      applyPosition();
      const t = b.dataset.pos === "crew" ? $("#gb-who-role") : $("#gb-contents");
      if (t) t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }));
    $$("#gb-who-role [data-role]").forEach(b => b.addEventListener("click", () => {
      if (locked()) return;
      KUv.set("role-key", b.dataset.role);
      applyPosition();
      const c = $("#gb-contents"); if (c) c.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }));
    document.addEventListener("ku:ready", applyPosition);
    applyPosition();
  }

  /* ══ ВИДЕО ПО КНОПКЕ ════════════════════════════════════════════════
     Плеер bktube создаётся при открытии модалки и удаляется при закрытии:
     не грузится заранее и не играет в фоне. */
  function initVideo() {
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-video-open]"); if (!b) return;
      const m = document.getElementById(b.dataset.videoOpen); if (!m) return;
      const box = m.querySelector(".gb-video-frame");
      box.innerHTML = `<iframe title="${m.dataset.embedTitle}" width="100%" height="100%" src="${m.dataset.embedSrc}" frameborder="0" allowfullscreen sandbox="allow-same-origin allow-scripts allow-popups allow-forms" style="position:absolute;inset:0"></iframe>`;
      window.kuOpenModal(m.id);
      new MutationObserver((_, obs) => {
        if (!m.classList.contains("open")) { box.innerHTML = ""; obs.disconnect(); }
      }).observe(m, { attributes: true, attributeFilter: ["class"] });
    });
  }

  /* ══ 1. ПАРАЛЛАКС ═══════════════════════════════════════════════════ */
  function initDecor() {
    // Декор-слои рисуем из GBArt (грибы, листья), разметка задаёт data-deco
    $$("[data-deco]").forEach(el => {
      const [kind, color] = el.dataset.deco.split("|");
      const A = window.GBArt;
      el.innerHTML = kind === "porcini" ? A.porcini(color ? { cap: color } : undefined)
        : kind === "leaf" ? A.leaf(color) : kind === "oak" ? A.oakLeaf(color) : "";
    });
    // Споры
    $$(".gb-spores").forEach(box => {
      const n = +box.dataset.count || 14;
      for (let i = 0; i < n; i++) {
        const s = document.createElement("i");
        s.style.setProperty("--x", Math.random() * 100 + "%");
        s.style.setProperty("--y", 30 + Math.random() * 70 + "%");
        s.style.setProperty("--s", 3 + Math.random() * 6 + "px");
        s.style.setProperty("--t", 7 + Math.random() * 8 + "s");
        s.style.setProperty("--delay", -Math.random() * 12 + "s");
        s.style.setProperty("--tx", (Math.random() * 60 - 30) + "px");
        box.appendChild(s);
      }
    });
    // Иллюстрации на карточках оглавления. Главы — реальные картинки: упаковки
    // отрендерены из 3D-моделей курса, соус и грибы — ассеты тренажёра, станция —
    // обложка тренажёра повара. Остальные ключи — векторные сцены ниже.
    const CARD_IMG = {
      cooking:     ["assets/img/chapter-cooking.webp", "Упаковки Биг Кинг, Ангус, Ангус Пита и «Твой особенный Воппер»", "contain"],
      ingredients: ["assets/img/chapter-ingredients.webp", "Соус Белые грибы в тубе с пистолетом и жареные грибы в пэне", "contain"],
      trainer:     ["assets/img/chapter-trainer.webp", "Станция сборки: борт с ингредиентами и бумага для сэндвича", "cover"],
    };
    $$("[data-cardart]").forEach(el => {
      const A = window.GBArt, k = el.dataset.cardart;
      if (CARD_IMG[k]) {
        const [src, alt, fit] = CARD_IMG[k];
        el.innerHTML = `<img class="gb-chapter-card__img is-${fit}" src="${src}" alt="${alt}" loading="lazy" decoding="async">`;
        return;
      }
      if (k === "video") el.innerHTML = A.svg("0 0 320 200", `
        <circle cx="250" cy="40" r="80" style="fill:rgba(255,255,255,.08)"/>
        <g transform="translate(24 60) scale(1.05)">${A.porcini().replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>
        <g transform="translate(150 70)"><circle cx="50" cy="50" r="46" style="fill:rgba(255,255,255,.22)"/><path d="M40 30 L74 50 L40 70 Z" style="fill:#fff"/></g>`, 'preserveAspectRatio="xMidYMid slice"');
      const inner = (m) => m.replace(/^<svg[^>]*>|<\/svg>$/g, "");
      if (k === "ingredients") el.innerHTML = A.svg("0 0 320 200", `
        <circle cx="160" cy="210" r="120" style="fill:rgba(255,255,255,.08)"/>
        <g transform="translate(34 22) scale(1.6)">${inner(A.ING_ART.sauceM())}</g>
        <g transform="translate(160 36) scale(1.45)">${inner(A.ING_ART.mush())}</g>`, 'preserveAspectRatio="xMidYMid slice"');
      if (k === "cooking") el.innerHTML = A.svg("0 0 320 200", `
        <circle cx="255" cy="45" r="85" style="fill:rgba(255,255,255,.08)"/>
        <g transform="translate(16 44) scale(0.92)">${inner(A.svg("0 0 200 200", A.bun(true) + A.layerArt.patty(0) + A.layerArt.cheddar(0) + A.layerArt.mush(0)))}</g>
        <g transform="translate(150 20) scale(0.86)">${inner(A.pack("bigking", { view: "front" }))}</g>`, 'preserveAspectRatio="xMidYMid slice"');
      if (k === "angus") el.innerHTML = A.svg("0 0 320 200", `
        <circle cx="250" cy="40" r="80" style="fill:rgba(255,255,255,.08)"/>
        <g transform="translate(20 54) scale(1.05)">${inner(A.ING_ART.pattyA())}</g>
        <g transform="translate(150 36) scale(1.5)">${inner(A.pack("angus", { view: "marks", marks: [{ kind: "flap", label: "Сезонный" }] }))}</g>`, 'preserveAspectRatio="xMidYMid slice"');
      if (k === "bigking") el.innerHTML = A.svg("0 0 320 200", `
        <circle cx="70" cy="170" r="90" style="fill:rgba(255,255,255,.08)"/>
        <g transform="translate(96 14) scale(0.92)">${inner(A.pack("bigking", { view: "front" }))}</g>`, 'preserveAspectRatio="xMidYMid slice"');
      if (k === "pita") el.innerHTML = A.svg("0 0 320 200", `
        <circle cx="240" cy="60" r="85" style="fill:rgba(255,255,255,.08)"/>
        <g transform="translate(60 10) scale(0.92)">${inner(A.tortilla())}</g>
        <g transform="translate(150 40) scale(0.8)">${inner(A.svg("0 0 200 200", A.layerArt.mush(0) + A.layerArt.iceberg()))}</g>`, 'preserveAspectRatio="xMidYMid slice"');
      if (k === "pack") el.innerHTML = A.svg("0 0 320 200", `
        <circle cx="60" cy="170" r="90" style="fill:rgba(255,255,255,.08)"/>
        <g transform="translate(100 18) rotate(-8 60 80) scale(.82)">${A.pack("whopper", { view: "marks", zoom: true, marks: [{ kind: "flap", label: "Белые грибы" }] }).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`, 'preserveAspectRatio="xMidYMid slice"');
      if (k === "trainer") el.innerHTML = A.svg("0 0 320 200", `
        <circle cx="270" cy="160" r="90" style="fill:rgba(255,255,255,.08)"/>
        <g transform="translate(40 30) scale(.7)">${A.bun(true)}${A.layerArt.iceberg()}${A.layerArt.tomato(0)}${A.layerArt.tomato(1)}</g>
        <g transform="translate(170 30) scale(.7)">${A.bun(true)}${A.patty(80, true, 3)}${A.layerArt.cheddar(0)}${A.layerArt.mush(0)}</g>`, 'preserveAspectRatio="xMidYMid slice"');
    });
    if (reduce) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      $$(".gb-hero, .gb-chapter-head").forEach(h => {
        const r = h.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        h.style.setProperty("--sy", Math.round(-r.top));
      });
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const mx = (e.clientX / innerWidth) * 2 - 1, my = (e.clientY / innerHeight) * 2 - 1;
      $$(".gb-hero, .gb-chapter-head").forEach(h => { h.style.setProperty("--mx", mx.toFixed(3)); h.style.setProperty("--my", my.toFixed(3)); });
    }, { passive: true });
    update();
  }

  /* ══ 2. РАЗДЕЛЫ БЛЮД: видео, шпаргалка, упаковка ════════════════════ */
  const DISHES = ["angus", "bigking", "pita"];
  function initDishes() {
    // iframe вставляем, только если методист указал ссылку
    $$("[data-video-src]").forEach(fr => {
      const src = fr.dataset.videoSrc.trim();
      if (!src) return;
      // BK Tube отдаёт PeerTube-плеер: песочница как в штатном коде вставки
      fr.innerHTML = `<iframe src="${src}" title="${fr.dataset.videoTitle || "Видео"}"
        allow="autoplay; fullscreen; picture-in-picture" loading="lazy"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms" frameborder="0"></iframe>`;
    });
    // плоские SVG-упаковки в разделах блюд
    $$("[data-art]").forEach(el => {
      if (el.dataset.gbArt || !window.GBArtRender) return;
      el.dataset.gbArt = "1";
      el.innerHTML = window.GBArtRender(el.dataset.art);
    });
    // фото со станции — по клику крупно, чтобы рассмотреть маркировку
    const box = document.createElement("div");
    box.className = "gb-lightbox"; box.hidden = true;
    box.innerHTML = `<button class="gb-tool gb-lightbox__close" aria-label="Закрыть">${icon("i-x")}</button>` +
      `<div class="gb-lightbox__stage"><img alt=""></div>` +
      `<span class="gb-lightbox__hint">Нажми на фото, чтобы приблизить</span>`;
    document.body.appendChild(box);
    const stage = box.querySelector(".gb-lightbox__stage");
    const bigImg = box.querySelector("img");
    const hint = box.querySelector(".gb-lightbox__hint");
    const setZoom = (on, ev) => {                       // приближение: втрое крупнее, чтобы читалась маркировка
      if (on) bigImg.style.width = Math.max(bigImg.getBoundingClientRect().width * 3, 900) + "px";
      else bigImg.style.width = "";
      bigImg.classList.toggle("is-zoom", on);
      hint.textContent = on ? "Нажми ещё раз, чтобы отдалить" : "Нажми на фото, чтобы приблизить";
      if (!on) { stage.scrollTo(0, 0); return; }
      const r = stage.getBoundingClientRect();
      const px = ev ? (ev.clientX - r.left) / r.width : 0.5;
      const py = ev ? (ev.clientY - r.top) / r.height : 0.5;
      stage.scrollTo(px * (stage.scrollWidth - r.width), py * (stage.scrollHeight - r.height));
    };
    bigImg.addEventListener("click", (e) => { e.stopPropagation(); setZoom(!bigImg.classList.contains("is-zoom"), e); });
    const closeBox = () => { box.hidden = true; document.body.style.overflow = ""; setZoom(false); };
    box.addEventListener("click", (e) => { if (e.target === box || e.target.closest(".gb-lightbox__close")) closeBox(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeBox(); });
    $$(".gb-photo img, .gb-shelf__card img").forEach(img => {
      img.tabIndex = 0; img.setAttribute("role", "button");
      const open = () => {
        bigImg.src = img.src; bigImg.alt = img.alt;
        setZoom(false);
        box.hidden = false; document.body.style.overflow = "hidden";
      };
      img.addEventListener("click", open);
      img.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });

    // подглавы-блюда: вкладки, переходы и отметка «разобрал»
    const subs = $$(".gb-sub"), tabs = $$("[data-sub-tab]");
    if (!subs.length) return;
    const show = (key) => {
      subs.forEach(x => x.classList.toggle("is-active", x.dataset.sub === key));
      tabs.forEach(t => { const on = t.dataset.subTab === key; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", on); });
      paintSubs();
      // встаём на начало подглавы: сперва её заголовок и ролик, а не середина блока
      const nav = $(".gb-subnav-wrap");
      const cur = subs.find(x => x.dataset.sub === key);
      if (cur) {
        const off = nav ? nav.getBoundingClientRect().height + 8 : 8;
        window.scrollTo({ top: cur.getBoundingClientRect().top + scrollY - off, behavior: reduce ? "auto" : "smooth" });
      }
    };
    const paintSubs = () => {
      if (KUv.isDone("pack-quiz")) KUv.done("ch-whopper");     // подглава Воппера закрывается тестом
      tabs.forEach(t => t.classList.toggle("is-seen", KUv.isDone("ch-" + t.dataset.subTab)));
      const all = tabs.every(t => KUv.isDone("ch-" + t.dataset.subTab));
      if (all) KUv.done("ch-cooking");
      const n = $("#gb-cooking-next"); if (n) n.disabled = !all;
      const note = $("#gb-cooking-note"); if (note) note.hidden = all;
    };
    tabs.forEach(t => t.addEventListener("click", () => show(t.dataset.subTab)));
    $$("[data-sub-next]").forEach(b => b.addEventListener("click", () => {
      const cur = b.closest(".gb-sub");
      if (cur) KUv.done("ch-" + cur.dataset.sub);
      show(b.dataset.subNext);
    }));
    document.addEventListener("ku:done", paintSubs);
    document.addEventListener("ku:ready", paintSubs);
    show("angus");
  }
  /* ══ 3. ИНГРЕДИЕНТЫ ═════════════════════════════════════════════════ */
  function initIngredients() {
    const page = $("#ku-page-ingredients"); if (!page) return;

    // Ролики: без звука, по кругу, играют только пока видны. Тап — пауза/пуск.
    const clips = $$(".gb-clip", page);
    const setState = (c, playing) => {
      c.classList.toggle("is-paused", !playing);
      const b = $(".gb-clip__toggle", c);
      b.setAttribute("aria-label", playing ? "Пауза" : "Смотреть");
      b.innerHTML = icon(playing ? "i-pause" : "i-play");
    };
    clips.forEach(c => {
      const v = $("video", c);
      c.dataset.auto = reduce ? "0" : "1";               // при «уменьшить движение» сами не стартуют
      setState(c, false);
      v.addEventListener("play", () => setState(c, true));
      v.addEventListener("pause", () => setState(c, false));
      $(".gb-clip__toggle", c).addEventListener("click", () => {
        if (v.paused) { c.dataset.auto = "1"; v.play().catch(() => {}); }
        else { c.dataset.auto = "0"; v.pause(); }
      });
    });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => entries.forEach(e => {
        const c = e.target, v = $("video", c);
        if (e.isIntersecting && c.dataset.auto === "1" && page.classList.contains("active")) v.play().catch(() => {});
        else if (!e.isIntersecting && !v.paused) v.pause();
      }), { threshold: 0.45 });
      clips.forEach(c => io.observe(c));
      document.addEventListener("gb:page", (e) => {
        if (e.detail === "ingredients") clips.forEach(c => { io.unobserve(c); io.observe(c); });
        else clips.forEach(c => $("video", c).pause());
      });
    }

    // Вес грибов: 1 или 2 цикла
    const weight = $("#gb-weight");
    const paintWeight = (n) => {
      $$("[data-weight]", weight).forEach(b => b.setAttribute("aria-checked", String(+b.dataset.weight === n)));
      $(".gb-weight__res", weight).innerHTML = n === 1
        ? `${icon("i-clock", "s")} <span><b>Один цикл:</b> кнопка 5 (11 секунд), потом перемешать.</span>`
        : `${icon("i-clock", "s")} <span><b>Два цикла:</b> кнопка 5 (11 секунд), перемешать — и ещё раз.</span>`;
      const step = $("[data-weight-step]", page);
      step.classList.toggle("is-skip", n === 1);
      const last = $("[data-last-num]", page); if (last) last.textContent = n === 1 ? "3" : "4";
    };
    weight.addEventListener("click", (e) => { const b = e.target.closest("[data-weight]"); if (b) paintWeight(+b.dataset.weight); });
    paintWeight(1);

    // Проверка: пояснение к каждому ответу (подсветку и прогресс ставит kuds.js)
    const quiz = $("#gb-ingr-quiz");
    const unlock = () => {
      const n = $("#gb-ingr-next"); if (n) n.disabled = false;
      const note = $("#gb-ingr-note"); if (note) note.hidden = true;
    };
    quiz.addEventListener("click", (e) => {
      const btn = e.target.closest(".ku-choice"); if (!btn) return;
      const q = btn.closest(".ku-quiz-q");
      setTimeout(() => {                                   // после обработчика kuds.js
        const fb = $(".ku-feedback", q);
        const ok = btn.dataset.correct === "1";
        if (!ok && q.classList.contains("solved")) return;
        fb.className = "ku-feedback show " + (ok ? "correct" : "incorrect");
        fb.innerHTML = `<span>${btn.dataset.fb || ""}</span>`;
        if (ok && window.KU) window.KU.lms.interaction("ingr-q" + ($$(".ku-quiz-q", quiz).indexOf(q) + 1), btn.textContent.trim(), "correct");
        if ($$(".ku-quiz-q", quiz).every(x => x.classList.contains("solved"))) {
          const all = $("#fb-ingr-quiz");
          all.className = "ku-feedback show correct";
          all.innerHTML = `<span><strong>Все ответы верные.</strong> Можно переходить к упаковке.</span>`;
          KUv.done("ch-ingredients");
          unlock();
        }
      }, 0);
    });
    document.addEventListener("ku:ready", () => { if (KUv.isDone("ch-ingredients")) unlock(); });
  }

  /* ══ 4. СИТУАЦИОННЫЙ ТЕСТ ПО УПАКОВКЕ ═══════════════════════════════ */
  const PQ = [
    {
      situation: "Гость заказал <b>Воппер Белые грибы</b>. На станции есть и текущая упаковка Воппера, и новая «Твой особенный Воппер» — называются они одинаково, отличаются клапанами. Какую возьмёшь и как промаркируешь?",
      options: [
        { label: "Текущая упаковка", sub: "Продавить клапан «Вкус сезона»", ok: true,
          fb: "<strong>Верно.</strong> Пока текущая упаковка не закончилась, упаковывай в неё и отмечай клапан «Вкус сезона»." },
        { label: "Новая упаковка", sub: "Продавить клапан «Белые грибы»",
          fb: "<strong>Пока рано.</strong> Новую упаковку начинают использовать, когда закончится текущая. Какую упаковку взять сейчас?" },
        { label: "Текущая упаковка", sub: "Без отметки",
          fb: "<strong>Не хватает маркировки.</strong> Без отметки кассир не отличит Воппер Белые грибы от другого Воппера. Какой клапан есть на текущей упаковке?" },
      ],
    },
    {
      situation: "Следующий заказ — <b>Воппер Ролл Белые грибы</b>. В ресторан <b>уже приехала новая упаковка ролла</b>, на станции остались обе. Что выберешь?",
      options: [
        { label: "Новая упаковка ролла", sub: "Продавить клапан «Белые грибы»", ok: true,
          fb: "<strong>Верно.</strong> У ролла правило другое, чем у Воппера: приехала новая упаковка — работаем только с ней и отмечаем «Белые грибы»." },
        { label: "Текущая упаковка ролла", sub: "Продавить клапан «Вкус сезона»",
          fb: "<strong>Это правило Воппера.</strong> Ролл переходит на новую упаковку сразу, как только она приехала в ресторан. Какую упаковку взять?" },
        { label: "Новая упаковка ролла", sub: "Без отметки",
          fb: "<strong>Не хватает маркировки.</strong> Без отметки Воппер Ролл Белые грибы не отличить от другого ролла. Какой клапан есть на новой упаковке?" },
      ],
    },
    {
      situation: "Прошла неделя, <b>текущая упаковка Воппера закончилась</b>. Гость заказал Воппер Белые грибы. Как упакуешь?",
      options: [
        { label: "Новая упаковка", sub: "Продавить клапан «Вкус сезона»",
          fb: "<strong>Такого клапана здесь нет.</strong> На новой упаковке вкус написан словами. Найди на крышке клапан с названием соуса." },
        { label: "Новая упаковка", sub: "Продавить клапан «Белые грибы»", ok: true,
          fb: "<strong>Верно.</strong> Текущая закончилась — берёшь новую упаковку и продавливаешь клапан «Белые грибы»." },
        { label: "Новая упаковка", sub: "Без отметки",
          fb: "<strong>Не хватает маркировки.</strong> Даже на новой упаковке вкус нужно отметить — продави нужный клапан." },
      ],
    },
  ];
  function initPackQuiz() {
    const root = $("#gb-pq"); if (!root) return;
    let qi = 0;
    const draw = () => {
      const q = PQ[qi];
      root.querySelector(".gb-steps-mini").innerHTML = PQ.map((_, i) => `<i class="${i < qi ? "is-done" : i === qi ? "is-active" : ""}"></i>`).join("");
      root.querySelector("[data-pq-count]").textContent = `Ситуация ${qi + 1} из ${PQ.length}`;
      root.querySelector("[data-pq-situation]").innerHTML = q.situation;
      root.querySelector("[data-pq-options]").innerHTML = q.options.map((o, i) => `
        <button class="gb-pq-opt" data-o="${i}">
          <span class="gb-pq-opt__label"><span class="ku-choice__marker">${icon("i-check", "s")}</span><span>${o.label}<span class="gb-pq-opt__sub">${o.sub}</span></span></span>
        </button>`).join("");
      const fb = root.querySelector("#fb-pq");
      fb.className = "ku-feedback";
      fb.innerHTML = "";
      root.querySelector("[data-pq-next]").hidden = true;
    };
    root.addEventListener("click", (e) => {
      if (e.target.closest("[data-prompt-key]")) return;
      const b = e.target.closest("[data-o]");
      if (b && !b.disabled) {
        const o = PQ[qi].options[+b.dataset.o];
        const fb = root.querySelector("#fb-pq");
        fb.className = "ku-feedback show " + (o.ok ? "correct" : "incorrect");
        fb.innerHTML = `<span>${o.fb}</span>`;
        if (o.ok) {
          b.classList.add("correct");
          $$("[data-o]", root).forEach(x => { x.disabled = true; if (x !== b) x.classList.add("dim"); });
          if (window.KU) window.KU.lms.interaction("pack-q" + (qi + 1), o.label + ": " + o.sub, "correct");
          const next = root.querySelector("[data-pq-next]");
          next.hidden = false;
          next.innerHTML = qi < PQ.length - 1 ? `Следующая ситуация ${icon("i-right", "arrow")}` : `Готово ${icon("i-check")}`;
          next.focus({ preventScroll: true });
        } else {
          b.classList.remove("wrong"); void b.offsetWidth; b.classList.add("wrong");
        }
        return;
      }
      if (e.target.closest("[data-pq-next]")) {
        if (qi < PQ.length - 1) { qi++; draw(); root.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); }
        else finish();
      }
    });
    const finish = () => {
      KUv.done("pack-quiz");
      root.querySelector(".gb-steps-mini").innerHTML = PQ.map(() => `<i class="is-done"></i>`).join("");
      root.querySelector("[data-pq-body]").innerHTML = `
        <div class="ku-callout success">
          <span class="ku-callout__icon">${icon("i-check", "l")}</span>
          <div><div class="ku-callout__title">Все ситуации разобраны</div><p>Воппер: есть текущая упаковка — бери её и отмечай «Вкус сезона», закончилась — переходи на новую и отмечай «Белые грибы». Воппер Ролл: приехала новая упаковка — сразу работай с ней.</p></div>
        </div>
        <div class="ku-space s"></div>
        <button class="ku-btn soft" data-pq-restart>${icon("i-refresh")} Пройти ещё раз</button>`;
      const n = $("#gb-pack-next"); if (n) n.disabled = false;
    };
    root.addEventListener("click", (e) => { if (e.target.closest("[data-pq-restart]")) { rebuild(); } });
    const template = root.querySelector("[data-pq-body]").innerHTML;
    const rebuild = () => { qi = 0; root.querySelector("[data-pq-body]").innerHTML = template; draw(); };
    draw();
    document.addEventListener("ku:ready", () => { if (KUv.isDone("pack-quiz")) { const n = $("#gb-pack-next"); if (n) n.disabled = false; } });
  }

  /* ══ 5. ТРЕНАЖЁР: РОЛЬ, ЗАПУСК, ДОПУСК ══════════════════════════════ */
  const ROLES = {
    cook: { name: "Повар", need: ["cook"] },
    cashier: { name: "Кассир", need: ["cashier"] },
    universal: { name: "Универсал", need: ["cook", "cashier"] },
  };
  const TRACK = {
    cook: { title: "Тренажёр «Повар»",
            sub: () => position() === "aup" ? "Собери и упакуй Ангус Белые грибы два раза" : "Собери и упакуй 8 блюд коллекции Белые Грибы",
            pass: () => `${window.GBCook.pass()} из ${window.GBCook.list().length}`, icon: "i-utensils",
            engine: () => window.GBCook, varName: "cook-result", doneId: "trainer-cook" },
    cashier: { title: "Тренажёр «Кассир»", sub: () => "Проверь маркировку и отдай 10 заказов", pass: () => `${window.GBCashier.PASS} из 30`, icon: "i-bag", engine: () => window.GBCashier, varName: "cashier-result", doneId: "trainer-cashier" },
  };
  const bestKey = (t) => t + "-best";

  function paintRoles() {
    const root = $("#gb-trainer"); if (!root) return;
    const aup = position() === "aup";
    const box = $("#gb-roles");
    if (box) box.hidden = true;                      // роль выбрана в начале курса — здесь её не меняют
    const note = $("#gb-role-note");
    if (note) note.textContent = aup
      ? "У АУП один тренажёр: собери Ангус Белые грибы два раза без ошибок."
      : "";
    if (note) note.hidden = !aup;
  }
  function initTrainer() {
    const root = $("#gb-trainer"); if (!root) return;
    const roleBtns = $$("[data-role]", root);
    roleBtns.forEach(b => b.addEventListener("click", () => {
      if (position() === "aup") return;
      setVar("role", ROLES[b.dataset.role].name);
      KUv.set("role-key", b.dataset.role);
      paint();
      const tracks = $("#gb-tracks");
      if (tracks) tracks.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }));
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-start]"); if (!b) return;
      launch(b.dataset.start);
    });
    document.addEventListener("ku:ready", paint);
    paintRoles();
    paint();
  }
  function setVar(name, value) {
    const el = document.querySelector(`[data-ku-var="${name}"]`);
    if (el) el.value = value;
    KUv.set(name, value);
  }
  function launch(t) {
    const tr = TRACK[t];
    tr.engine().start({
      onDone: (res) => {
        const prev = +(KUv.get(bestKey(t)) || -1);
        if (res.score > prev) {
          KUv.set(bestKey(t), String(res.score));
          setVar(tr.varName, `${res.score} из ${res.max}${res.passed ? " — пройден" : " — не пройден"}`);
        }
        if (res.passed) KUv.done(tr.doneId);
        if (window.KU) window.KU.lms.interaction(tr.doneId, `${res.score}/${res.max}`, res.passed ? "correct" : "wrong");
        paint();
      },
      onContinue: (res) => {
        paint();
        const roleKey = KUv.get("role-key");
        const need = roleKey ? ROLES[roleKey].need : [];
        const next = need.find(x => !KUv.isDone(TRACK[x].doneId));
        if (res.passed && next && next !== t) launch(next);
        else $("#gb-tracks") && $("#gb-tracks").scrollIntoView({ block: "start" });
      },
      onExit: paint,
    });
  }
  function allPassed() {
    const roleKey = roleKeyOf();
    if (!roleKey) return false;
    return ROLES[roleKey].need.every(t => KUv.isDone(TRACK[t].doneId));
  }
  function paint() {
    const roleKey = roleKeyOf();
    $$("#gb-trainer [data-role], #gb-who-role [data-role]").forEach(b => { const on = b.dataset.role === roleKey; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on); });
    const box = $("#gb-tracks");
    if (box) {
      if (!roleKey) { box.hidden = true; }
      else {
        box.hidden = false;
        const need = ROLES[roleKey].need;
        $("#gb-tracks-title").textContent = need.length > 1 ? "Твои тренажёры: сначала повар, потом кассир" : "Твой тренажёр";
        $("#gb-tracks-list").innerHTML = need.map(t => {
          const tr = TRACK[t];
          const best = KUv.get(bestKey(t));
          const passed = KUv.isDone(tr.doneId);
          const max = t === "cook" ? window.GBCook.list().length : 30;
          return `<div class="ku-card gb-track-card ${passed ? "is-passed" : ""}">
            <div class="gb-track-card__head"><span class="ku-icon-badge ${passed ? "solid" : ""}">${icon(tr.icon)}</span><h3>${tr.title}</h3></div>
            <p class="ku-small ku-soft" style="margin:0">${tr.sub()}. Чтобы пройти, набери ${tr.pass()}.</p>
            ${best !== undefined && best !== "" ? `<div class="ku-row s"><span class="gb-score">${best}</span><span class="ku-caption">из ${max} — лучший результат</span></div>` : ""}
            ${passed ? `<span class="ku-badge success">${icon("i-check", "s")} Пройден</span>` : best ? `<span class="ku-badge neutral">Пока не пройден</span>` : ""}
            <button class="ku-btn ${passed ? "soft" : "primary"}" data-start="${t}">${icon(passed ? "i-refresh" : "i-play")} ${passed ? "Пройти ещё раз" : best ? "Попробовать снова" : "Начать"}</button>
          </div>`;
        }).join("");
      }
    }
    const ok = allPassed();
    const fin = $("#gb-trainer-next"); if (fin) fin.disabled = !ok;
    const note = $("#gb-trainer-note"); if (note) note.hidden = ok || !roleKey;
    // Финальный экран
    const complete = $("[data-ku-complete]");
    if (complete && !complete.classList.contains("is-completed")) complete.disabled = !ok;
    const lock = $("#gb-final-lock"); if (lock) lock.hidden = ok;
    markCards();
  }

  /* ══ 6. ОТМЕТКИ НА ОГЛАВЛЕНИИ ═══════════════════════════════════════ */
  function markCards() {
    const done = { ingredients: KUv.isDone("ch-ingredients"), cooking: KUv.isDone("ch-cooking"), trainer: allPassed() };
    $$("[data-chapter]").forEach(c => c.classList.toggle("is-done", !!done[c.dataset.chapter]));
    const fin = $("#gb-home-finish"); if (fin) fin.hidden = !allPassed();
  }

  /* ── Переходы между страницами: сообщаем модулям ─────────────────── */
  function hookNavigate() {
    const orig = window.kuNavigate;
    window.kuNavigate = function (id) {
      orig(id);
      window.scrollTo({ top: 0, behavior: "auto" });
      setTimeout(() => document.dispatchEvent(new CustomEvent("gb:page", { detail: id })), 60);
      markCards();
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    hookNavigate();
    initWho();
    initVideo();
    initDecor();
    initDishes();
    initIngredients();
    initPackQuiz();
    initTrainer();
    document.addEventListener("ku:done", markCards);
    document.addEventListener("ku:ready", markCards);
  });
})();
