/* ════════════════════════════════════════════════════════════════════════
   ГРИБНАЯ ЛИНЕЙКА · ОБОЛОЧКА ТРЕНАЖЁРОВ
   ────────────────────────────────────────────────────────────────────────
   Общее для «Повара» и «Кассира»:
     • полноэкранное окно #gb-app (шапка с HUD, рабочая зона);
     • часы с паузой (Clock) — все зарегистрированные часы встают на паузу,
       пока открыта обратная связь;
     • окно обратной связи (закрывает человек, не таймер);
     • тост, «споры»-конфетти, форматирование времени.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Часы с паузой ─────────────────────────────────────────────────── */
  const clocks = new Set();
  function Clock() {
    let acc = 0, started = null;
    const c = {
      start() { if (started === null) started = performance.now(); return c; },
      pause() { if (started !== null) { acc += performance.now() - started; started = null; } return c; },
      reset() { acc = 0; started = null; return c; },
      ms() { return acc + (started !== null ? performance.now() - started : 0); },
      sec() { return c.ms() / 1000; },
      get running() { return started !== null; },
      dispose() { clocks.delete(c); },
    };
    clocks.add(c);
    return c;
  }
  function fmt(sec, signed) {
    const neg = sec < 0; sec = Math.abs(Math.round(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return (neg && signed ? "−" : "") + m + ":" + String(s).padStart(2, "0");
  }

  /* ── Окно приложения ───────────────────────────────────────────────── */
  let onExit = null, lastFocus = null;
  function open(opts) {
    const app = $("#gb-app");
    lastFocus = document.activeElement;
    $("#gb-app-title-text").textContent = opts.title;
    $("#gb-app-hud").innerHTML = "";
    $("#gb-app-main").innerHTML = "";
    onExit = opts.onExit || null;
    app.classList.add("is-open");
    document.body.classList.add("gb-app-open");
    $("#gb-app-exit").focus();
  }
  function close() {
    clocks.forEach(c => c.pause());
    clocks.clear();
    $("#gb-app").classList.remove("is-open");
    document.body.classList.remove("gb-app-open");
    $("#gb-fb").classList.remove("is-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function main() { return $("#gb-app-main"); }
  function hud() { return $("#gb-app-hud"); }
  function scrollTop() { const m = main(); if (m) m.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); }

  /* ── Обратная связь: промис, резолвится кнопкой ────────────────────── */
  let fbResolve = null;
  function feedback(opts) {
    const o = Object.assign({ tone: "bad", title: "Не совсем так", text: "", primary: "Исправить", secondary: null, pause: true }, opts);
    const fb = $("#gb-fb");
    const paused = [];
    if (o.pause) clocks.forEach(c => { if (c.running) { c.pause(); paused.push(c); } });
    fb.classList.toggle("is-good", o.tone === "good");
    $("#gb-fb-icon").innerHTML = `<svg class="ku-ico"><use href="#${o.tone === "good" ? "i-check" : o.tone === "info" ? "i-info" : "i-alert"}"/></svg>`;
    $("#gb-fb-title").textContent = o.title;
    $("#gb-fb-text").innerHTML = o.text;
    $("#gb-fb-paused").hidden = !(o.pause && paused.length);
    const p = $("#gb-fb-primary"), s = $("#gb-fb-secondary");
    p.textContent = o.primary;
    s.hidden = !o.secondary;
    if (o.secondary) s.textContent = o.secondary;
    fb.classList.add("is-open");
    p.focus();
    return new Promise((resolve) => {
      fbResolve = (val) => {
        fb.classList.remove("is-open");
        paused.forEach(c => c.start());
        fbResolve = null;
        resolve(val);
      };
    });
  }

  /* ── Тост и конфетти ───────────────────────────────────────────────── */
  let toastT = null;
  function toast(html) {
    const t = $("#gb-toast");
    t.innerHTML = html;
    t.classList.add("is-show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("is-show"), 1800);
  }
  function burst() {
    if (reduceMotion) return;
    const b = document.createElement("div");
    b.className = "gb-burst";
    const colors = ["var(--ku-brand)", "var(--ku-warning)", "var(--ku-success)", "var(--ku__cap-500)", "var(--ku__shroom-400)"];
    for (let i = 0; i < 28; i++) {
      const el = document.createElement("i");
      const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 180;
      el.style.setProperty("--tx", Math.cos(a) * d + "px");
      el.style.setProperty("--ty", Math.sin(a) * d - 40 + "px");
      el.style.setProperty("--c", colors[i % colors.length]);
      el.style.width = el.style.height = 5 + Math.random() * 7 + "px";
      b.appendChild(el);
    }
    $("#gb-app").appendChild(b);
    setTimeout(() => b.remove(), 1000);
  }

  /* ── Перетаскивание по вертикали (мышь + тач + клавиатура) ────────── */
  // el двигается в area; позиция в «единицах» 0…unitsH. onMove(y), onDrop(y).
  function vDrag(el, area, o) {
    let startY = 0, startVal = 0, dragging = false, moved = false;
    const unitsPerPx = () => o.unitsH / area.getBoundingClientRect().height;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      dragging = true; moved = false;
      startY = e.clientY; startVal = o.get();
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
    });
    el.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dy = (e.clientY - startY) * unitsPerPx();
      if (Math.abs(dy) > 1) moved = true;
      o.set(clamp(startVal + dy, o.min, o.max));
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("is-dragging");
      if (moved) o.drop(o.get());
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        o.set(clamp(o.get() + (e.key === "ArrowUp" ? -2 : 2), o.min, o.max));
      }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); o.drop(o.get()); }
    });
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ── Привязка кнопок оболочки ──────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    $("#gb-fb-primary").addEventListener("click", () => fbResolve && fbResolve("primary"));
    $("#gb-fb-secondary").addEventListener("click", () => fbResolve && fbResolve("secondary"));
    $("#gb-app-exit").addEventListener("click", async () => {
      if (fbResolve) return;
      const r = await feedback({
        tone: "info", title: "Выйти из тренажёра?",
        text: "Результат этой попытки не сохранится. Лучший результат прошлых попыток останется.",
        primary: "Продолжить тренировку", secondary: "Выйти",
      });
      if (r === "secondary") { const cb = onExit; close(); if (cb) cb(); }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("#gb-app").classList.contains("is-open") && !fbResolve) $("#gb-app-exit").click();
    });
  });

  window.GBShell = { Clock, fmt, open, close, main, hud, scrollTop, feedback, toast, burst, vDrag, clamp, reduceMotion };
})();
