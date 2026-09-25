/**
 * ПРИЁМНИК АНАЛИТИКИ КУРСА «Коллекция Белые Грибы» → Google Sheets
 * ─────────────────────────────────────────────────────────────────────
 * Принимает пачки событий от course/js/gb-log.js (POST, text/plain, JSON)
 * и дописывает их строками в лист «events». Установка — analytics/README.md.
 *
 *  • TOKEN должен совпадать с token в course/js/gb-log-config.js.
 *  • Повторы (курс мог отправить пачку дважды при плохой сети) отсекаются
 *    по id события — кэш на 6 часов.
 *  • Запись под блокировкой: параллельные пачки не затирают друг друга.
 *  • Лист переполняется (MAX_ROWS строк) — создаётся следующий: events_2, events_3…
 *  • Текст, похожий на формулу (= + - @), пишется как текст — защита от инъекций.
 */

const TOKEN = "";                 // ← впиши свой токен (любая длинная строка) и его же — в gb-log-config.js
const SHEET_PREFIX = "events";
const MAX_ROWS = 400000;          // ~17 колонок × 400 тыс. строк — с запасом до лимита таблицы в 10 млн ячеек
const MAX_EVENTS_PER_POST = 200;

const HEADER = [
  "received_at", "event_time", "event_id", "seq", "session", "learner", "role", "course", "in_lms",
  "page", "type", "name", "value", "correct", "ms", "data", "user_agent",
];

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (TOKEN && body.k !== TOKEN) return reply_("forbidden");
    const events = Array.isArray(body.ev) ? body.ev.slice(0, MAX_EVENTS_PER_POST) : [];
    if (!events.length) return reply_("empty");

    // повторы — по id события
    const cache = CacheService.getScriptCache();
    const keys = events.map((x) => "e:" + String(x.id || "").slice(0, 60));
    const seen = cache.getAll(keys.filter((k) => k.length > 2));
    const fresh = events.filter((x, i) => x.id && !seen[keys[i]]);
    if (!fresh.length) return reply_("dup");

    const now = new Date();
    const rows = fresh.map((x) => [
      now,
      x.ts ? new Date(x.ts) : "",
      safe_(x.id), x.sq || "",
      safe_(body.s), safe_(body.l), safe_(body.r), safe_(body.cv), body.lms ? 1 : 0,
      safe_(x.p), safe_(x.t), safe_(x.n), safe_(x.v),
      x.c === undefined || x.c === null ? "" : Number(x.c),
      x.ms === undefined || x.ms === null ? "" : Number(x.ms) || 0,
      x.d ? safe_(JSON.stringify(x.d).slice(0, 2000)) : "",
      safe_(String(body.ua || "").slice(0, 200)),
    ]);

    const lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try {
      const sh = sheet_();
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADER.length).setValues(rows);
    } finally {
      lock.releaseLock();
    }

    const put = {};
    fresh.forEach((x) => { put["e:" + String(x.id).slice(0, 60)] = "1"; });
    cache.putAll(put, 21600);
    return reply_("ok");
  } catch (err) {
    console.error(err);
    return reply_("error");
  }
}

// проверка, что веб-приложение развёрнуто: открой URL …/exec в браузере — увидишь «ok»
function doGet() { return reply_("ok"); }

/** Запусти один раз вручную: создаёт лист events с шапкой и лист summary со сводками. */
function setup() {
  sheet_();
  buildSummary();
}

/** Сводки на отдельном листе (формулы QUERY по листу events; formula — в английской нотации). Можно перезапускать. */
function buildSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("summary") || ss.insertSheet("summary");
  sh.clear();
  const src = SHEET_PREFIX + "!A:Q";
  const blocks = [
    ["События по типам", `=QUERY(${src},"select K, count(C) where K is not null group by K order by count(C) desc label count(C) 'событий'",1)`],
    ["Тесты: доля верных ответов по вопросам", `=QUERY(${src},"select L, count(N), avg(N) where K = 'quiz' or K = 'pack_quiz' group by L order by avg(N) label count(N) 'ответов', avg(N) 'доля верных'",1)`],
    ["Повар: шаги с ошибками", `=QUERY(${src},"select L, M, count(N), avg(N), avg(O) where K = 'cook_step' group by L, M order by avg(N) label count(N) 'попыток', avg(N) 'доля верных', avg(O) 'среднее время, мс'",1)`],
    ["Повар: блюда", `=QUERY(${src},"select L, count(N), avg(N), avg(O) where K = 'cook_dish' group by L label count(N) 'собрано', avg(N) 'доля без ошибок и в срок', avg(O) 'среднее время, мс'",1)`],
    ["Кассир: заказы", `=QUERY(${src},"select L, count(N), avg(N) where K = 'cashier_give' group by L order by avg(N) label count(N) 'выдач', avg(N) 'доля верных'",1)`],
    ["Итоги тренажёров", `=QUERY(${src},"select L, count(N), avg(N) where K = 'trainer_result' or K = 'cashier_run' group by L label count(N) 'попыток', avg(N) 'доля сдавших'",1)`],
    ["Ошибки скриптов", `=QUERY(${src},"select L, M, count(C) where K = 'js_error' group by L, M order by count(C) desc label count(C) 'раз'",1)`],
  ];
  let col = 1;
  blocks.forEach(([title, f]) => {
    sh.getRange(1, col).setValue(title).setFontWeight("bold");
    sh.getRange(2, col).setFormula(f);
    col += 6;
  });
  sh.setFrozenRows(2);
}

// ── служебное ─────────────────────────────────────────────────────────
function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();
  let name = props.getProperty("sheet") || SHEET_PREFIX;
  let sh = ss.getSheetByName(name);
  if (sh && sh.getLastRow() >= MAX_ROWS) {                 // переполнился — следующий лист
    const n = (parseInt(name.split("_")[1] || "1", 10) || 1) + 1;
    name = SHEET_PREFIX + "_" + n;
    sh = null;
  }
  if (!sh) {
    sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, HEADER.length).setValues([HEADER]).setFontWeight("bold");
      sh.setFrozenRows(1);
    }
    props.setProperty("sheet", name);
  }
  return sh;
}

function safe_(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
