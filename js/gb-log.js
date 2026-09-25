/* ════════════════════════════════════════════════════════════════════════
   СБОРЩИК АНАЛИТИКИ → Google Sheets (приёмник: analytics/sheets.gs в корне проекта)
   ────────────────────────────────────────────────────────────────────────
   Что пишет:
     • session_start / session_end — начало и конец сеанса, длительность;
     • nav — переход между главами;
     • click — клик по кнопке или ссылке (если clicks: true в конфиге);
     • quiz — ответ в тесте KU (.ku-choice): вопрос, ответ, верно ли;
     • события модулей через GBLog.track(): выбор должности, шаги тренажёров,
       выдача заказа у кассира, клапаны 3D, ситуационный тест, видео;
     • js_error — ошибки скриптов (не больше 20 за сеанс).

   Почему не тормозит LMS и прохождение:
     • события копятся в памяти и уходят пачками — раз в 30 с, а не на каждый клик;
     • отправка — fetch no-cors + keepalive с таймаутом, никаких синхронных
       запросов, ответа никто не ждёт, интерфейс не блокируется;
     • сериализация — в простое браузера (requestIdleCallback);
     • нет сети — очередь лежит в localStorage и уходит позже (событие online,
       следующий заход); после неудачи — пауза растёт до 5 минут;
     • при закрытии и сворачивании вкладки остаток уходит через sendBeacon;
     • очередь ограничена 1000 событиями, сеанс — 5000: лишнее отбрасывается;
     • любая ошибка внутри сборщика глушится — курс её не видит.
   Пустой endpoint в js/gb-log-config.js — сборщик выключен (GBLog.track — пустышка).
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const CFG = Object.assign({ endpoint: "", token: "", course: "", learner: "hash", clicks: true }, window.GB_LOG_CONFIG || {});
  if (!CFG.endpoint || typeof fetch !== "function") {
    window.GBLog = { enabled: false, track() {}, flush() {} };
    return;
  }

  const LS_KEY = "gb-log-q:" + (CFG.course || "course");
  const MAX_QUEUE = 1000;          // событий в очереди (старые вытесняются)
  const MAX_BATCH = 60;            // событий в одной пачке
  const MAX_BYTES = 48000;         // тело запроса: keepalive и sendBeacon держат до ~64 КБ
  const FIRST_MS = 8000;           // первая отправка — вскоре после начала
  const EVERY_MS = 30000;          // дальше — раз в 30 с
  const MAX_BACKOFF = 300000;      // после ошибок сети — не чаще раза в 5 мин
  const TIMEOUT_MS = 15000;
  const SESSION_CAP = 5000;
  const ERR_CAP = 20;

  const now = () => Date.now();
  const rid = () => {
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
    return now().toString(36) + "-" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  };
  const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 0));
  const cut = (s, n) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);

  const session = rid();
  const started = now();
  let queue = load();
  let seq = 0, count = 0, errors = 0;
  let timer = null, inflight = false, backoff = 0, first = true, saveT = null;

  function load() {
    try { const a = JSON.parse(localStorage.getItem(LS_KEY) || "[]"); return Array.isArray(a) ? a.slice(-MAX_QUEUE) : []; }
    catch (_) { return []; }
  }
  function persist() {
    if (saveT) return;
    saveT = setTimeout(() => { saveT = null; try { localStorage.setItem(LS_KEY, JSON.stringify(queue)); } catch (_) {} }, 1500);
  }

  // ── контекст: глава, подглава, должность ──────────────────────────────
  function page() {
    try {
      if (document.body.classList.contains("gb-app-open")) {        // открыт тренажёр — он и есть «место»
        const t = document.getElementById("gb-app-title-text");
        return "app:" + cut(t && t.textContent, 40);
      }
      const a = document.querySelector(".ku-page.active");
      const id = a ? a.id.replace("ku-page-", "") : "home";
      const tab = a && a.querySelector("[data-sub-tab].is-active, [data-sub-tab][aria-selected='true']");
      return tab ? id + "/" + tab.dataset.subTab : id;
    } catch (_) { return ""; }
  }
  function fnv(str) {                               // FNV-1a, 2×32 бит: стабильный хэш id ученика без crypto.subtle
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
      h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
    }
    return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  }
  function learner() {
    if (CFG.learner === "none") return "";
    let id = "";
    try { id = (window.KU && window.KU.lms && window.KU.lms.learnerId && window.KU.lms.learnerId()) || ""; } catch (_) {}
    if (!id) return "";
    return CFG.learner === "raw" ? id : "h:" + fnv(CFG.course + "|" + id);
  }
  function role() {
    try {
      const v = window.KU && window.KU.vars;
      return v ? [v.get("position"), v.get("role")].filter(Boolean).join(" / ") : "";
    } catch (_) { return ""; }
  }

  // ── очередь ──────────────────────────────────────────────────────────
  /* track(тип, { n: имя/объект, v: значение/ответ, c: верно (true/false), ms: длительность, ...прочее → d }) */
  function track(type, data) {
    try {
      if (++count > SESSION_CAP) return;
      const e = { id: rid(), ts: now(), sq: ++seq, t: cut(type, 40), p: page() };
      if (data) {
        const d = {};
        Object.keys(data).forEach((k) => {
          const v = data[k];
          if (v === undefined) return;
          if (k === "n") e.n = cut(v, 150);
          else if (k === "v") e.v = cut(typeof v === "object" ? JSON.stringify(v) : v, 300);
          else if (k === "c") e.c = v ? 1 : 0;
          else if (k === "ms") e.ms = Math.round(+v) || 0;
          else d[k] = v;
        });
        if (Object.keys(d).length) e.d = d;
      }
      queue.push(e);
      if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
      persist();
      schedule(queue.length >= MAX_BATCH ? 1000 : null);
    } catch (_) {}
  }

  function schedule(ms) {
    if (timer) { if (ms == null) return; clearTimeout(timer); }
    const wait = ms != null ? ms : (first ? FIRST_MS : EVERY_MS) + backoff;
    timer = setTimeout(() => { timer = null; idle(flush); }, wait);
  }

  function envelope(events) {
    return JSON.stringify({ k: CFG.token, cv: CFG.course, s: session, l: learner(), r: role(),
      lms: !!(window.KU && window.KU.inLMS), ua: cut(navigator.userAgent, 200), ev: events });
  }
  function takeBatch() {                             // пачка не больше MAX_BATCH событий и MAX_BYTES байт
    const out = [];
    let bytes = 400;
    for (let i = 0; i < queue.length && out.length < MAX_BATCH; i++) {
      const sz = JSON.stringify(queue[i]).length * 2;  // кириллица в UTF-8 — до 2 байт на символ
      if (out.length && bytes + sz > MAX_BYTES) break;
      if (sz > MAX_BYTES) { queue.splice(i, 1); i--; continue; }   // одно событие-монстр — выбросить
      out.push(queue[i]); bytes += sz;
    }
    return out;
  }
  function drop(batch) {
    const ids = new Set(batch.map((e) => e.id));
    queue = queue.filter((e) => !ids.has(e.id));
    persist();
  }

  function flush() {
    try {
      if (inflight || !queue.length) return;
      if (navigator.onLine === false) { schedule(); return; }
      first = false;
      const batch = takeBatch();
      if (!batch.length) return;
      inflight = true;
      const ctrl = typeof AbortController === "function" ? new AbortController() : null;
      const to = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
      fetch(CFG.endpoint, {
        method: "POST", mode: "no-cors", keepalive: true, credentials: "omit", cache: "no-store",
        headers: { "Content-Type": "text/plain;charset=utf-8" },          // text/plain — без preflight-запроса
        body: envelope(batch), signal: ctrl ? ctrl.signal : undefined,
      }).then(() => {
        drop(batch); backoff = 0;
        if (queue.length) schedule(queue.length >= MAX_BATCH ? 2000 : null);
      }).catch(() => {
        backoff = Math.min(MAX_BACKOFF, Math.max(15000, backoff * 2));
        schedule();
      }).finally(() => { inflight = false; if (to) clearTimeout(to); });
    } catch (_) { inflight = false; }
  }

  // вкладку прячут или закрывают: остаток — через sendBeacon, пачками
  function beaconAll() {
    try {
      if (!queue.length || !navigator.sendBeacon) return;
      for (let guard = 0; guard < 20 && queue.length; guard++) {
        const batch = takeBatch();
        if (!batch.length) break;
        const ok = navigator.sendBeacon(CFG.endpoint, new Blob([envelope(batch)], { type: "text/plain;charset=utf-8" }));
        if (!ok) break;                                                    // не взял — останется в localStorage до следующего захода
        drop(batch);
      }
      try { localStorage.setItem(LS_KEY, JSON.stringify(queue)); } catch (_) {}
    } catch (_) {}
  }

  // ── автоматический сбор ───────────────────────────────────────────────
  const KEYS = ["pos", "role", "subTab", "box", "mark", "side", "open", "quick", "flap", "o", "start", "videoOpen", "step", "mission"];
  function onClick(ev) {
    try {
      const t = ev.target;
      if (!t || !t.closest) return;
      // ответ в тесте KU — отдельным событием, с правильностью
      const ch = t.closest(".ku-choice");
      if (ch && !ch.disabled) {
        const q = ch.closest(".ku-quiz-q");
        if (!(q && q.classList.contains("solved"))) {
          const qid = q && (q.getAttribute("data-ku-id") || (q.querySelector("h3,h4,.ku-quiz-q__text,p") || {}).textContent);
          track("quiz", { n: qid || "", v: ch.textContent, c: ch.dataset.correct === "1" });
        }
      }
      if (!CFG.clicks) return;
      const el = t.closest("button, a, [role='button'], [data-flap], [data-o]");
      if (!el) return;
      const d = {};
      KEYS.forEach((k) => { if (el.dataset && el.dataset[k] != null) d[k] = el.dataset[k]; });
      if (el.id) d.el = el.id;
      track("click", Object.assign({ n: el.getAttribute("aria-label") || el.textContent || el.id }, d));
    } catch (_) {}
  }
  document.addEventListener("click", onClick, { capture: true, passive: true });

  window.addEventListener("error", (e) => {
    if (++errors > ERR_CAP) return;
    track("js_error", { n: e.message, v: (e.filename || "").split("/").pop() + ":" + (e.lineno || 0) });
  });
  window.addEventListener("unhandledrejection", (e) => {
    if (++errors > ERR_CAP) return;
    track("js_error", { n: "promise: " + (e.reason && (e.reason.message || e.reason)), v: "" });
  });

  let ended = false;
  function end() {
    if (!ended) { ended = true; track("session_end", { ms: now() - started }); }
    beaconAll();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") beaconAll();
  });
  window.addEventListener("pagehide", end);
  window.addEventListener("online", () => { backoff = 0; schedule(1000); });

  // переходы по главам: оборачиваем kuNavigate, когда он появится
  document.addEventListener("DOMContentLoaded", () => {
    try {
      const nav = window.kuNavigate;
      if (typeof nav === "function" && !nav.__gbLog) {
        const wrapped = function (id) { track("nav", { n: id }); return nav.apply(this, arguments); };
        wrapped.__gbLog = true;
        window.kuNavigate = wrapped;
      }
    } catch (_) {}
  });

  window.GBLog = { enabled: true, track, flush: () => idle(flush), session };
  track("session_start", { w: window.innerWidth, h: window.innerHeight, queued: queue.length });
  if (queue.length > 1) schedule(3000);             // хвост прошлого захода — отправить пораньше
})();
