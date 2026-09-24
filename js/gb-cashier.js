/* ════════════════════════════════════════════════════════════════════════
   ГРИБНАЯ ЛИНЕЙКА · ТРЕНАЖЁР «КАССИР»
   ────────────────────────────────────────────────────────────────────────
   Сценарий: «Сценарий тренажера в курсе Белые грибы.xlsx», лист «Кассир».
   1) Обучающий заказ без времени — с подсказками.
   2) 10 заказов на время (15 минут), без подсказок.
   Баллы за заказ (из сценария):
     не проверял маркировку, выбрал верно   → 1
     не проверял маркировку, выбрал неверно → 0
     проверил маркировку, выбрал неверно    → 1
     проверил маркировку, выбрал верно      → 3
   «Проверил» = в этом заказе хотя бы раз повернул упаковку И хотя бы раз
   приблизил её. Максимум 30, порог прохождения — 24.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const S = () => window.GBShell;
  const ART = () => window.GBArt;
  const PASS = 24;
  const TIME_SEC = 15 * 60;

  /* ── Варианты упакованных блюд ────────────────────────────────────── */
  const flap = (label) => ({ kind: "flap", label });
  const HOT = { kind: "sticker", label: "Остро" };
  const V = {
    A:      { pack: "angus", name: "Ангус Белые грибы", marks: [flap("Сезонный")] },
    A_hot:  { pack: "angus", name: "Острый Ангус Белые грибы", marks: [flap("Сезонный"), HOT] },
    A_dbl:  { pack: "angus", name: "Ангус Белые грибы Двойной", marks: [flap("Сезонный"), { kind: "icon", label: "Двойная котлета" }] },
    A_hot_dbl: { pack: "angus", name: "Острый Ангус Белые грибы Двойной", marks: [flap("Сезонный"), HOT, { kind: "icon", label: "Двойная котлета" }] },
    P:      { pack: "pita", name: "Ангус Пита Белые грибы", marks: [flap("Сезонный"), { kind: "side", key: "plain", label: "верх без надписи" }] },
    P_hot:  { pack: "pita", name: "Острая Ангус Пита Белые грибы", marks: [flap("Сезонный"), { kind: "side", key: "spicy", label: "верх «Остро»" }] },
    BK:     { pack: "bigking", name: "Биг Кинг Белые грибы", marks: [flap("Звезда")] },
    BK_hot: { pack: "bigking", name: "Острый Биг Кинг Белые грибы", marks: [flap("Звезда"), HOT] },
    BK_hot_classic: { pack: "bigking", name: "Острый Биг Кинг", marks: [flap("Классика"), HOT] },
    BK_crispy: { pack: "bigking", name: "Биг Кинг Белые грибы + хрустящий лук", marks: [flap("Звезда"), { kind: "mod", key: "plus", label: "Хрустящий лук" }] },
    BK_cheese: { pack: "bigking", name: "Биг Кинг Белые грибы + сыр", marks: [flap("Звезда"), { kind: "mod", key: "plus", label: "Сыр" }] },
    BK_notomato: { pack: "bigking", name: "Биг Кинг Белые грибы без томатов", marks: [flap("Звезда"), { kind: "mod", key: "minus", label: "Томаты" }] },
    W:      { pack: "whopper", name: "Воппер Белые грибы", marks: [flap("Белые грибы")] },
    W_cheese: { pack: "whopper", name: "Воппер с сыром Белые грибы", marks: [flap("Белые грибы"), { kind: "icon", label: "Сыр" }] },
    W_dbl_cheese: { pack: "whopper", name: "Двойной Воппер с сыром Белые грибы", marks: [flap("Белые грибы"), { kind: "icon", label: "Сыр" }, { kind: "icon", label: "Двойная котлета" }] },
    W_triple: { pack: "whopper", name: "Воппер Белые грибы Тройной", marks: [flap("Белые грибы"), { kind: "icon", label: "Тройная котлета" }] },
    W_dbl:  { pack: "whopper", name: "Воппер Белые грибы Двойной", marks: [flap("Белые грибы"), { kind: "icon", label: "Двойная котлета" }] },
  };
  const PACK_NAME = { angus: "Кламшелл Ангус", pita: "Упаковка для питы", bigking: "Упаковка Биг Кинг", whopper: "«Твой особенный Воппер»" };

  const TRAINING = { order: "Ангус Белые грибы", correct: "A", wrong: ["A_hot", "A_dbl", "A_hot_dbl"] };
  const ORDERS = [
    { order: "Острый Ангус Белые грибы", correct: "A_hot", wrong: ["A", "A_dbl", "A_hot_dbl"] },
    { order: "Ангус Белые грибы Двойной", correct: "A_dbl", wrong: ["A", "A_hot_dbl", "A_hot"] },
    { order: "Ангус Пита Белые грибы", correct: "P", wrong: ["P_hot", "A", "A_hot"] },
    { order: "Острая Ангус Пита Белые грибы", correct: "P_hot", wrong: ["P", "A", "A_hot"] },
    { order: "Острый Биг Кинг Белые грибы", correct: "BK_hot", wrong: ["BK", "BK_hot_classic", "BK_crispy"] },
    { order: "Биг Кинг Белые грибы + сыр", correct: "BK_cheese", wrong: ["BK", "BK_hot", "BK_notomato"] },
    { order: "Воппер с сыром Белые грибы", correct: "W_cheese", wrong: ["W_dbl_cheese", "W_triple", "W"] },
    { order: "Двойной Воппер с сыром Белые грибы", correct: "W_dbl_cheese", wrong: ["W_cheese", "W_triple", "W"] },
    { order: "Воппер Белые грибы", correct: "W", wrong: ["W_cheese", "W_triple", "W_dbl"] },
    { order: "Воппер Белые грибы Двойной", correct: "W_dbl", wrong: ["W_cheese", "W_triple", "W"] },
  ];

  const describe = (v) => v.marks.map(m => m.kind === "flap" ? `клапан «${m.label}»`
    : m.kind === "sticker" ? "наклейка «Остро»"
    : m.kind === "icon" ? `отметка «${m.label}»`
    : m.kind === "mod" ? `${m.key === "minus" ? "без" : "доп."} «${m.label}»`
    : m.label).join(", ");
  const icon = (id, cls) => `<svg class="ku-ico ${cls || ""}"><use href="#${id}"/></svg>`;
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  let run = null;

  function start(opts) {
    S().open({ title: "Тренажёр «Кассир»", onExit: opts && opts.onExit });
    run = { cb: opts || {}, results: [], oi: 0, clock: null, score: 0 };
    renderSplash();
  }

  function renderSplash() {
    const sh = S();
    sh.hud().innerHTML = "";
    sh.main().innerHTML = `
      <div class="gb-splash gb-bg">
        <div class="gb-splash__card">
          <span class="ku-eyebrow">${icon("i-bag", "s")} Кассир</span>
          <h2 class="ku-h2">Давай потренируемся!</h2>
          <p class="ku-lead ku-mx-auto">На экран будут поступать заказы гостей. Проверь маркировку на упаковке и положи в заказ нужное блюдо.</p>
          <div class="gb-slot" data-asset="cashier-start"></div>
          <div class="gb-splash__rules ku-card">
            <ul>
              <li>${icon("i-rotate")}<span><b>Поверни</b> упаковку, чтобы увидеть сторону с маркировкой.</span></li>
              <li>${icon("i-zoom")}<span><b>Приблизь</b> её, чтобы рассмотреть клапаны и наклейки.</span></li>
              <li>${icon("i-bag")}<span>Выбери блюдо и нажми <b>«Положить в заказ»</b>.</span></li>
            </ul>
          </div>
          <p class="ku-small ku-soft" style="margin:0">Сначала — один обучающий заказ без времени и с подсказками.</p>
          <button class="ku-btn primary l" id="gb-cs-go">${icon("i-play")} Начать тренировку</button>
        </div>
      </div>`;
    window.GBAssets.hydrateAll(sh.main());
    document.getElementById("gb-cs-go").addEventListener("click", () => renderOrder(TRAINING, true));
  }

  /* ── HUD ──────────────────────────────────────────────────────────── */
  function renderHud(training) {
    const o = training ? TRAINING : ORDERS[run.oi];
    S().hud().innerHTML = `
      <span class="gb-vdu"><span class="gb-vdu__led"></span><span><span class="gb-vdu__label">${training ? "Обучение" : `Заказ ${run.oi + 1} из ${ORDERS.length}`}</span><span class="gb-vdu__name">${o.order}</span></span></span>
      ${training ? `<span class="gb-meter">${icon("i-clock", "s")} без времени</span>` : `
      <span class="gb-meter" id="gb-cs-time">${icon("i-clock", "s")} <span>15:00</span></span>
      <span class="gb-meter" id="gb-cs-score">${icon("i-star", "s")} <span>${run.score}</span><small>из ${ORDERS.length * 3}</small></span>`}`;
    tick();
  }
  function tick() {
    if (!run || !run.clock) return;
    const left = TIME_SEC - run.clock.sec();
    const el = document.querySelector("#gb-cs-time span");
    if (el) {
      el.textContent = S().fmt(Math.max(0, left));
      el.parentElement.classList.toggle("is-warn", left < 120 && left > 0);
      el.parentElement.classList.toggle("is-over", left <= 0);
    }
    if (left <= 0 && !run.timeUp) {
      run.timeUp = true;
      run.clock.pause();
      S().feedback({ tone: "info", title: "Время вышло", text: "15 минут закончились. Посмотри результаты.", primary: "К результатам", pause: false }).then(finishRun);
    }
  }

  /* Как выглядит продавленный клапан и как — нетронутый: подсказка перед работой */
  function flapLegend() {
    const dot = (on) => `<svg viewBox="0 0 34 34" class="gb-cs__dot" aria-hidden="true">
        <circle cx="17" cy="17" r="14.5" fill="none" stroke="rgba(91,51,38,.45)" stroke-width="1.4" stroke-dasharray="3 2.4"/>
        <circle cx="17" cy="17" r="11" fill="#1f5fbf"/>
        ${on ? `<circle cx="17" cy="17" r="11" fill="rgba(0,0,0,.45)"/>
                <circle cx="17" cy="15" r="9" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="3.3"/>
                <path d="M12.4 17 l3.3 3.7 l6.6 -7.5" fill="none" stroke="#fff" stroke-width="2.6"
                      stroke-linecap="round" stroke-linejoin="round"/>` : ""}
      </svg>`;
    return `<div class="gb-cs__legend">
        <span>${dot(true)} продавлен — вкус отмечен</span>
        <span>${dot(false)} не тронут</span>
      </div>`;
  }

  /* ── Заказ ────────────────────────────────────────────────────────── */
  function renderOrder(o, training) {
    const sh = S();
    const items = shuffle([o.correct, ...o.wrong]).map((key) => ({ key, v: V[key], view: "marks" }));
    const st = { checked: false, hand: null, items, o, training, solved: false };
    renderHud(training);
    sh.main().innerHTML = `
      <div class="gb-app__inner">
        <div class="gb-task enter">
          <div>
            <div class="gb-task__num">${training ? "Обучение" : `Заказ ${run.oi + 1} из ${ORDERS.length}`}</div>
            <div class="gb-task__text">${o.order}</div>
            <div class="gb-task__hint">${training
              ? "Нажми на упаковку — увидишь сторону с клапанами. Сверь её с заказом и отдай гостю."
              : "Открой упаковку, сверь маркировку с заказом и отдай гостю нужное блюдо."}</div>
          </div>
        </div>

        <div class="gb-cs">
          <aside class="ku-card gb-cs__order">
            <span class="ku-eyebrow">${icon("i-bag", "s")} Заказ гостя</span>
            <b class="gb-cs__dish">${o.order}</b>
            <p class="ku-small ku-soft" style="margin:.2em 0 0">Что должно быть на упаковке — решаешь сам: сверяй название с клапанами и наклейками.</p>
            ${flapLegend()}
          </aside>

          <div class="gb-cs__bin">
            <div class="gb-cs__bin-label"><span>Бина · готовые блюда</span><span class="ku-caption">Нажми на упаковку — покажет сторону с клапанами</span></div>
            <div class="gb-bin" id="gb-bin"></div>
          </div>
        </div>
      </div>

      <div class="gb-hands" id="gb-hands" hidden>
        <div class="gb-hands__card">
          <div class="ku-row between">
            <b id="gb-hand-title"></b>
            <button class="gb-tool" id="gb-hand-back" aria-label="Положить обратно на бину">${icon("i-x")}</button>
          </div>
          <div class="gb-hands__view" id="gb-hand-view"></div>
          <p class="ku-caption ku-center" id="gb-hand-note"></p>
          <div class="ku-row center">
            <button class="ku-btn soft" id="gb-hand-flip">${icon("i-rotate")} Показать лицевую сторону</button>
            <button class="ku-btn soft" id="gb-hand-zoom" aria-pressed="false">${icon("i-zoom")} Приблизить</button>
            <button class="ku-btn primary" id="gb-give">${icon("i-check")} Отдать гостю</button>
          </div>
        </div>
      </div>`;
    drawBin(st);
    bind(st);
    sh.scrollTop();
  }

  /* Наклейка «Остро» клеится на крышку снаружи — её видно и на закрытой упаковке.
     Упаковки — рендеры 3D-моделей курса по макетам (blender/render_cashier.py):
     закрытая упаковка на бине и сторона с клапанами, где нужные клапаны продавлены
     так же, как их продавливают на станции. Наклейки «Остро» и модификаторы
     кладутся поверх. У острой питы «Остро» на верхе пакета — тоже наклейкой поверх. */
  const IMG = "assets/trainer/cashier/";
  const CLOSED = { angus: "angus-closed", bigking: "bigking-closed", whopper: "clamshell-closed", pita: "pita-closed" };
  const FOCUS = { angus: [0.5, 0.78], bigking: [0.42, 0.8], whopper: [0.5, 0.7], pita: [0.6, 0.55] };   // где клапаны на картинке
  function marksImg(v) {
    const has = (l) => v.marks.some((m) => m.label === l);
    if (v.pack === "angus") return "angus-sezonnyi";
    if (v.pack === "pita") return "pita-sezonnyi";
    if (v.pack === "bigking") return has("Классика") ? "bigking-klassika" : "bigking-zvezda";
    if (v.pack === "whopper") {
      const dbl = has("Двойная котлета"), tri = has("Тройная котлета"), ch = has("Сыр");
      return tri ? "whopper-bg-triple" : dbl && ch ? "whopper-bg-dbl-cheese" : dbl ? "whopper-bg-double" : ch ? "whopper-bg-cheese" : "whopper-bg";
    }
    return null;
  }
  function overlays(v) {
    return v.marks.map((m) => {
      if (m.kind === "sticker" || (m.kind === "side" && m.key === "spicy")) return `<span class="gb-sticker gb-sticker--hot">ОСТРО</span>`;
      if (m.kind === "mod") return `<span class="gb-sticker gb-sticker--mod">${m.key === "minus" ? "БЕЗ" : "+"} ${m.label.toUpperCase()}</span>`;
      if (m.kind === "icon" && v.pack === "angus") return `<span class="gb-sticker gb-sticker--mark">ДВОЙНАЯ КОТЛЕТА</span>`;
      return "";
    }).join("");
  }
  const pkgSvg = (it, zoom) => {
    const v = it.v;
    const file = it.view === "front" ? CLOSED[v.pack] : marksImg(v);
    if (!file) return ART().pack(v.pack, { view: it.view, marks: v.marks, zoom });
    const alt = `${PACK_NAME[v.pack]}${it.view === "front" ? ", закрыта" : ": " + describe(v)}`;
    return `<span class="gb-pkimg"><img src="${IMG + file}.webp" alt="${alt}" draggable="false">${it.view === "front" ? overlays({ ...v, marks: v.marks.filter((m) => m.kind === "sticker" || m.kind === "side") }) : overlays(v)}</span>`;
  };

  function drawBin(st) {
    const bin = document.getElementById("gb-bin");
    bin.innerHTML = st.items.map((it, i) => `
      <div class="gb-pkg ${st.showCorrect && it.key === st.o.correct ? "is-correct" : ""} ${it.seen ? "is-seen" : ""}">
        <span class="gb-pkg__num">${i + 1}</span>
        <button class="gb-pkg__view" data-open="${i}" aria-label="Открыть упаковку ${i + 1}">${pkgSvg({ v: it.v, view: "front" }, false)}</button>
        <span class="gb-pkg__cap">${PACK_NAME[it.v.pack]}${it.seen ? " · открывал" : ""}</span>
        <button class="ku-btn soft s" data-quick="${i}">${icon("i-bag", "s")} Отдать не глядя</button>
      </div>`).join("");
  }

  function bind(st) {
    const sh = S();
    const bin = document.getElementById("gb-bin");
    const hands = document.getElementById("gb-hands");
    const view = document.getElementById("gb-hand-view");

    const drawHand = (spin) => {
      const it = st.items[st.hand];
      document.getElementById("gb-hand-title").textContent = `Упаковка ${st.hand + 1} · ${PACK_NAME[it.v.pack]}`;
      view.innerHTML = `<div class="gb-hands__pkg ${spin ? "is-spin" : ""}">${pkgSvg(it, true)}</div>`;
      document.getElementById("gb-hand-note").textContent = it.view === "front"
        ? "Лицевая сторона: маркировки здесь нет."
        : "Сторона с клапанами: сверь маркировку с заказом.";
      const flipBtn = document.getElementById("gb-hand-flip");
      flipBtn.innerHTML = it.view === "front"
        ? `${icon("i-rotate")} Сторона с клапанами`
        : `${icon("i-rotate")} Лицевая сторона`;
    };
    const take = (i) => {
      st.hand = i; st.checked = true; st.items[i].seen = true;
      st.items[i].view = "marks";                       // сразу показываем сторону с клапанами
      hands.hidden = false; drawHand(false);
      document.getElementById("gb-give").focus();
    };
    const back = () => { hands.hidden = true; st.hand = null; view.classList.remove("is-zoom"); drawBin(st); };

    bin.addEventListener("click", (e) => {
      const open = e.target.closest("[data-open]");
      if (open) return take(+open.dataset.open);
      const quick = e.target.closest("[data-quick]");
      if (quick) { st.hand = +quick.dataset.quick; document.getElementById("gb-give").click(); }
    });
    document.getElementById("gb-hand-back").addEventListener("click", back);
    hands.addEventListener("click", (e) => { if (e.target === hands) back(); });
    document.getElementById("gb-hand-zoom").addEventListener("click", (e) => {
      const on = !view.classList.contains("is-zoom");
      view.classList.toggle("is-zoom", on); e.currentTarget.setAttribute("aria-pressed", on);
      e.currentTarget.innerHTML = `${icon("i-zoom")} ${on ? "Отдалить" : "Приблизить"}`;
      if (on) {                                          // приближаем туда, где маркировка
        const it = st.items[st.hand];
        const [fx, fy] = it.view === "front" ? [0.5, 0.5] : (FOCUS[it.v.pack] || [0.5, 0.5]);
        view.scrollLeft = fx * view.scrollWidth - view.clientWidth / 2;
        view.scrollTop = fy * view.scrollHeight - view.clientHeight / 2;
      }
    });
    document.getElementById("gb-hand-flip").addEventListener("click", () => {
      const it = st.items[st.hand];
      it.view = it.view === "front" ? "marks" : "front";
      drawHand(true);
    });

    document.getElementById("gb-give").addEventListener("click", async () => {
      const it = st.items[st.hand];
      const correct = it.key === st.o.correct;
      const checked = st.checked;

      if (st.training) {
        if (!checked) {
          await sh.feedback({ title: "Сначала открой упаковку", text: "В обучении сверяем маркировку: нажми на упаковку — она покажет сторону с клапанами.", primary: "Открыть упаковку" });
          return;
        }
        if (!correct) {
          st.showCorrect = true; back();
          await sh.feedback({ title: "Не то блюдо", text: `На упаковке блюда «${st.o.order}» продавлен один клапан «Сезонный» — и больше никаких отметок. Нужная упаковка подсвечена: возьми её и отдай гостю.`, primary: "Понятно" });
          return;
        }
        sh.burst();
        await sh.feedback({
          tone: "good", title: "Верно!",
          text: "Теперь, когда ты понял механику, начинается тренировка на время.\n\nОтдай гостям 10 заказов. Перед выдачей открывай упаковку и сверяй клапаны с заказом. Подсказок больше не будет.\n\nНа всё — 15 минут. Удачи!",
          primary: "Начать на время", pause: false,
        });
        run.clock = sh.Clock().start();
        run.ticker = setInterval(tick, 250);
        renderOrder(ORDERS[0], false);
        return;
      }

      const pts = checked ? (correct ? 3 : 1) : (correct ? 1 : 0);
      run.score += pts;
      run.results.push({ order: st.o.order, chosen: it.v, correctV: V[st.o.correct], correct, checked, pts });
      if (run.oi < ORDERS.length - 1) { sh.toast(`${icon("i-bag")} Заказ отдан`); run.oi++; renderOrder(ORDERS[run.oi], false); }
      else finishRun();
    });
  }

  function finishRun() {
    const sh = S();
    clearInterval(run.ticker);
    if (run.clock) run.clock.pause();
    for (let i = run.results.length; i < ORDERS.length; i++) {
      run.results.push({ order: ORDERS[i].order, skipped: true, pts: 0, correctV: V[ORDERS[i].correct] });
    }
    const max = ORDERS.length * 3;
    const res = { score: run.score, max, passed: run.score >= PASS, totalSec: run.clock ? run.clock.sec() : 0, results: run.results };
    if (run.cb.onDone) run.cb.onDone(res);
    renderResults(res);
  }

  function renderResults(res) {
    const sh = S();
    sh.hud().innerHTML = `<span class="gb-meter">${icon("i-star", "s")} ${res.score}<small>из ${res.max}</small></span>`;
    const rows = res.results.map(r => {
      let what;
      if (r.skipped) what = "Не успел.";
      else if (r.correct && r.checked) what = "Всё верно.";
      else if (r.correct) what = "Блюдо верное, но маркировку ты не проверил. В ресторане так легко ошибиться.";
      else what = `Нужно было: ${describe(r.correctV)}. Выбрано: ${r.chosen.name} (${describe(r.chosen)}).${r.checked ? "" : " Маркировку ты не проверил."}`;
      return `<tr>
        <td data-th="Заказ"><b>${r.order}</b></td>
        <td data-th="Результат">${r.skipped ? `<span class="gb-verdict warn">Не успел</span>` : r.correct ? `<span class="gb-verdict ok">${icon("i-check", "s")} Верно</span>` : `<span class="gb-verdict bad">${icon("i-x", "s")} Неверно</span>`}</td>
        <td data-th="Маркировка">${r.skipped ? "—" : r.checked ? "проверил" : `<span class="gb-verdict warn">не проверил</span>`}</td>
        <td data-th="Разбор">${what}</td>
        <td data-th="Баллы"><b>${r.pts}</b></td>
      </tr>`;
    }).join("");
    sh.main().innerHTML = `
      <div class="gb-app__inner">
        <div class="gb-results">
          <div class="gb-results__hero">
            <div class="gb-ring ${res.passed ? "is-pass" : ""}" style="--v:${Math.round(res.score / res.max * 100)}"><div><b>${res.score}</b><small>из ${res.max}</small></div></div>
            <div>
              <span class="ku-eyebrow">Результаты тренировки</span>
              <h2 class="ku-h2" style="margin-top:.4em">${res.passed ? "Тренажёр пройден!" : "Пока не хватает баллов"}</h2>
              <p class="ku-soft" style="margin:.4em 0 0;line-height:1.55">${res.passed
                ? "Можно двигаться дальше по курсу. Обрати внимание на заказы с ошибками."
                : `Нужно ${PASS} баллов из ${res.max}. Посмотри, где маркировка подвела, и пройди тренажёр ещё раз.`}</p>
              <div class="gb-stats">
                <span class="gb-meter">${icon("i-clock", "s")} Общее время ${sh.fmt(res.totalSec)}</span>
                <span class="gb-meter">Верно: ${res.results.filter(r => r.correct).length} из ${ORDERS.length}</span>
              </div>
            </div>
          </div>
          <div class="ku-callout">
            <span class="ku-callout__icon">${icon("i-bulb", "l")}</span>
            <div><div class="ku-callout__title">Как считаются баллы</div><p>Проверил маркировку и выбрал верно — 3 балла. Проверил, но ошибся — 1. Не проверил, но угадал — 1. Не проверил и ошибся — 0.</p></div>
          </div>
          <div class="ku-scroll-x"><table class="ku-table">
            <thead><tr><th>Заказ</th><th>Результат</th><th>Маркировка</th><th>Разбор</th><th>Баллы</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
          <div class="ku-row center">
            <button class="ku-btn soft" id="gb-retry">${icon("i-refresh")} Пройти ещё раз</button>
            <button class="ku-btn primary" id="gb-back">${res.passed ? "Продолжить" : "Вернуться в курс"} ${icon("i-right", "arrow")}</button>
          </div>
        </div>
      </div>`;
    sh.scrollTop();
    const cb = run.cb;
    document.getElementById("gb-retry").addEventListener("click", () => { sh.close(); start(cb); });
    document.getElementById("gb-back").addEventListener("click", () => { sh.close(); if (cb.onContinue) cb.onContinue(res); });
  }

  window.GBCashier = { start, PASS, ORDERS, V };
})();
