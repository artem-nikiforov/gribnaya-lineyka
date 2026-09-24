/* ════════════════════════════════════════════════════════════════════════
   ГРИБНАЯ ЛИНЕЙКА · ТРЕНАЖЁР «ПОВАР»
   ────────────────────────────────────────────────────────────────────────
   Сценарий: «Сценарий тренажера в курсе Белые грибы.xlsx», лист «Повар».
   8 блюд. На первое блюдо 2:30, на остальные по 2:00, общее время 30:00.
   Балл за блюдо — если оно собрано без ошибок и в срок (решение методиста).
   Порог прохождения — 6 баллов из 8.

   Как устроено: DISHES — данные, STEP_RENDERERS — по одной функции на тип
   шага. Шаг вызывает ctx.ok() (дальше) или ctx.fail(текст) (ошибка →
   окно обратной связи, таймеры на паузе, ошибка идёт в итоги).
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const S = () => window.GBShell;
  const ART = () => window.GBArt;
  const PASS = 6;
  // АУП проходит короткую версию: один рецепт (Ангус Белые грибы) два раза,
  // зачёт — оба блюда без ошибок и в срок. Список блюд и порог берём отсюда.
  const isAup = () => !!(window.KU && window.KU.vars.get("position-key") === "aup");
  const list = () => isAup() ? [DISHES[0], DISHES[0]] : DISHES;
  const pass = () => isAup() ? 2 : PASS;
  const TOTAL_SEC = 30 * 60;

  /* ── Ингредиенты на борту (порядок = порядок плиток) ─────────────── */
  const ING = {
    sauceM:  { label: "Соус Белые грибы", asset: "ing-sauceM" },
    mayo:    { label: "Майонез", asset: "ing-mayo" },
    hot:     { label: "Острый томатный соус", asset: "ing-hot" },
    iceberg: { label: "Салат Айсберг", asset: "ing-iceberg" },
    tomato:  { label: "Томаты", asset: "ing-tomato" },
    pattyA:  { label: "Котлета Ангус", asset: "ing-pattyA", patty: 80 },
    pattyH:  { label: "Котлета Гамбургер", asset: "ing-pattyH", patty: 64 },
    pattyW:  { label: "Котлета Воппер", asset: "ing-pattyW", patty: 86 },
    cheddar: { label: "Сыр Чеддер", asset: "ing-cheddar" },
    pickle:  { label: "Маринованные огурцы", asset: "ing-pickle" },
    onion:   { label: "Свежий лук", asset: "ing-onion" },
    crispy:  { label: "Хрустящий лук", asset: "ing-crispy" },
    mush:    { label: "Грибы жареные", asset: "ing-mush" },
  };

  /* ── Тексты шагов (повторяются в блюдах) ──────────────────────────── */
  const T = {
    paper: {
      type: "paper", title: "Расположи оберточную бумагу правильной стороной",
      hint: "Нажимай на лист — он поворачивается на четверть оборота. Оранжевый логотип должен смотреть на тебя.",
      err: "Бумага лежит неверно. Поверни её так, чтобы оранжевый логотип Бургер Кинг был ближе к тебе.",
    },
    buns: {
      type: "buns", title: "Размести поджаренные булочки на бумаге",
      hint: "Булочка разрезана и обжарена, обе части лежат срезом вверх. Нажми «Положить на бумагу».",
      err: "Размести обе части булочки срезами вверх.",
    },
    joinBurger: {
      type: "join", title: "Ингредиенты добавлены! Объедини две части сэндвича",
      hint: "Нажми на ту часть, которую нужно перенести.",
      err: "Нажми на верхнюю часть сэндвича, чтобы закончить сборку.",
    },
    wrap: {
      type: "wrap", title: "Закрой сэндвич оберточной бумагой",
      hint: "Тяни край бумаги с оранжевым логотипом вверх — он должен лечь на середину сэндвича.",
      err: "Логотип Бургер Кинг должен оказаться строго по центру булочки. Попробуй ещё раз.",
    },
    scaleNoWeigh: "Пока привыкаешь к новой порции, проверяй вес грибов на весах. Нажми «Проверить на весах».",
  };
  const topHint = "Чтобы добавить ингредиент, нажми на него — один или несколько раз.";
  // Какая булочка у блюда: подпись у половинок, чтобы не взять не ту
  const BUN = { angus: "сырной булочки", bigking: "картофельной булочки", whopper: "булочки" };
  const halfLabel = (size, part) => `${part === "top" ? "Верхняя" : "Нижняя"} часть ${BUN[size] || "булочки"}`;
  const mushReq = (where) => ({
    ing: "mush", n: 2, scale: true,
    err: `${where} нужно 2 ложки жареных грибов — это 40 граммов. Проверь вес на весах.`,
  });
  const slide = (line) => ({
    type: "slide", line,
    title: "Размести собранный сэндвич на оберточной бумаге",
    hint: `Тяни сэндвич вверх-вниз: нижний край булочки — ровно на линию «${line === "whopper" ? "Воппер" : "Ангус / Биг Кинг"}».`,
    err: `Нижний край булочки должен лечь на линию «${line === "whopper" ? "Воппер" : "Ангус / Биг Кинг"}». Перемести сэндвич.`,
  });
  const box = (correct, err) => ({
    type: "box", correct, err,
    title: correct === "whopper" ? "Положи сэндвич в упаковку" : "Положи сэндвич в кламшелл",
    hint: "Нажми на нужную упаковку.",
  });
  const marks = (pack, required, err, title) => ({
    type: "marks", pack, required, err,
    title: title || "Промаркируй кламшелл",
    hint: required.length > 1 ? "Отметь все особенности блюда — в любом порядке." : "Нажми на нужный клапан.",
  });

  // Порядок как на станции: сначала соус на верхнюю часть, потом вся нижняя,
  // потом возврат к верхней — салат и томаты, и только затем сборка.
  const topSauce = (sauce, n, part) => {
    const sauceName = sauce === "mayo" ? "майонез" : "соус Белые грибы";
    const where = part || "булочки";
    return build("top", [{ ing: sauce, n, err: `На верхнюю часть ${where} — ${sauceName}: ${n} ${plural(n, "нажатие", "нажатия", "нажатий")} по центру.` }],
      `Начни с верхней части ${where}: добавь ${sauceName}`);
  };
  const topGreens = (tomatoes, part) => {
    const where = part || "булочки";
    const err = `Вернись к верхней части ${where}: салат Айсберг, а сверху — ${tomatoes} ${plural(tomatoes, "ломтик", "ломтика", "ломтиков")} томата.`;
    return build("top", [{ ing: "iceberg", n: 1, err }, { ing: "tomato", n: tomatoes, err }],
      `Вернись к верхней части ${where}: салат и томаты`);
  };
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  const build = (part, reqs, title) => ({
    type: "build", part, reqs,
    title: title || (part === "top" ? "Добавь на верхнюю часть булочки необходимые ингредиенты" : "Добавь на нижнюю часть булочки необходимые ингредиенты"),
    hint: topHint,
  });
  const patty = (ing, err) => ({ ing, n: 1,
    err: err || `Здесь нужна ${ING[ing].label.replace("Котлета", "котлета")} — следами от гриля вверх.` });

  /* ── Блюда ────────────────────────────────────────────────────────── */
  const DISHES = [
    {
      id: "angus", name: "Ангус Белые грибы", limit: 150, size: "angus",
      steps: [
        T.paper, T.buns,
        topSauce("sauceM", 3),
        build("bottom", [
          { ing: "mayo", n: 2, err: "Сразу на нижнюю часть булочки — майонез: 2 нажатия." },
          patty("pattyA"),
          { ing: "cheddar", n: 1, err: "Сразу на котлету Ангус — 1 ломтик сыра Чеддер." },
          { ing: "sauceM", n: 1, err: "Сразу на сыр Чеддер — соус Белые грибы: 1 нажатие." },
          mushReq("На соус"),
        ]),
        topGreens(2),
        T.joinBurger, slide("angus"), T.wrap,
        box("angus", "Для этого блюда нужен кламшелл Ангус. Нажми на него."),
        marks("angus", ["Сезонный"], "Нажми на клапан «Сезонный», чтобы промаркировать блюдо."),
      ],
    },
    {
      id: "angus-hot-double", name: "Острый Ангус Белые грибы Двойной", limit: 120, size: "angus",
      steps: [
        T.paper, T.buns,
        topSauce("sauceM", 3),
        build("bottom", [
          { ing: "mayo", n: 2, err: "Сразу на нижнюю часть булочки — майонез: 2 нажатия." },
          patty("pattyA"),
          { ing: "sauceM", n: 2, err: "На котлету Ангус — соус Белые грибы: 2 нажатия." },
          patty("pattyA"),
          { ing: "hot", n: 1, err: "Гость заказал острый сэндвич: добавь острый томатный соус тройным кольцом." },
          { ing: "cheddar", n: 1, err: "Сразу на острый соус — 1 ломтик сыра Чеддер." },
          { ing: "sauceM", n: 1, err: "Сразу на сыр Чеддер — соус Белые грибы: 1 нажатие." },
          mushReq("На соус"),
        ]),
        topGreens(2),
        T.joinBurger, slide("angus"), T.wrap,
        box("angus", "Для этого блюда нужен кламшелл Ангус. Нажми на него."),
        marks("angus", ["Сезонный", "Наклейка «Остро»", "Двойная котлета"],
          "Маркировка неполная или лишняя. Нужны: клапан «Сезонный», наклейка «Остро» и отметка «Двойная котлета»."),
      ],
    },
    {
      id: "pita", name: "Ангус Пита Белые грибы", limit: 120, size: "pita", pita: true,
      steps: [
        Object.assign(topSauce("sauceM", 3, "тортильи"), { title: "Перед тобой разогретая тортилья. Начни с верхней части: добавь соус Белые грибы" }),
        build("bottom", [
          { ing: "mayo", n: 2, err: "Сразу на нижнюю часть тортильи — майонез: 2 нажатия." },
          patty("pattyA"),
          { ing: "cheddar", n: 1, err: "Сразу на котлету Ангус — 1 ломтик сыра Чеддер." },
          mushReq("На сыр Чеддер"),
        ], "Добавь на нижнюю часть тортильи необходимые ингредиенты"),
        topGreens(2, "тортильи"),
        { type: "join", pita: true, title: "Ингредиенты добавлены! Собери питу", hint: "Нажми на питу.", err: "Нажми на питу, чтобы закончить приготовление." },
        { type: "pitaPack", title: "Положи питу в упаковку", hint: "Потяни питу в упаковку.", err: "Перемести готовое блюдо в упаковку." },
        { type: "pitaSide", correct: "plain", title: "Закрой упаковку правильной стороной", hint: "Надпись «Остро» нужна только для острой питы.", err: "Гость заказал не острое блюдо. Закрой упаковку стороной без надписи." },
        marks("pita", ["Сезонный"], "Нажми на клапан «Сезонный» на торце упаковки.", "Промаркируй упаковку"),
      ],
    },
    {
      id: "bigking", name: "Биг Кинг Белые грибы", limit: 120, size: "bigking",
      steps: [
        T.paper, T.buns,
        topSauce("sauceM", 2),
        build("bottom", [
          patty("pattyH"),
          { ing: "sauceM", n: 1, err: "На котлету Гамбургер — соус Белые грибы: 1 нажатие." },
          patty("pattyH", "Нужна вторая котлета Гамбургер — следами от гриля вверх."),
          { ing: "cheddar", n: 2, err: "На котлету Гамбургер — 2 ломтика сыра Чеддер." },
          { ing: "pickle", n: 1, err: "Сразу на сыр Чеддер — 1 ломтик маринованного огурца." },
          { ing: "crispy", n: 1, err: "После маринованного огурца — 1 ложка хрустящего лука." },
        ]),
        topGreens(1),
        T.joinBurger, slide("angus"), T.wrap,
        { type: "timemark", title: "Промаркируй упаковку Биг Кинг по времени", hint: "Нажми на временную шкалу.", err: "Добавь маркировку по времени хранения сэндвича: нажми на нужную отметку временной шкалы.", now: "14:05", correct: 2 },
        marks("bigking", ["Звезда"], "Нажми на клапан «Звезда».", "Промаркируй упаковку"),
      ],
    },
    {
      id: "whopper", name: "Воппер Белые грибы", limit: 120, size: "whopper",
      steps: [
        T.paper, T.buns,
        topSauce("mayo", 3),
        build("bottom", [
          patty("pattyW"),
          { ing: "pickle", n: 4, err: "На котлету Воппер — 4 ломтика маринованного огурца." },
          { ing: "sauceM", n: 2, err: "После маринованных огурцов — соус Белые грибы: 2 нажатия." },
          { ing: "onion", n: 1, err: "Добавь свежий лук." },
        ]),
        topGreens(2),
        T.joinBurger, slide("whopper"), T.wrap,
        box("whopper", "Используй упаковку «Твой особенный Воппер». Нажми на неё."),
        marks("whopper", ["Белые грибы"], "Нажми на клапан «Белые грибы», чтобы промаркировать блюдо."),
      ],
    },
    {
      id: "whopper-double-cheese", name: "Двойной Воппер с сыром Белые грибы", limit: 120, size: "whopper",
      steps: [
        T.paper, T.buns,
        topSauce("mayo", 3),
        build("bottom", [
          patty("pattyW"),
          { ing: "sauceM", n: 2, err: "На первую котлету Воппер — соус Белые грибы: 2 нажатия." },
          patty("pattyW", "Нужна вторая котлета Воппер — следами от гриля вверх."),
          { ing: "cheddar", n: 2, err: "На котлету Воппер — 2 ломтика сыра Чеддер." },
          { ing: "pickle", n: 4, err: "На сыр Чеддер — 4 ломтика маринованного огурца." },
          { ing: "sauceM", n: 2, err: "После маринованных огурцов — соус Белые грибы: 2 нажатия." },
          { ing: "onion", n: 1, err: "Добавь свежий лук." },
        ]),
        topGreens(2),
        T.joinBurger, slide("whopper"), T.wrap,
        box("whopper", "Используй упаковку «Твой особенный Воппер». Нажми на неё."),
        marks("whopper", ["Двойная котлета", "Сыр", "Белые грибы"], "Отметь все особенности сэндвича: клапаны «Двойная котлета», «Сыр» и «Белые грибы»."),
      ],
    },
    {
      id: "whopper-cheese", name: "Воппер с сыром Белые грибы", limit: 120, size: "whopper",
      steps: [
        T.paper, T.buns,
        topSauce("mayo", 3),
        build("bottom", [
          patty("pattyW"),
          { ing: "cheddar", n: 2, err: "На котлету Воппер — 2 ломтика сыра Чеддер." },
          { ing: "pickle", n: 4, err: "На сыр Чеддер — 4 ломтика маринованного огурца." },
          { ing: "sauceM", n: 2, err: "После маринованных огурцов — соус Белые грибы: 2 нажатия." },
          { ing: "onion", n: 1, err: "Добавь свежий лук." },
        ]),
        topGreens(2),
        T.joinBurger, slide("whopper"), T.wrap,
        box("whopper", "Используй упаковку «Твой особенный Воппер». Нажми на неё."),
        marks("whopper", ["Сыр", "Белые грибы"], "Отметь все особенности сэндвича: клапаны «Сыр» и «Белые грибы»."),
      ],
    },
    {
      id: "whopper-triple", name: "Тройной Воппер Белые грибы", limit: 120, size: "whopper",
      steps: [
        T.paper, T.buns,
        topSauce("mayo", 3),
        build("bottom", [
          patty("pattyW"),
          { ing: "sauceM", n: 2, err: "На первую котлету Воппер — соус Белые грибы: 2 нажатия." },
          patty("pattyW", "Нужна вторая котлета Воппер — следами от гриля вверх."),
          { ing: "sauceM", n: 2, err: "На вторую котлету Воппер — соус Белые грибы: 2 нажатия." },
          patty("pattyW", "Нужна третья котлета Воппер — следами от гриля вверх."),
          { ing: "pickle", n: 4, err: "На котлету — 4 ломтика маринованного огурца." },
          { ing: "sauceM", n: 2, err: "После маринованных огурцов — соус Белые грибы: 2 нажатия." },
          { ing: "onion", n: 1, err: "Добавь свежий лук." },
        ]),
        topGreens(2),
        T.joinBurger, slide("whopper"), T.wrap,
        box("whopper", "Используй упаковку «Твой особенный Воппер». Нажми на неё."),
        marks("whopper", ["Тройная котлета", "Белые грибы"], "Отметь все особенности сэндвича: клапаны «Тройная котлета» и «Белые грибы»."),
      ],
    },
  ];

  const MARK_OPTIONS = {
    angus: ["Сезонный", "Классика", "Наклейка «Остро»", "Двойная котлета"],
    pita: ["Сезонный", "Классика"],
    bigking: ["Звезда", "Классика", "Наклейка «Остро»"],
    whopper: ["Новинка", "Белые грибы", "Острый", "Пармезан", "4 сыра", "Гриль", "Двойная котлета", "Тройная котлета", "Сыр"],
  };
  function markObj(label) {
    if (label === "Наклейка «Остро»") return { kind: "sticker", label: "Остро" };
    if (/котлета$/.test(label) || label === "Сыр") return { kind: "icon", label };
    return { kind: "flap", label };
  }

  /* ════════════════════════════════════════════════════════════════════
     СОСТОЯНИЕ ПОПЫТКИ
     ════════════════════════════════════════════════════════════════════ */
  let run = null;   // { total, dishClock, di, si, results[], dishes[], hudTimer, onDone }

  function start(opts) {
    const sh = S();
    sh.open({ title: "Тренажёр «Повар»", onExit: opts && opts.onExit });
    run = { onDone: opts && opts.onDone, onExit: opts && opts.onExit, onContinue: opts && opts.onContinue,
            results: [], di: 0, total: null, dishClock: null, score: 0, dishes: list(), pass: pass() };
    renderSplash();
  }

  function renderSplash() {
    const sh = S();
    sh.hud().innerHTML = "";
    sh.main().innerHTML = `
      <div class="gb-splash gb-bg">
        <div class="gb-splash__card">
          <span class="ku-eyebrow"><svg class="ku-ico s"><use href="#i-utensils"/></svg> Повар</span>
          <h2 class="ku-h2">Давай потренируемся!</h2>
          <p class="ku-lead ku-mx-auto">На экран заказов поступят блюда коллекции Белые Грибы. Собери и упакуй каждый заказ без ошибок.</p>
          <div class="gb-slot" data-asset="cook-start"></div>
          <div class="gb-splash__rules ku-card">
            <ul>
              <li><svg class="ku-ico"><use href="#i-utensils"/></svg><span><b>8 блюд.</b> Таймер блюда запускается, когда нажимаешь «Принять»: на первое блюдо 2:30, на остальные по 2:00.</span></li>
              <li><svg class="ku-ico"><use href="#i-clock"/></svg><span><b>30 минут</b> на всю тренировку. Пока открыта подсказка об ошибке, таймеры стоят.</span></li>
              <li><svg class="ku-ico"><use href="#i-star"/></svg><span><b>Балл</b> — за блюдо без ошибок, собранное в срок. Чтобы пройти тренажёр, набери <b>${pass()} из ${list().length}</b>.</span></li>
            </ul>
          </div>
          <button class="ku-btn primary l" id="gb-cook-go"><svg class="ku-ico"><use href="#i-play"/></svg> Начать тренировку</button>
        </div>
      </div>`;
    window.GBAssets.hydrateAll(sh.main());
    document.getElementById("gb-cook-go").addEventListener("click", () => {
      run.total = sh.Clock().start();
      startHudTicker();
      renderOrder();
    });
  }

  /* ── HUD ──────────────────────────────────────────────────────────── */
  function renderHud() {
    const d = run.dishes[run.di];
    S().hud().innerHTML = `
      <span class="gb-vdu"><span class="gb-vdu__led"></span><span><span class="gb-vdu__label">Заказ ${Math.min(run.di + 1, run.dishes.length)} из ${run.dishes.length}</span><span class="gb-vdu__name">${d ? d.name : "—"}</span></span></span>
      <span class="gb-meter" id="gb-hud-dish"><svg class="ku-ico s"><use href="#i-clock"/></svg><small>блюдо</small> <span>—</span></span>
      <span class="gb-meter" id="gb-hud-total"><small>всего</small> <span>30:00</span></span>
      <span class="gb-meter" id="gb-hud-score"><svg class="ku-ico s"><use href="#i-star"/></svg> <span>${run.score}</span><small>из ${run.dishes.length}</small></span>`;
    tick();
  }
  function startHudTicker() {
    clearInterval(run.ticker);
    run.ticker = setInterval(tick, 250);
  }
  function tick() {
    if (!run || !run.total) return;
    const sh = S();
    const left = TOTAL_SEC - run.total.sec();
    const tEl = document.querySelector("#gb-hud-total span");
    if (tEl) {
      tEl.textContent = sh.fmt(Math.max(0, left));
      tEl.parentElement.classList.toggle("is-warn", left < 300);
      tEl.parentElement.classList.toggle("is-paused", !run.total.running);
    }
    const dEl = document.querySelector("#gb-hud-dish span");
    if (dEl && run.dishClock) {
      const d = run.dishes[run.di];
      const dl = d.limit - run.dishClock.sec();
      dEl.textContent = sh.fmt(dl, true);
      dEl.parentElement.classList.toggle("is-warn", dl <= 30 && dl > 0);
      dEl.parentElement.classList.toggle("is-over", dl <= 0);
      dEl.parentElement.classList.toggle("is-paused", !run.dishClock.running);
    } else if (dEl) {
      dEl.textContent = sh.fmt(run.dishes[run.di] ? run.dishes[run.di].limit : 0);
    }
    if (left <= 0 && !run.timeUp) { run.timeUp = true; timeIsUp(); }
  }
  async function timeIsUp() {
    const sh = S();
    if (run.dishClock) run.dishClock.pause();
    run.total.pause();
    await sh.feedback({ tone: "info", title: "Время тренировки вышло", text: "30 минут закончились. Посмотри, что получилось и какие блюда стоит повторить.", primary: "К результатам", pause: false });
    finishRun();
  }

  /* ── Экран «Новый заказ» ──────────────────────────────────────────── */
  function renderOrder() {
    const sh = S();
    const d = run.dishes[run.di];
    run.dish = { d, si: 0, errors: [], layers: { top: [], bottom: [] }, joined: false };
    run.dishClock = null;
    renderHud();
    sh.main().innerHTML = `
      <div class="gb-app__inner">
        <div class="gb-scene" style="min-height:min(70vh,34rem)">
          <div class="gb-slot gb-scene__bg" data-asset="cook-start"></div>
          <div class="gb-scene__stage" style="min-height:min(70vh,34rem)">
            <div class="ku-card" style="text-align:center;max-width:24rem;display:grid;gap:.7em;justify-items:center">
              <span class="ku-badge solid">Новый заказ</span>
              <h2 class="ku-h3">${d.name}</h2>
              <p class="ku-small ku-soft" style="margin:0">На это блюдо — ${sh.fmt(d.limit)}. Таймер запустится, когда примешь заказ.</p>
              <button class="ku-btn primary l" id="gb-accept"><svg class="ku-ico"><use href="#i-check"/></svg> Принять</button>
            </div>
          </div>
        </div>
      </div>`;
    window.GBAssets.hydrateAll(sh.main());
    const btn = document.getElementById("gb-accept");
    btn.focus();
    btn.addEventListener("click", () => {
      run.dishClock = sh.Clock().start();
      renderStep();
    });
  }

  /* ── Шаг ──────────────────────────────────────────────────────────── */
  function renderStep() {
    const sh = S();
    const { d, si } = run.dish;
    const step = d.steps[si];
    sh.main().innerHTML = `
      <div class="gb-app__inner">
        <div class="gb-task enter">
          <div>
            <div class="gb-task__num">Шаг ${si + 1} из ${d.steps.length}</div>
            <div class="gb-task__text">${step.title}</div>
            <div class="gb-task__hint">${step.hint || ""}</div>
          </div>
        </div>
        <div id="gb-step"></div>
      </div>`;
    const host = document.getElementById("gb-step");
    const ctx = {
      host, step, dish: run.dish, d,
      ok: () => nextStep(),
      fail: (text) => fail(step, text),
    };
    STEP_RENDERERS[step.type](ctx);
    window.GBAssets.hydrateAll(host);
    sh.scrollTop();
  }
  async function fail(step, text) {
    run.dish.errors.push({ step: step.title, text });
    await S().feedback({ title: "Не совсем так", text, primary: "Исправить" });
  }
  function nextStep() {
    run.dish.si++;
    if (run.dish.si < run.dish.d.steps.length) renderStep();
    else dishDone();
  }

  async function dishDone() {
    const sh = S();
    const { d, errors } = run.dish;
    run.dishClock.pause();
    const time = run.dishClock.sec();
    const late = time > d.limit;
    const point = errors.length === 0 && !late;
    if (point) run.score++;
    run.results.push({ name: d.name, time, limit: d.limit, errors: errors.slice(), point, late });
    run.dishClock.dispose();
    run.dishClock = null;
    renderHud();
    if (point) {
      const s = document.getElementById("gb-hud-score");
      if (s) s.classList.add("bump");
      sh.burst();
    }
    const last = run.di === run.dishes.length - 1;
    const verdict = point
      ? `<b>+1 балл.</b> Блюдо собрано без ошибок за ${sh.fmt(time)}.`
      : errors.length
        ? `Блюдо готово, но балл не начислен: ${errors.length} ${plural(errors.length, "ошибка", "ошибки", "ошибок")}${late ? " и превышено время" : ""}. Разбор — в итогах.`
        : `Блюдо собрано без ошибок, но на ${sh.fmt(time - d.limit)} дольше нормы — балл не начислен.`;
    sh.main().innerHTML = `
      <div class="gb-splash gb-bg">
        <div class="gb-splash__card">
          <div class="ku-icon-badge round ${point ? "solid" : ""}"><svg class="ku-ico"><use href="#${point ? "i-trophy" : "i-check"}"/></svg></div>
          <h2 class="ku-h2">${d.name}</h2>
          <p class="ku-lead ku-mx-auto">${verdict}</p>
          <button class="ku-btn primary l" id="gb-next">${last ? "К результатам" : "Следующий заказ"} <svg class="ku-ico arrow"><use href="#i-right"/></svg></button>
        </div>
      </div>`;
    const b = document.getElementById("gb-next");
    b.focus();
    b.addEventListener("click", () => {
      if (last) finishRun();
      else { run.di++; renderOrder(); }
    });
  }

  function finishRun() {
    const sh = S();
    clearInterval(run.ticker);
    run.total.pause();
    // Не успел — оставшиеся блюда
    for (let i = run.results.length; i < run.dishes.length; i++) {
      run.results.push({ name: run.dishes[i].name, time: 0, limit: run.dishes[i].limit, errors: [], point: false, skipped: true });
    }
    const passed = run.score >= run.pass;
    const res = { score: run.score, max: run.dishes.length, passed, totalSec: run.total.sec(), results: run.results };
    renderResults(res);
    if (run.onDone) run.onDone(res);
  }

  function renderResults(res) {
    const sh = S();
    sh.hud().innerHTML = `<span class="gb-meter"><svg class="ku-ico s"><use href="#i-star"/></svg> ${res.score}<small>из ${res.max}</small></span>`;
    const rows = res.results.map(r => {
      const uniq = [...new Set(r.errors.map(e => e.step))];
      const verdict = r.skipped ? `<span class="gb-verdict warn">Не успел</span>`
        : r.point ? `<span class="gb-verdict ok"><svg class="ku-ico s"><use href="#i-check"/></svg> +1</span>`
        : `<span class="gb-verdict bad">0</span>`;
      const recs = r.skipped ? "Собери это блюдо в следующей попытке."
        : r.errors.length ? `Повтори: ${uniq.map(s => s.replace(/^Ингредиенты добавлены! /, "")).join("; ")}.`
        : r.late ? "Сборка без ошибок. Потренируй скорость." : "Без ошибок.";
      return `<tr>
        <td data-th="Блюдо"><b>${r.name}</b></td>
        <td data-th="Время">${r.skipped ? "—" : `${sh.fmt(r.time)} <span class="ku-caption">/ ${sh.fmt(r.limit)}</span>`}</td>
        <td data-th="Ошибки">${r.skipped ? "—" : r.errors.length}${r.errors.length ? `<ul>${r.errors.map(e => `<li>${e.text}</li>`).join("")}</ul>` : ""}</td>
        <td data-th="Рекомендация">${recs}</td>
        <td data-th="Балл">${verdict}</td>
      </tr>`;
    }).join("");
    sh.main().innerHTML = `
      <div class="gb-app__inner">
        <div class="gb-results">
          <div class="gb-results__hero">
            <div class="gb-ring ${res.passed ? "is-pass" : ""}" style="--v:${Math.round(res.score / res.max * 100)}"><div><b>${res.score}</b><small>из ${res.max}</small></div></div>
            <div>
              <span class="ku-eyebrow">Итоги тренировки</span>
              <h2 class="ku-h2" style="margin-top:.4em">${res.passed ? "Тренажёр пройден!" : "Пока не хватает баллов"}</h2>
              <p class="ku-soft" style="margin:.4em 0 0;line-height:1.55">${res.passed
                ? (res.results.some(r => r.errors.length || r.late || r.skipped)
                  ? "Обрати внимание на блюда с ошибками и отработай их — в тренажёре или на практике в ресторане. Удачи!"
                  : "Все блюда собраны без ошибок и в срок. Удачи на смене!")
                : `Чтобы пройти, нужно ${run.pass} ${run.pass === 1 ? "балл" : "балла"} из ${res.max}. Посмотри, в каких блюдах были ошибки, и попробуй ещё раз.`}</p>
              <div class="gb-stats">
                <span class="gb-meter"><svg class="ku-ico s"><use href="#i-clock"/></svg> Общее время ${sh.fmt(res.totalSec)}</span>
                <span class="gb-meter">Ошибок: ${res.results.reduce((a, r) => a + r.errors.length, 0)}</span>
              </div>
            </div>
          </div>
          <div class="ku-scroll-x"><table class="ku-table">
            <thead><tr><th>Блюдо</th><th>Время</th><th>Ошибки</th><th>Рекомендация</th><th>Балл</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
          <div class="ku-row center">
            <button class="ku-btn soft" id="gb-retry"><svg class="ku-ico"><use href="#i-refresh"/></svg> Пройти ещё раз</button>
            <button class="ku-btn primary" id="gb-back">${res.passed ? "Продолжить" : "Вернуться в курс"} <svg class="ku-ico arrow"><use href="#i-right"/></svg></button>
          </div>
        </div>
      </div>`;
    sh.scrollTop();
    const cb = { onDone: run.onDone, onExit: run.onExit, onContinue: run.onContinue };
    document.getElementById("gb-retry").addEventListener("click", () => { sh.close(); start(cb); });
    document.getElementById("gb-back").addEventListener("click", () => { sh.close(); if (cb.onContinue) cb.onContinue(res); });
  }

  /* ════════════════════════════════════════════════════════════════════
     РЕНДЕРЕРЫ ШАГОВ
     ════════════════════════════════════════════════════════════════════ */
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const icon = (id, cls) => `<svg class="ku-ico ${cls || ""}"><use href="#${id}"/></svg>`;
  function scene(inner, actions) {
    return `<div class="gb-scene">
      <div class="gb-slot gb-scene__bg" data-asset="cook-station"></div>
      <div class="gb-scene__stage">${inner}${actions ? `<div class="gb-scene__actions">${actions}</div>` : ""}</div>
    </div>`;
  }

  const STEP_RENDERERS = {

    /* 1. Бумага: повернуть и проверить сторону */
    paper(ctx) {
      // Лист лежит печатью вниз и просвечивает: база зеркальная (scaleX(-1)),
      // поэтому клапан при сгибе читается правильной стороной. Геометрия и
      // сам ассет — из курса «Воппер Прародитель».
      let rot = [90, 180, 270][Math.floor(Math.random() * 3)];   // стартуем с неверного положения
      ctx.host.innerHTML = scene(
        `<div class="gb-paper-stage">
           <img class="gb-paper" id="gb-paper" src="${PAPER_IMG}" alt="Оберточная бумага Burger King"
                tabindex="0" role="button" aria-label="Повернуть лист на четверть оборота" draggable="false">
           <svg class="gb-paper__turn" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-rotate"/></svg>
         </div>`,
        `<button class="ku-btn primary" id="gb-check">${icon("i-check")} Проверить сторону</button>`);
      const stage = ctx.host.querySelector(".gb-paper-stage");
      const img = ctx.host.querySelector("#gb-paper");
      const apply = () => img.style.setProperty("--gb-rot", rot + "deg");
      const turn = () => { rot = (rot + 90) % 360; apply(); stage.classList.add("is-turned"); };
      apply();
      img.addEventListener("click", turn);
      img.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); turn(); } });
      ctx.host.querySelector("#gb-check").addEventListener("click", async () => {
        if (rot % 360 !== 0) await ctx.fail(ctx.step.err);
        else { S().toast(`${icon("i-check")} Бумага лежит правильно`); ctx.ok(); }
      });
    },

    /* 2. Булочки: перевернуть срезом вверх */
    buns(ctx) {
      // Булочки уже разрезаны и лежат срезом вверх — их нужно только положить на бумагу
      const disc = (part) => `
        <div class="gb-half">
          <span class="gb-half__label">${halfLabel(ctx.d.size, part)}</span>
          <div class="gb-half__disc">
            ${ART().svg("0 0 200 200", ART().bun(true, { sesame: part === "top" }))}
            <span class="gb-half__tag ok">срез вверх</span>
          </div>
        </div>`;
      // бумагу уже положили на предыдущем шаге — держим её под булочками
      ctx.host.innerHTML = scene(
        `<div class="gb-onpaper"><div class="gb-halves">${disc("top") + disc("bottom")}</div></div>`,
        `<button class="ku-btn primary" id="gb-place">${icon("i-layers")} Положить на бумагу</button>`);
      ctx.host.querySelector("#gb-place").addEventListener("click", () => ctx.ok());
    },

    /* 3. Сборка: нажимать на ингредиенты в правильном порядке и количестве */
    build(ctx) {
      const { step, dish } = ctx;
      const R = step.reqs;
      let i = 0, c = 0, weighed = false, lastDone = null;

      ctx.host.innerHTML = `
        ${scene(`<div class="gb-onpaper"><div class="gb-halves" id="gb-halves"></div></div><div id="gb-extra" style="display:contents"></div>`)}
        <div class="gb-station">
          <div class="gb-station__label"><span>Борт</span><span>Нажимай на ингредиент — один или несколько раз</span></div>
          <div class="gb-station__grid" id="gb-grid">
            ${Object.entries(ING).map(([k, v]) => `
              <button class="gb-ing" data-ing="${k}">
                <span class="gb-ing__count">0</span>
                <span class="gb-slot" data-asset="${v.asset}" data-art="ing:${k}"></span>
                <span>${v.label}</span>
              </button>`).join("")}
          </div>
        </div>`;
      drawHalves(ctx);
      const grid = ctx.host.querySelector("#gb-grid");
      const extra = ctx.host.querySelector("#gb-extra");

      function showCount(key) {
        grid.querySelectorAll(".gb-ing").forEach(b => b.classList.remove("has-count"));
        const b = grid.querySelector(`[data-ing="${key}"]`);
        if (b && c > 0) { b.querySelector(".gb-ing__count").textContent = c; b.classList.add("has-count"); }
      }
      function add(key) {
        dish.layers[step.part].push({ ing: key, i: dish.layers[step.part].filter(l => l.ing === key).length });
        c++;
        drawHalves(ctx, true);
        showCount(key);
      }
      function advance() {
        lastDone = R[i];
        i++; c = 0; weighed = false;
        renderExtra();
        if (i >= R.length) setTimeout(ctx.ok, S().reduceMotion ? 0 : 450);
      }
      function renderExtra() {
        const cur = R[i];
        let html = "";
        if (cur && cur.scale && c > 0) {
          html += `<div class="gb-scene__actions">
            ${weighed ? `<span class="gb-scale" aria-live="polite">${c * 20} г <small>весы</small></span>` : ""}
            ${weighed ? "" : `<button class="ku-btn soft" id="gb-weigh">${icon("i-scale")} Проверить на весах</button>`}
            <button class="ku-btn primary" id="gb-scale-next">Дальше ${icon("i-right", "arrow")}</button>
          </div>`;
        }
        extra.innerHTML = html;
        const w = extra.querySelector("#gb-weigh");
        if (w) w.addEventListener("click", () => { weighed = true; renderExtra(); });
        const sn = extra.querySelector("#gb-scale-next");
        if (sn) sn.addEventListener("click", async () => {
          if (!weighed) return ctx.fail(T.scaleNoWeigh);
          if (c < cur.n) return ctx.fail(cur.err);
          advance();
        });
      }
      grid.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-ing]");
        if (!b || e.target.closest("[data-prompt-key]")) return;
        const key = b.dataset.ing;
        b.classList.remove("tap"); void b.offsetWidth; b.classList.add("tap");
        const cur = R[i];
        if (!cur) return;
        if (key === cur.ing) {
          if (c < cur.n) {
            add(key);
            if (c >= cur.n && !cur.scale) advance();
            else renderExtra();
          } else {
            await ctx.fail(cur.err);   // лишняя ложка грибов
          }
          return;
        }
        // Лишнее нажатие на только что законченный ингредиент — подсказка про него
        if (c === 0 && lastDone && key === lastDone.ing) return ctx.fail(lastDone.err);
        await ctx.fail(cur.err);
      });
    },

    /* 4. Объединить половинки / собрать питу */
    join(ctx) {
      const { dish } = ctx;
      if (ctx.step.pita) {
        ctx.host.innerHTML = scene(`<div class="gb-halves"><div class="gb-half"><span class="gb-half__label">Тортилья</span>
          <button class="gb-half__disc" id="gb-pita" aria-label="Собрать питу">${pitaSvg(dish)}</button></div></div>`);
        ctx.host.querySelector("#gb-pita").addEventListener("click", (e) => {
          e.currentTarget.style.transition = "transform .5s";
          e.currentTarget.style.transform = "scaleY(.5)";
          dish.joined = true;
          setTimeout(ctx.ok, S().reduceMotion ? 0 : 500);
        });
        return;
      }
      ctx.host.innerHTML = scene(`<div class="gb-halves" id="gb-halves"></div>`);
      drawHalves(ctx, false, true);
      ctx.host.querySelector("#gb-halves").addEventListener("click", async (e) => {
        const b = e.target.closest("[data-part]"); if (!b) return;
        if (b.dataset.part === "bottom") return ctx.fail(ctx.step.err);
        b.style.setProperty("--mx-to", (ctx.host.querySelector('[data-part="bottom"]').getBoundingClientRect().left - b.getBoundingClientRect().left) + "px");
        b.classList.add("gb-merge");
        dish.joined = true;
        setTimeout(ctx.ok, S().reduceMotion ? 0 : 600);
      });
    },

    /* 5. Сэндвич на линию бумаги (перетаскивание по вертикали) */
    slide(ctx) {
      const line = LINE_PCT[ctx.step.line === "whopper" ? "whopper" : "angus"];
      const w = ctx.d.size === "whopper" ? 34 : 30;
      ctx.host.innerHTML = scene(wrapStage(w, line, `
          <span class="gb-pull" id="gb-hint">${icon("i-move", "s")} Тяни сэндвич вверх-вниз</span>`),
        `<button class="ku-btn primary" id="gb-pos">${icon("i-check")} Подтвердить позицию</button>`);
      const stage = ctx.host.querySelector("#gb-stage");
      const sand = ctx.host.querySelector("#gb-sand");
      const half = () => (sand.getBoundingClientRect().height / stage.getBoundingClientRect().height) * 100 / 2;
      const bottom = () => { const r = stage.getBoundingClientRect(); return ((sand.getBoundingClientRect().bottom - r.top) / r.height) * 100; };
      const clamp = (p) => Math.max(24 - half(), Math.min(100 - half(), p));
      const place = (p) => { sand.style.top = p + "%"; };
      place(clamp(85 - half()));
      let dragging = false;
      sand.addEventListener("pointerdown", (e) => {
        dragging = true; sand.classList.add("is-dragging");
        try { sand.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
      });
      sand.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const r = stage.getBoundingClientRect();
        place(clamp(((e.clientY - r.top) / r.height) * 100));
      });
      const end = () => { dragging = false; sand.classList.remove("is-dragging"); };
      sand.addEventListener("pointerup", end);
      sand.addEventListener("pointercancel", end);
      ctx.host.querySelector("#gb-pos").addEventListener("click", async () => {
        const b = bottom();
        if (Math.abs(b - line) <= LINE_TOL) {
          place(line - half());
          ctx.host.querySelector("#gb-target").classList.add("is-hit");
          const hint = ctx.host.querySelector("#gb-hint"); if (hint) hint.hidden = true;
          S().toast(`${icon("i-check")} Ровно по линии`);
          setTimeout(ctx.ok, S().reduceMotion ? 0 : 450);
        } else {
          await ctx.fail(`${ctx.step.err} Сдвинь сэндвич чуть ${b > line ? "выше" : "ниже"}.`);
        }
      });
    },

    /* 6. Закрыть бумагой: тянем нижний край вверх, логотип — на середину булочки */
    wrap(ctx) {
      const line = LINE_PCT[ctx.d.size === "whopper" ? "whopper" : "angus"];
      const w = ctx.d.size === "whopper" ? 34 : 30;
      ctx.host.innerHTML = scene(wrapStage(w, line, `
          <div class="gb-fold-flap" id="gb-fold"></div>
          <div class="gb-fold-flap-grip" id="gb-grip">${icon("i-up", "s")} Тяни край вверх</div>
          <div class="gb-fold-center" id="gb-center"></div>
          <div class="gb-wrap-hint">Пунктир — середина сэндвича. Логотип должен лечь на него</div>`, true),
        `<button class="ku-btn primary" id="gb-fold-done">${icon("i-check")} Подтвердить заворот</button>`);
      const stage = ctx.host.querySelector("#gb-stage");
      const paper = ctx.host.querySelector("#gb-wpaper");
      const sand = ctx.host.querySelector("#gb-sand");
      const flap = ctx.host.querySelector("#gb-fold");
      const grip = ctx.host.querySelector("#gb-grip");
      const half = () => (sand.getBoundingClientRect().height / stage.getBoundingClientRect().height) * 100 / 2;
      sand.style.top = (line - half()) + "%";
      const centerLine = ctx.host.querySelector("#gb-center");
      const placeCenter = () => { centerLine.style.top = (line - half()) + "%"; };
      placeCenter();
      let foldC = 100, drag = null;
      const applyFold = () => {
        const lead = 2 * foldC - 100;
        flap.style.top = lead + "%";
        flap.style.height = (100 - foldC) + "%";
        grip.style.top = lead + "%";
        paper.style.setProperty("--gb-cut", (100 - foldC) + "%");
        stage.style.setProperty("--gb-paper-h", stage.getBoundingClientRect().height + "px");
        placeCenter();
        centerLine.classList.toggle("is-hit", Math.abs(logoPct() - centerPct()) <= FOLD_TOL);
      };
      const logoPct = () => 2 * foldC - LOGO_PCT;
      const centerPct = () => line - half();
      applyFold();
      [flap, grip].forEach((el) => {
        el.addEventListener("pointerdown", (e) => {
          const r = stage.getBoundingClientRect();
          stage.classList.add("is-folding");
          drag = { y: e.clientY, c: foldC, h: r.height };
          try { el.setPointerCapture(e.pointerId); } catch (_) {}
          e.preventDefault();
        });
        el.addEventListener("pointermove", (e) => {
          if (!drag) return;
          const d = ((e.clientY - drag.y) / drag.h) * 100;
          foldC = Math.max(40, Math.min(100, drag.c + d / 2));
          applyFold();
        });
        const end = () => { drag = null; stage.classList.remove("is-folding"); };
        el.addEventListener("pointerup", end);
        el.addEventListener("pointercancel", end);
      });
      ctx.host.querySelector("#gb-fold-done").addEventListener("click", async () => {
        const diff = logoPct() - centerPct();
        if (Math.abs(diff) <= FOLD_TOL) {
          foldC = (centerPct() + LOGO_PCT) / 2; applyFold();
          grip.hidden = true;
          S().toast(`${icon("i-check")} Логотип по центру`);
          setTimeout(ctx.ok, S().reduceMotion ? 0 : 450);
        } else {
          await ctx.fail(`${ctx.step.err} Подтяни край ${diff > 0 ? "выше" : "ниже"}.`);
        }
      });
    },

    /* 7. Выбор упаковки */
    box(ctx) {
      const opts = [["angus", "Кламшелл Ангус", "box-angus"], ["bigking", "Упаковка Биг Кинг", "box-bigking"], ["whopper", "«Твой особенный Воппер»", "box-whopper"], ["alafrance", "Завернуть в бумагу (аля-франц)", "box-alafrance"]];
      ctx.host.innerHTML = scene(`<div class="gb-choice-grid" id="gb-boxes">
        ${opts.map(([k, label, asset]) => `<button class="gb-pick" data-box="${k}"><span class="gb-slot" data-asset="${asset}" data-art="choice:${k}"></span>${label}</button>`).join("")}
      </div>`);
      ctx.host.querySelector("#gb-boxes").addEventListener("click", async (e) => {
        const b = e.target.closest("[data-box]");
        if (!b || e.target.closest("[data-prompt-key]")) return;
        if (b.dataset.box === ctx.step.correct) {
          b.classList.add("is-good");
          setTimeout(ctx.ok, S().reduceMotion ? 0 : 450);
        } else await ctx.fail(ctx.step.err);
      });
    },

    /* 8. Маркировка: клапаны, наклейки, иконки */
    marks(ctx) {
      const { step } = ctx;
      const marked = [];
      ctx.host.innerHTML = scene(`<div class="gb-markpack">
        <div class="gb-markpack__box" id="gb-mp"></div>
        <div class="gb-flaps" id="gb-mk" style="justify-content:center">
          ${MARK_OPTIONS[step.pack].map(label => `<button class="gb-mark" data-mark="${esc(label)}">
            <span class="gb-mark__dot" style="--c:${ART().FLAP_COLORS[label] || (label.includes("Остро") ? "var(--gb-pack-red)" : "var(--ku-surface-2)")}">${icon("i-check")}</span>
            ${label}<span class="gb-mark__ok">отмечено</span></button>`).join("")}
        </div></div>`);
      const draw = () => {
        // пита — рендер 3D-модели: ребро с клапанами до и после продавливания «Сезонный»
        ctx.host.querySelector("#gb-mp").innerHTML = step.pack === "pita"
          ? `<span class="gb-pkimg"><img src="assets/trainer/${marked.includes("Сезонный") ? "cashier/pita-sezonnyi" : "cook/pita-edge"}.webp" alt="Торец упаковки питы с клапанами" draggable="false"></span>`
          : ART().pack(step.pack, { view: "marks", zoom: true, marks: marked.map(markObj) });
      };
      draw();
      ctx.host.querySelector("#gb-mk").addEventListener("click", async (e) => {
        const b = e.target.closest("[data-mark]"); if (!b) return;
        const label = b.dataset.mark;
        if (!step.required.includes(label)) return ctx.fail(step.err);
        marked.push(label);
        b.classList.add("is-marked");
        draw();
        if (step.required.every(r => marked.includes(r))) setTimeout(ctx.ok, S().reduceMotion ? 0 : 500);
      });
    },

    /* 9. Биг Кинг: маркировка по времени */
    timemark(ctx) {
      const { step } = ctx;
      ctx.host.innerHTML = scene(`<div class="gb-markpack">
        <span class="gb-meter">${icon("i-clock", "s")} Время на станции: <b>${step.now}</b></span>
        <div class="gb-markpack__box">${ART().pack("bigking", { view: "marks", zoom: true, marks: [] })}</div>
        <div class="ku-caption">Временная шкала на упаковке</div>
        <div class="gb-timeline" id="gb-tl">${Array.from({ length: 12 }, (_, k) => `<button data-h="${k + 1}">${k + 1}</button>`).join("")}</div>
      </div>`);
      ctx.host.querySelector("#gb-tl").addEventListener("click", async (e) => {
        const b = e.target.closest("[data-h]"); if (!b) return;
        if (+b.dataset.h === step.correct) { b.classList.add("is-marked"); setTimeout(ctx.ok, S().reduceMotion ? 0 : 450); }
        else await ctx.fail(step.err);
      });
    },

    /* 10. Пита в упаковку (перетаскивание) */
    pitaPack(ctx) {
      let top = 150;
      ctx.host.innerHTML = scene(`
        <div class="gb-drag-area" id="gb-area">
          <div style="position:absolute;left:8%;right:8%;top:4%;height:38%;border-radius:12px;border:3px dashed var(--ku-brand);background:color-mix(in srgb,var(--gb-pack-orange) 30%,transparent);display:grid;place-items:center">
            <span class="ku-badge">Упаковка</span>
          </div>
          <div class="gb-draggable" id="gb-pitadrag" tabindex="0" role="slider" aria-label="Пита: перетащи в упаковку" style="width:62%">
            ${ART().svg("0 0 200 110", `<path d="M10 100 A90 90 0 0 1 190 100 Z" style="fill:var(--gb-ill-tortilla)"/><path d="M30 100 A70 70 0 0 1 170 100" style="fill:none;stroke:#b8854a;stroke-width:2;stroke-dasharray:5 6;opacity:.6"/>`)}
            <span class="gb-pull" style="top:-2.2em">${icon("i-up", "s")} Тянуть</span>
          </div>
        </div>`);
      const area = ctx.host.querySelector("#gb-area");
      const el = ctx.host.querySelector("#gb-pitadrag");
      const place = () => { el.style.top = (top / 200 * 100) + "%"; };
      place();
      S().vDrag(el, area, {
        unitsH: 200, min: 0, max: 150,
        get: () => top, set: (v) => { top = v; el.classList.remove("is-snap"); place(); },
        drop: async (v) => {
          if (v >= 8 && v <= 50) { top = 22; el.classList.add("is-snap"); place(); setTimeout(ctx.ok, S().reduceMotion ? 0 : 450); }
          else { await ctx.fail(ctx.step.err); top = 150; el.classList.add("is-snap"); place(); }
        },
      });
    },

    /* 11. Пита: какой стороной закрыть */
    pitaSide(ctx) {
      ctx.host.innerHTML = scene(`<div class="gb-choice-grid cols-2" id="gb-side">
        <button class="gb-pick" data-side="plain"><span class="gb-slot bare" style="--ratio:2;--fit:contain"><img src="assets/trainer/cook/pita-top-plain.webp" alt="Пита закрыта линзой без надписи" draggable="false"></span>Сторона без надписи</button>
        <button class="gb-pick" data-side="spicy"><span class="gb-slot bare" style="--ratio:2;--fit:contain"><img src="assets/trainer/cook/pita-top-spicy.webp" alt="Пита закрыта линзой «Остро!»" draggable="false"></span>Сторона «Остро»</button>
      </div>`);
      ctx.host.querySelector("#gb-side").addEventListener("click", async (e) => {
        const b = e.target.closest("[data-side]"); if (!b) return;
        if (b.dataset.side === ctx.step.correct) { b.classList.add("is-good"); setTimeout(ctx.ok, S().reduceMotion ? 0 : 450); }
        else await ctx.fail(ctx.step.err);
      });
    },
  };

  /* ── Рисование половинок с накопленными слоями ────────────────────── */
  function layersSvg(list, animateLast) {
    return list.map((l, idx) => {
      const fn = l.ing.startsWith("patty") ? (i) => ART().patty(ING[l.ing].patty, true, 3 + i) : ART().layerArt[l.ing];
      const inner = fn ? fn(l.i) : "";
      return `<g class="${animateLast && idx === list.length - 1 ? "gb-layer-in" : ""}">${inner}</g>`;
    }).join("");
  }
  function drawHalves(ctx, animateLast, clickable) {
    const { dish, step } = ctx;
    const host = ctx.host.querySelector("#gb-halves");
    if (!host) return;
    if (dish.d.pita) { host.innerHTML = `<div class="gb-half is-active"><span class="gb-half__label">Тортилья · ${step.part === "top" ? "верхняя часть" : "нижняя часть"}</span><div class="gb-half__disc" style="width:clamp(12rem,42vw,17rem)">${pitaSvg(dish, step.part, animateLast)}</div></div>`; return; }
    const part = (p) => {
      const active = step.part === p;
      const tag = clickable ? "button" : "div";
      return `<div class="gb-half ${step.part ? (active ? "is-active" : "is-idle") : ""}">
        <span class="gb-half__label">${halfLabel(dish.d.size, p)}</span>
        <${tag} class="gb-half__disc" data-part="${p}" ${clickable ? `aria-label="${p === "top" ? "Верхняя" : "Нижняя"} часть сэндвича"` : ""}>
          ${ART().svg("0 0 200 200", ART().bun(true) + layersSvg(dish.layers[p], animateLast && active))}
        </${tag}>
      </div>`;
    };
    host.innerHTML = part("top") + part("bottom");
  }
  function pitaSvg(dish, activePart, animateLast) {
    const zone = (p) => {
      const t = p === "top" ? "translate(55 8) scale(0.45)" : "translate(55 102) scale(0.45)";
      return `<g transform="${t}">${layersSvg(dish.layers[p], animateLast && activePart === p)}</g>`;
    };
    const hl = activePart ? `<path d="${activePart === "top" ? "M8 100 A92 92 0 0 1 192 100 Z" : "M8 100 A92 92 0 0 0 192 100 Z"}" style="fill:none;stroke:var(--ku-brand);stroke-width:4;stroke-dasharray:8 6"/>` : "";
    return ART().svg("0 0 200 200", ART().tortilla() + zone("top") + zone("bottom") + hl);
  }

  /* ── Обёрточная бумага: ассет и геометрия из курса «Воппер Прародитель» ──
     Проценты считаются по высоте листа: линии сборки и логотип на макете. */
  const PAPER_IMG = "assets/trainer/cook/paper.webp";
  const LINE_PCT = { whopper: 32.07, angus: 25.72 };   // линии «Воппер» и «Ангус / Биг Кинг»
  const LOGO_PCT = 87.67;                              // центр оранжевого логотипа
  const LINE_TOL = 5, FOLD_TOL = 4.5;
  function wrapStage(w, line, extra, snapped) {
    return `<div class="gb-wrap-outer"><div class="gb-wrap-stage" id="gb-stage">
        <img class="gb-wrap-paper" id="gb-wpaper" src="${PAPER_IMG}" alt="Оберточная бумага со сгибами" draggable="false">
        <div class="gb-wrap-target" id="gb-target" style="top:${line}%"></div>
        <div class="gb-burger ${snapped ? "is-snapped" : ""}" id="gb-sand" style="width:${w}%">${ART().svg("0 0 200 200", ART().bun(false))}</div>
        ${extra || ""}
      </div></div>`;
  }

  window.GBCook = { start, PASS, DISHES, list, pass };
})();
