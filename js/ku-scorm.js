/* ════════════════════════════════════════════════════════════════════════
   KU · SCORM-РАНТАЙМ КУРСА (SCORM 1.2) — ЭТАЛОН tools/runtime/ku-scorm.js
   ────────────────────────────────────────────────────────────────────────
   Один файл на любой курс: копируется в <курс>/js/ku-scorm.js без правок.
   Правила, по которым он устроен, — tools/SCORM_QA_PRINCIPLES.md (номера
   разделов в комментариях). Сборщик tools/pack_scorm.py сверяет копию в
   курсе с этим эталоном.

   ПОДКЛЮЧЕНИЕ (в index.html курса):
     <html data-ku-course="id-курса" data-ku-complete-mode="lms">
       …
       <button data-ku-complete>Завершить курс</button>   — где-то на финальном экране
       <script src="js/ku-scorm.js"></script>             — до скриптов курса
     data-ku-course        ключ прогресса = course.json → "identifier" (обязательно)
     data-ku-complete-mode "lms" (WebTutor, по умолчанию) | "finish" (другие LMS)
                           = course.json → "complete_mode"

   ЧТО ДЕЛАЕТ САМ (курсу ничего писать не нужно):
     • SCORM 1.2 API: поиск по parent/opener, LMSInitialize на window 'load';
     • прогресс: главы, решённые упражнения ([data-ku-id]), поля ([data-ku-var]);
       cmi.suspend_data (≤ 4096) + копия в localStorage, привязанная к ученику (1.7);
     • incomplete — только незавершённому курсу, completed/passed не понижаются (1.6);
     • «Завершить» ([data-ku-complete] или KU.complete()) — 1.5:
         lms:    балл 100, completed → passed, Commit → пауза SAVE_WAIT →
                 перезагрузка без LMSFinish → экран «Курс завершён»;
         finish: … → exit=logout → Commit → LMSFinish → попытка закрыть окно;
     • повторный вход в пройденный курс: сразу подтверждает passed и показывает
       выбор «Пройти заново / Выйти» (1.6);
     • уход без завершения: session_time, exit=suspend, LMSFinish (pagehide).

   КАСТОМИЗАЦИЯ ЭКРАНОВ: событие 'ku:reentry' (cancelable) — курс может
   показать свой экран и вызвать event.preventDefault(); тогда встроенный не
   появляется. Кнопки курса вызывают KU.restart() / KU.exitCompleted().

   JS-API:
     KU.vars.get(имя) / KU.vars.set(имя, значение) / KU.vars.all()
     KU.progress.markDone(id) / KU.progress.isDone(id)
     KU.progress.setUnlocked(n) / KU.progress.unlocked()
     KU.report.text([имена]) / KU.report.render()
     KU.lms.interaction(id, response, result?) — cmi.interactions.*
     KU.lms.learnerId()        — cmi.core.student_id (для аналитики)
     KU.complete()             — завершить (то же, что кнопка)
     KU.restart()              — пройти заново: сброс прогресса, статус не понижается
     KU.exitCompleted()        — выйти из пройденного курса (как «Завершить»)
     KU.save()                 — форс-сохранение
     KU.state / KU.inLMS / KU.mode

   СОБЫТИЯ (document): 'ku:ready' (detail = state), 'ku:done' (detail = id),
     'ku:completed', 'ku:reentry' (cancelable).

   ДЕКЛАРАТИВНЫЕ ХУКИ: data-ku-id, data-ku-var, data-ku-label,
     data-ku-report="all|имя1,имя2", data-ku-report-copy, data-ku-report-download,
     data-ku-complete.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ══ 1. ПОИСК И ОБЁРТКА SCORM 1.2 API ═══════════════════════════════ */
  let api = null;          // объект API из окна LMS
  let lmsReady = false;    // LMSInitialize прошёл успешно

  function findAPI(win) {
    // Стандартный алгоритм SCORM 1.2: поднимаемся по parent-цепочке (≤10),
    // затем пробуем opener. Любая ошибка кросс-домена — просто нет API.
    try {
      let n = 0;
      while (win && n++ < 10) {
        if (win.API) return win.API;
        if (win === win.parent) break;
        win = win.parent;
      }
    } catch (e) { /* нет доступа — значит нет LMS */ }
    return null;
  }
  function lmsInit() {
    api = findAPI(window);
    if (!api && window.opener) api = findAPI(window.opener);
    if (api) {
      // после «Пройти заново» страница перезагружается в той же сессии: повторный LMSInitialize
      // вернёт ошибку «уже инициализировано» — сессия при этом рабочая, продолжаем с ней
      try { api.LMSInitialize(""); } catch (e) {}
      lmsReady = true;
    }
  }
  function lmsGet(key) {
    if (!lmsReady) return "";
    try { return String(api.LMSGetValue(key) || ""); } catch (e) { return ""; }
  }
  function lmsSet(key, value) {
    if (!lmsReady) return;
    try { api.LMSSetValue(key, String(value)); } catch (e) {}
  }
  function lmsCommit() {
    if (!lmsReady) return;
    try { api.LMSCommit(""); } catch (e) {}   // без commit LMS может не сохранить
  }
  function lmsFinish() {
    if (!lmsReady) return;
    try { api.LMSFinish(""); } catch (e) {}
    lmsReady = false;
  }

  /* ══ 2. СОСТОЯНИЕ ═══════════════════════════════════════════════════ */
  const COURSE_ID =
    document.documentElement.getAttribute("data-ku-course") || location.pathname;
  // Режим завершения (1.5): "lms" — WebTutor с «завершать курс»; "finish" — LMSFinish + logout
  const MODE = document.documentElement.getAttribute("data-ku-complete-mode") === "finish" ? "finish" : "lms";
  /* Копия прогресса в localStorage — общая для всех, кто работает в этом браузере (общие
     компьютеры ресторана!). Поэтому в LMS ключ привязан к ученику (cmi.core.student_id):
     чужой прогресс не подхватывается и курс не засчитывается не тому человеку. Если LMS
     не отдала id — localStorage не используем вовсе, прогресс только из suspend_data.
     Вне LMS (просмотр в браузере) — общий ключ, как раньше. */
  const LS_BASE = "ku::" + COURSE_ID;
  let LS_KEY = LS_BASE;                 // уточняется в bindLearner() после LMSInitialize; "" — не использовать
  const lsGet = () => { if (!LS_KEY) return ""; try { return localStorage.getItem(LS_KEY) || ""; } catch (e) { return ""; } };
  const lsSet = (v) => { if (!LS_KEY) return; try { localStorage.setItem(LS_KEY, v); } catch (e) {} };
  const lsDel = () => { if (!LS_KEY) return; try { localStorage.removeItem(LS_KEY); } catch (e) {} };
  function bindLearner() {
    if (!lmsReady) return;
    const id = lmsGet("cmi.core.student_id").trim();
    LS_KEY = id ? LS_BASE + "::" + id : "";
    RESTART_KEY = "ku-restart::" + COURSE_ID + (id ? "::" + id : "");
    FINISH_KEY = "ku-finished::" + COURSE_ID + (id ? "::" + id : "");
    // общий ключ без ученика мог остаться от предыдущих версий курса — это чужой прогресс, убираем
    try { localStorage.removeItem(LS_BASE); } catch (e) {}
  }

  const state = {
    unlocked: 1,      // до какой главы открыто (для последовательной навигации)
    done: {},         // { "id-упражнения": true }
    vars: {},         // { "имя": "значение" }
    completed: false, // курс завершён кнопкой
  };

  function serialize(full) {
    // full=true — всё как есть (localStorage);
    // full=false — влезаем в suspend_data: при переполнении режем значения
    // переменных, в крайнем случае шлём без vars (прогресс важнее).
    const snapshot = {
      unlocked: state.unlocked, done: state.done,
      vars: state.vars, completed: state.completed,
    };
    let json = JSON.stringify(snapshot);
    if (full || json.length <= 4000) return json;
    const trimmed = {};
    for (const k in snapshot.vars) {
      const v = String(snapshot.vars[k]);
      trimmed[k] = v.length > 120 ? v.slice(0, 119) + "…" : v;
    }
    json = JSON.stringify({ ...snapshot, vars: trimmed });
    if (json.length <= 4000) return json;
    return JSON.stringify({ ...snapshot, vars: {} });
  }

  let saveTimer = null;
  function save() {
    lsSet(serialize(true));
    if (lmsReady) {
      lmsSet("cmi.suspend_data", serialize(false));
      // Один раз помечаем попытку начатой. Никогда не понижаем completed.
      const status = lmsGet("cmi.core.lesson_status");
      if (!state.completed && (status === "" || status === "not attempted" || status === "unknown")) {
        lmsSet("cmi.core.lesson_status", "incomplete");
      }
      lmsCommit();
    }
  }
  function saveSoon() {           // дебаунс для полей ввода
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 400);
  }

  /* «Пройти заново»: метка в адресе (#ku-restart) и в sessionStorage переживает перезагрузку.
     С ней курс стартует с нуля, что бы ни вернула LMS в suspend_data. */
  let RESTART_KEY = "ku-restart::" + COURSE_ID;          // в LMS — с id ученика (bindLearner)
  function takeRestartMark() {
    let mark = location.hash === "#ku-restart";
    try { if (sessionStorage.getItem(RESTART_KEY)) mark = true; sessionStorage.removeItem(RESTART_KEY); } catch (e) {}
    if (location.hash === "#ku-restart") {
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    }
    return mark;
  }
  /* «Завершаем»: метка ставится перед перезагрузкой в режиме lms. Если LMS не успела или не стала
     закрывать окно, после перезагрузки курс показывает экран «Курс завершён», а не список глав
     и не выбор повторного входа. Живёт FINISH_TTL мс и привязана к ученику. */
  let FINISH_KEY = "ku-finished::" + COURSE_ID;
  const FINISH_TTL = 60000;
  function takeFinishMark() {
    let t = 0;
    try { t = +sessionStorage.getItem(FINISH_KEY) || 0; sessionStorage.removeItem(FINISH_KEY); } catch (e) {}
    return t > 0 && Date.now() - t < FINISH_TTL;
  }
  let restarted = false, justFinished = false;
  function load() {
    restarted = takeRestartMark();
    justFinished = !restarted && takeFinishMark();
    if (restarted) {                       // чистый старт: ни suspend_data, ни localStorage не читаем
      lsDel();
      return;
    }
    let json = "";
    if (lmsReady) json = lmsGet("cmi.suspend_data");
    if (!json) json = lsGet();
    if (json) {
      try {
        const s = JSON.parse(json);
        if (typeof s.unlocked === "number") state.unlocked = Math.max(1, s.unlocked);
        if (s.done && typeof s.done === "object") state.done = s.done;
        if (s.vars && typeof s.vars === "object") state.vars = s.vars;
        state.completed = !!s.completed;
      } catch (e) { /* мусор в хранилище игнорируем */ }
    }
    // localStorage может хранить более полные vars, чем обрезанный suspend_data
    try {
      const local = JSON.parse(lsGet() || "null");
      if (local && local.vars) {
        for (const k in local.vars) {
          const remote = state.vars[k];
          if (!remote || (String(remote).endsWith("…") &&
              String(local.vars[k]).length > String(remote).length)) {
            state.vars[k] = local.vars[k];
          }
        }
      }
    } catch (e) {}
    // Курс уже пройден (по нашим данным или по статусу в LMS) — в новой попытке WebTutor сразу
    // подтверждаем «Пройден», чтобы статус не висел «В процессе».
    if (lmsReady) {
      const st = lmsGet("cmi.core.lesson_status");
      if (st === "passed" || st === "completed") state.completed = true;
      if (state.completed && st !== "passed") { writeResult(); lmsCommit(); }
      if (state.completed) resultSent = true;
    }
  }

  /* ══ 3. ПЕРЕМЕННЫЕ ([data-ku-var]) ══════════════════════════════════ */
  function fieldValue(el) {
    if (el.type === "checkbox") return el.checked ? (el.value || "да") : "";
    if (el.type === "radio") return el.checked ? el.value : undefined;
    return el.value;
  }
  function bindVars() {
    document.querySelectorAll("[data-ku-var]").forEach((el) => {
      const name = el.getAttribute("data-ku-var");
      // восстановление
      const saved = state.vars[name];
      if (saved !== undefined) {
        if (el.type === "checkbox") el.checked = saved !== "";
        else if (el.type === "radio") { if (el.value === saved) el.checked = true; }
        else el.value = saved;
      }
      // автосохранение
      el.addEventListener("input", onChange);
      el.addEventListener("change", onChange);
      function onChange() {
        const v = fieldValue(el);
        if (v !== undefined) { state.vars[name] = v; saveSoon(); }
      }
    });
  }
  function varLabel(name) {
    const el = document.querySelector('[data-ku-var="' + CSS.escape(name) + '"]');
    if (!el) return name;
    return el.getAttribute("data-ku-label")
        || (el.labels && el.labels[0] && el.labels[0].textContent.trim())
        || el.getAttribute("placeholder")
        || name;
  }

  /* ══ 4. ПРОГРЕСС УПРАЖНЕНИЙ И ГЛАВ ══════════════════════════════════ */
  function decorateDone(id) {
    document.querySelectorAll('[data-ku-id="' + CSS.escape(id) + '"]')
      .forEach((el) => el.classList.add("is-done"));
  }
  const progress = {
    markDone(id) {
      if (!id || state.done[id]) return;
      state.done[id] = true;
      decorateDone(id);
      document.dispatchEvent(new CustomEvent("ku:done", { detail: id }));
      save();
    },
    isDone(id) { return !!state.done[id]; },
    setUnlocked(n) {
      if (n > state.unlocked) { state.unlocked = n; save(); }
    },
    unlocked() { return state.unlocked; },
  };

  /* ══ 5. СВОДКА / «ЛИСТ НАСТАВНИКУ» ══════════════════════════════════ */
  function reportNames(spec) {
    if (!spec || spec === "all") return Object.keys(state.vars);
    return spec.split(",").map((s) => s.trim()).filter(Boolean);
  }
  function reportPairs(names) {
    return names
      .filter((n) => state.vars[n] !== undefined && state.vars[n] !== "")
      .map((n) => ({ label: varLabel(n), value: String(state.vars[n]) }));
  }
  function reportText(names) {
    const title = document.title || COURSE_ID;
    const lines = ["Сводка ответов — " + title, ""];
    reportPairs(names || reportNames("all")).forEach((p) => {
      lines.push(p.label + ":"); lines.push("  " + p.value); lines.push("");
    });
    return lines.join("\n");
  }
  function renderReports() {
    document.querySelectorAll("[data-ku-report]").forEach((box) => {
      const pairs = reportPairs(reportNames(box.getAttribute("data-ku-report")));
      box.innerHTML = pairs.length
        ? pairs.map((p) =>
            '<div class="ku-report__row"><div class="ku-report__label">' +
            escapeHtml(p.label) + '</div><div class="ku-report__value">' +
            escapeHtml(p.value) + "</div></div>").join("")
        : '<p class="ku-report__empty">Ответы пока не заполнены.</p>';
    });
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function bindReportButtons() {
    document.querySelectorAll("[data-ku-report-copy]").forEach((btn) =>
      btn.addEventListener("click", () => {
        navigator.clipboard && navigator.clipboard.writeText(reportText());
        flash(btn, "Скопировано!");
      }));
    document.querySelectorAll("[data-ku-report-download]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const blob = new Blob([reportText()], { type: "text/plain;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = (document.title || "отчёт") + ".txt";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }));
  }
  function flash(btn, text) {
    const old = btn.innerHTML;
    btn.innerHTML = text;
    setTimeout(() => { btn.innerHTML = old; }, 1400);
  }

  /* ══ 6. ЗАВЕРШЕНИЕ — ТОЛЬКО КНОПКОЙ ═════════════════════════════════ */
  /* Длительность сеанса для cmi.core.session_time — формат SCORM 1.2 HHHH:MM:SS.SS */
  const SESSION_START = Date.now();
  function sessionTime() {
    const t = Math.max(0, (Date.now() - SESSION_START) / 1000);
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return String(h).padStart(4, "0") + ":" + String(m).padStart(2, "0") + ":" + s.toFixed(2).padStart(5, "0");
  }

  function complete() {
    if (state.completed && !lmsReady) return;      // уже завершён и сессия закрыта
    state.completed = true;
    // Отклик кнопки — ДО вызовов LMS: в WebTutor они синхронные и блокируют отрисовку.
    const btns = document.querySelectorAll("[data-ku-complete]");
    btns.forEach((b) => {
      b.disabled = true;
      b.setAttribute("aria-disabled", "true");
      b.dataset.kuLabel = b.innerHTML;
      b.textContent = "Сохраняем результат…";
    });
    // даём браузеру нарисовать «Сохраняем…», потом одним пакетом пишем в LMS
    requestAnimationFrame(() => setTimeout(finishSession, 30));
  }
  /* Результат — единственное место в коде, где пишутся completed и passed: итоговый статус — passed. */
  function writeResult() {
    lmsSet("cmi.core.score.min", "0");
    lmsSet("cmi.core.score.max", "100");
    lmsSet("cmi.core.score.raw", "100");
    lmsSet("cmi.core.lesson_status", "completed");
    lmsSet("cmi.core.lesson_status", "passed");
  }
  let resultSent = false;
  /* «Завершить» — единственный путь к completed/passed (1.5). */
  function finishSession() {
    if (MODE === "finish") finishLogout(); else finishLms();
  }
  /* Режим lms (WebTutor, «завершать курс»): результат → Commit → пауза → уход страницы
     БЕЗ LMSFinish и без exit — попытку закрывает LMS: флажок и переход на опрос.
     LMSFinish с exit="logout" WebTutor принимает за выход пользователя («До свидания»).
     Пауза SAVE_WAIT: LMSCommit в WebTutor возвращается сразу, а на сервер статус уходит
     в фоне; при раннем уходе LMS видит «В процессе», и «Завершить» срабатывает только
     со второго нажатия. */
  function finishLms() {
    lsSet(serialize(true));
    if (lmsReady) {
      writeResult(); resultSent = true;
      lmsSet("cmi.suspend_data", serialize(false));
      lmsSet("cmi.core.session_time", sessionTime());
      lmsCommit();
    }
    document.dispatchEvent(new CustomEvent("ku:completed"));
    if (!lmsReady) { showDone(); return; }       // без LMS — сразу экран завершения
    try { sessionStorage.setItem(FINISH_KEY, String(Date.now())); } catch (e) {}
    setTimeout(() => {
      reloading = true;                          // уход без LMSFinish (leave() пропускается)
      location.reload();
    }, SAVE_WAIT);
  }
  const SAVE_WAIT = 2000;                        // мс между сохранением результата и уходом страницы
  /* Режим finish (LMS, которые закрывают попытку только по LMSFinish). */
  function finishLogout() {
    lsSet(serialize(true));
    if (lmsReady) {
      writeResult(); resultSent = true;
      lmsSet("cmi.suspend_data", serialize(false));
      lmsSet("cmi.core.session_time", sessionTime());
      lmsSet("cmi.core.exit", "logout");
      lmsCommit();
    }
    document.dispatchEvent(new CustomEvent("ku:completed"));
    lmsFinish();
    showDone();
    setTimeout(() => {
      try { if (window.parent !== window) window.parent.postMessage({ type: "ku:close-course", courseId: COURSE_ID }, "*"); } catch (e) {}
      try { window.top.close(); } catch (e) {}
      try { window.close(); } catch (e) {}
    }, 400);
  }



  function bindComplete() {
    document.querySelectorAll("[data-ku-complete]").forEach((btn) =>
      btn.addEventListener("click", complete));
    // Кнопку при повторном входе НЕ блокируем: WebTutor открывает новую попытку «в процессе»,
    // и закрыть её можно только завершением (или выбором «Выйти» на экране повторного входа).
  }

  /* Повторный вход в пройденный курс (1.6) — встроенный экран выбора (или свой — 'ku:reentry'):
     restart() — пройти заново: прогресс и выбор ролей обнуляются, статус в LMS не понижается;
     exitCompleted() — выйти: то же, что «Завершить». */
  let reloading = false;
  function restart() {
    state.unlocked = 1; state.done = {}; state.vars = {}; state.completed = false;
    lsDel();
    try { sessionStorage.setItem(RESTART_KEY, "1"); } catch (e) {}
    // статус в LMS не трогаем: уже полученный «Пройден» не понижаем
    if (lmsReady) { lmsSet("cmi.suspend_data", serialize(false)); lmsCommit(); }
    reloading = true;                    // перезагрузка без LMSFinish — сессия LMS остаётся открытой
    location.hash = "ku-restart";
    location.reload();
  }
  function exitCompleted() {
    state.completed = true;
    document.querySelectorAll("[data-ku-complete]").forEach((b) => { b.disabled = true; });
    finishSession();
  }

  /* ══ ЭКРАНЫ РАНТАЙМА: «Курс завершён» и повторный вход ══════════════ */
  // Стили свои и с запасными цветами — работают в любом курсе; берут токены KU, если они есть.
  function injectStyles() {
    if (document.getElementById("ku-rt-style")) return;
    const st = document.createElement("style");
    st.id = "ku-rt-style";
    st.textContent =
      ".ku-rt{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;" +
      "background:rgba(30,20,12,.55);backdrop-filter:blur(4px);font-family:var(--ku-font-body,system-ui,sans-serif)}" +
      ".ku-rt__card{width:min(100%,30rem);background:var(--ku-card,#fff);color:var(--ku-text,#2b1d14);" +
      "border-radius:var(--ku-radius-l,18px);padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center}" +
      ".ku-rt__card h2{margin:0 0 .4em;font:700 1.5rem/1.2 var(--ku-font-display,inherit)}" +
      ".ku-rt__card p{margin:0 0 1.2em;line-height:1.5;color:var(--ku-text-soft,#6b5a4c)}" +
      ".ku-rt__row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}" +
      ".ku-rt__btn{font:600 1rem/1 inherit;padding:.85em 1.3em;border-radius:var(--ku-radius-m,12px);border:0;cursor:pointer;" +
      "background:var(--ku-surface-2,#efe6dc);color:var(--ku-text,#2b1d14)}" +
      ".ku-rt__btn--main{background:var(--ku-brand,#b6531c);color:#fff}" +
      ".ku-rt__btn:disabled{opacity:.6;cursor:default}";
    document.head.appendChild(st);
  }
  function overlay(id, html) {
    injectStyles();
    let el = document.getElementById(id);
    if (!el) { el = document.createElement("div"); el.id = id; el.className = "ku-rt"; document.body.appendChild(el); }
    el.innerHTML = '<div class="ku-rt__card" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.style.overflow = "hidden";
    return el;
  }
  function showDone() {
    const r = document.getElementById("ku-reentry"); if (r) r.remove();
    overlay("ku-done", "<h2>Курс завершён</h2><p>Результат сохранён. Окно можно закрыть.</p>");
  }
  function askReentry() {
    const ev = new CustomEvent("ku:reentry", { cancelable: true, detail: state });
    if (!document.dispatchEvent(ev)) return;     // курс показал свой экран
    const el = overlay("ku-reentry",
      "<h2>Курс уже пройден</h2><p>Можно пройти его ещё раз с начала или выйти — результат сохранится.</p>" +
      '<div class="ku-rt__row"><button type="button" class="ku-rt__btn ku-rt__btn--main" data-ku-rt="restart">Пройти заново</button>' +
      '<button type="button" class="ku-rt__btn" data-ku-rt="exit">Выйти из курса</button></div>');
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-ku-rt]"); if (!b) return;
      el.querySelectorAll("[data-ku-rt]").forEach((x) => { x.disabled = true; });
      if (b.dataset.kuRt === "restart") { b.textContent = "Начинаем заново…"; restart(); }
      else { b.textContent = "Сохраняем результат…"; setTimeout(exitCompleted, 30); }
    });
    const first = el.querySelector("[data-ku-rt]"); if (first) first.focus();
  }

  /* ══ 7. ОТЧЁТ В LMS (cmi.interactions — опционально) ════════════════ */
  const lms = {
    interaction(id, response, result) {
      if (!lmsReady) return;
      const i = parseInt(lmsGet("cmi.interactions._count") || "0", 10) || 0;
      lmsSet("cmi.interactions." + i + ".id", id);
      lmsSet("cmi.interactions." + i + ".type", "fill-in");
      lmsSet("cmi.interactions." + i + ".student_response",
             String(response).slice(0, 255));
      if (result) lmsSet("cmi.interactions." + i + ".result", result);
      lmsCommit();
    },
    // id ученика в LMS (cmi.core.student_id) — для аналитики курса
    learnerId() { return lmsGet("cmi.core.student_id"); },
  };

  /* ══ 8. ИНИЦИАЛИЗАЦИЯ ═══════════════════════════════════════════════ */
  // На 'load', не DOMContentLoaded: LMS вставляет API в окно поздно.
  window.addEventListener("load", () => {
    lmsInit();
    bindLearner();
    load();
    bindVars();
    bindComplete();
    bindReportButtons();
    renderReports();
    Object.keys(state.done).forEach(decorateDone);
    document.dispatchEvent(new CustomEvent("ku:ready", { detail: state }));
    if (justFinished) showDone();                // вернулись после «Завершить»: LMS окно не закрыла
    else if (state.completed) askReentry();      // повторный вход в пройденный курс
    // Сводки должны обновляться по мере ввода
    document.addEventListener("input", (e) => {
      if (e.target && e.target.hasAttribute &&
          e.target.hasAttribute("data-ku-var")) renderReports();
    });
  });
  // Ушли, не завершив: «suspend» — LMS сохранит прогресс и продолжит с того же места.
  // pagehide надёжнее beforeunload (мобильные браузеры, iframe); lmsFinish срабатывает один раз.
  function leave() {
    if (!lmsReady || reloading) return;
    save();
    lmsSet("cmi.core.session_time", sessionTime());
    if (!state.completed) lmsSet("cmi.core.exit", "suspend");
    lmsCommit();
    lmsFinish();
  }
  window.addEventListener("pagehide", leave);
  window.addEventListener("beforeunload", leave);

  /* ══ ЭКСПОРТ ════════════════════════════════════════════════════════ */
  window.KU = {
    vars: {
      get: (n) => state.vars[n],
      set: (n, v) => { state.vars[n] = v; renderReports(); saveSoon(); },
      all: () => ({ ...state.vars }),
    },
    progress,
    report: { text: reportText, render: renderReports },
    lms,
    complete,
    restart,
    exitCompleted,
    save,
    get state() { return state; },
    get inLMS() { return lmsReady; },
    mode: MODE,
  };
})();
