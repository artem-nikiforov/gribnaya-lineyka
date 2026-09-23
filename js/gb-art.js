/* ════════════════════════════════════════════════════════════════════════
   ГРИБНАЯ ЛИНЕЙКА · SVG-ИЛЛЮСТРАЦИИ (живые заглушки)
   ────────────────────────────────────────────────────────────────────────
   Рисует всё, что нужно тренажёрам, пока нет финальных картинок:
   ингредиенты на борту, слои сэндвича (вид сверху), бумагу, упаковки
   с клапанами. Когда художник положит файл из assets/…, слот покажет
   картинку, а эти рисунки останутся запасным вариантом.
   Цвета — CSS-переменные --gb-ill-* и --gb-pack-* (css/course.css).
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const V = (name) => `var(--gb-ill-${name})`;
  const P = (name) => `var(--gb-pack-${name})`;
  const f = (c) => `style="fill:${c}"`;
  const fs = (c, s, w) => `style="fill:${c};stroke:${s};stroke-width:${w || 2}"`;
  const svg = (vb, body, extra) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" ${extra || ""}>${body}</svg>`;

  // Детерминированный «рандом», чтобы слои не прыгали при перерисовке
  function rng(seed) {
    // mulberry32: соседние seed дают независимые последовательности
    let a = (seed * 2654435761) >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ── Декор: белый гриб, лист, спора ───────────────────────────────── */
  function porcini(opts) {
    const o = Object.assign({ cap: "var(--ku__cap-500)", capLight: "var(--ku__cap-400)", stem: "var(--ku__shroom-50)", shade: "var(--ku__shroom-300)" }, opts);
    return svg("0 0 120 130", `
      <path d="M44 62 C40 88 34 110 38 122 C48 128 72 128 82 122 C86 110 80 88 76 62 Z" ${f(o.stem)}/>
      <path d="M44 62 C42 80 40 98 40 112 C46 116 52 117 56 117 C52 100 52 80 54 62 Z" ${f(o.shade)} opacity="0.7"/>
      <path d="M8 64 C6 30 34 8 60 8 C88 8 116 30 112 64 C104 72 16 72 8 64 Z" ${f(o.cap)}/>
      <path d="M22 40 C30 22 46 14 60 14 C50 20 38 30 32 46 Z" ${f(o.capLight)} opacity="0.55"/>
      <path d="M12 63 C30 70 90 70 108 63" style="fill:none;stroke:${o.shade};stroke-width:3;opacity:.6"/>`);
  }
  function leaf(color) {
    return svg("0 0 100 60", `
      <path d="M4 30 C24 2 70 -2 96 30 C70 62 24 58 4 30 Z" ${f(color || "var(--ku__rust-400)")}/>
      <path d="M4 30 L96 30 M30 30 L44 16 M30 30 L44 44 M56 30 L68 18 M56 30 L68 42" style="fill:none;stroke:var(--ku__cap-700);stroke-width:2;opacity:.35;stroke-linecap:round"/>`);
  }
  function oakLeaf(color) {
    return svg("0 0 80 120", `
      <path d="M40 116 L40 96 C24 96 26 84 16 82 C26 74 12 68 8 58 C22 58 20 46 14 38 C28 40 26 26 26 16 C36 22 38 10 40 4 C42 10 44 22 54 16 C54 26 52 40 66 38 C60 46 58 58 72 58 C68 68 54 74 64 82 C54 84 56 96 40 96" ${f(color || "var(--ku__cap-400)")}/>
      <path d="M40 112 L40 14" style="fill:none;stroke:var(--ku__cap-800);stroke-width:2;opacity:.3"/>`);
  }

  /* ── Логотип BK (упрощённый силуэт для заглушек) ──────────────────── */
  function bkLogo(x, y, w, colors) {
    const c = Object.assign({ bun: P("orange"), text: P("red"), bg: P("beige") }, colors);
    const h = w * 0.78;
    return `<g transform="translate(${x - w / 2} ${y - h / 2})">
      <rect x="0" y="0" width="${w}" height="${h}" rx="${w * 0.42}" ${f(c.bg)}/>
      <path d="M${w * 0.1} ${h * 0.4} C${w * 0.12} ${h * 0.08} ${w * 0.88} ${h * 0.08} ${w * 0.9} ${h * 0.4} Z" ${f(c.bun)}/>
      <path d="M${w * 0.1} ${h * 0.62} L${w * 0.9} ${h * 0.62} C${w * 0.88} ${h * 0.92} ${w * 0.12} ${h * 0.92} ${w * 0.1} ${h * 0.62} Z" ${f(c.bun)}/>
      <text x="${w / 2}" y="${h * 0.56}" text-anchor="middle" font-family="Flame, Golos Text, sans-serif" font-weight="700" font-size="${w * 0.19}" ${f(c.text)}>BURGER KING</text>
    </g>`;
  }
  function flames(w, h, color, seed) {
    const r = rng(seed || 7); let d = `M0 ${h}`;
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const x = (w / n) * i, peak = h * (0.15 + r() * 0.45);
      d += ` Q${x - w / n / 2} ${peak} ${x} ${h * (0.55 + r() * 0.3)}`;
    }
    return `<path d="${d} L${w} ${h} Z" ${f(color)}/>`;
  }

  /* ════════════════════════════════════════════════════════════════════
     ИНГРЕДИЕНТЫ НА БОРТУ (иконка 100×100)
     ════════════════════════════════════════════════════════════════════ */
  function pan(inner, tone) {
    return `<rect x="8" y="30" width="84" height="60" rx="8" ${fs(V("steel"), "rgba(0,0,0,.18)", 1.5)}/>
            <rect x="14" y="36" width="72" height="48" rx="5" ${f(tone || "rgba(0,0,0,.12)")}/>${inner}`;
  }
  /* Дозатор соуса, как на станции: хромированная обойма с тубой, плоская
     пластина с наклейкой вкуса и длинная тяга с жёлтой Г-образной рукояткой. */
  function dispenser(label, handle, drop) {
    const steel = "#c9ccd1", steelDark = "#8f949b";
    return svg("0 0 100 100", `
      <!-- тяга и рукоятка -->
      <path d="M62 44 L88 20" style="stroke:${steelDark};stroke-width:3;stroke-linecap:round"/>
      <path d="M86 22 L92 12 L82 6" style="fill:none;stroke:${handle};stroke-width:7;stroke-linecap:round;stroke-linejoin:round"/>
      <!-- обойма с тубой -->
      <rect x="10" y="40" width="58" height="26" rx="12" ${f(steel)}/>
      <rect x="10" y="40" width="58" height="26" rx="12" style="fill:none;stroke:rgba(0,0,0,.18);stroke-width:1.4"/>
      <rect x="16" y="45" width="40" height="16" rx="6" ${f("#f3f1ec")}/>
      <rect x="12" y="43" width="54" height="5" rx="2.5" ${f("#eef0f3")} opacity=".65"/>
      <path d="M14 46 L14 60" style="stroke:rgba(0,0,0,.12);stroke-width:2"/>
      <!-- носик и капля соуса -->
      <path d="M10 48 L2 51 L2 55 L10 58 Z" ${f(steelDark)}/>
      <ellipse cx="4" cy="64" rx="4" ry="5" ${f(drop)}/>
      <!-- фланец и пластина с наклейкой -->
      <circle cx="68" cy="53" r="13" ${f(steel)}/>
      <circle cx="68" cy="53" r="13" style="fill:none;stroke:rgba(0,0,0,.2);stroke-width:1.4"/>
      <path d="M62 40 L84 44 L82 70 L60 66 Z" ${f("#d7dade")}/>
      <path d="M62 40 L84 44 L82 70 L60 66 Z" style="fill:none;stroke:rgba(0,0,0,.18);stroke-width:1.2"/>
      <circle cx="66" cy="62" r="1.8" ${f(steelDark)}/><circle cx="78" cy="64" r="1.8" ${f(steelDark)}/>
      <rect x="61" y="45" width="22" height="13" rx="2" transform="rotate(4 72 51)" ${f(P("yellow"))}/>
      <text x="72" y="50" text-anchor="middle" font-size="5" font-weight="700" transform="rotate(4 72 51)" ${f("var(--ku__cap-800)")}>${label[0]}</text>
      <text x="72" y="56" text-anchor="middle" font-size="5" font-weight="700" transform="rotate(4 72 51)" ${f("var(--ku__cap-800)")}>${label[1] || ""}</text>`);
  }
  const ING_ART = {
    sauceM: () => dispenser(["БЕЛЫЕ", "ГРИБЫ"], P("yellow"), V("sauce")),
    mayo: () => dispenser(["МАЙОНЕЗ", ""], P("yellow"), V("mayo")),
    hot: () => svg("0 0 100 100", `
      <path d="M36 22 L64 22 L68 86 C68 92 32 92 32 86 Z" ${f(V("hot"))}/>
      <rect x="40" y="10" width="20" height="14" rx="3" ${f("#8e2014")}/>
      <path d="M47 2 L53 2 L52 10 L48 10 Z" ${f("#8e2014")}/>
      <rect x="36" y="46" width="28" height="18" rx="2" ${f("#fff")}/>
      <text x="50" y="58" text-anchor="middle" font-size="7" font-weight="700" ${f(V("hot"))}>ОСТРЫЙ</text>`),
    iceberg: () => svg("0 0 100 100", pan(Array.from({ length: 26 }, (_, i) => {
      const r = rng(i + 3); const x = 18 + r() * 60, y = 40 + r() * 38;
      return `<path d="M${x} ${y} q6 -6 12 0 q-6 3 -12 0" ${f(i % 3 ? V("lettuce") : "#b9d98a")}/>`;
    }).join(""))),
    tomato: () => svg("0 0 100 100", pan([[32, 52], [60, 50], [44, 70], [70, 70]].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="13" ${f(V("tomato"))}/><circle cx="${x}" cy="${y}" r="8" ${f("#f07b5f")}/><circle cx="${x}" cy="${y}" r="2.5" ${f("#fbd2a0")}/>`).join(""))),
    pattyA: () => pattyIcon("Ангус", 34),
    pattyH: () => pattyIcon("Гамбургер", 26),
    pattyW: () => pattyIcon("Воппер", 38),
    cheddar: () => svg("0 0 100 100", `
      <rect x="22" y="26" width="52" height="52" rx="4" transform="rotate(-8 48 52)" ${f("#e39b1f")}/>
      <rect x="26" y="22" width="52" height="52" rx="4" ${f(V("cheese"))}/>
      <text x="52" y="52" text-anchor="middle" font-size="9" font-weight="700" ${f("#8a5a07")}>ЧЕДДЕР</text>`),
    pickle: () => svg("0 0 100 100", pan([[30, 50], [52, 46], [72, 54], [40, 70], [62, 70]].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="11" ${f(V("pickle"))}/><circle cx="${x}" cy="${y}" r="7" ${f("#a8c264")}/>`).join(""))),
    onion: () => svg("0 0 100 100", pan([[34, 56], [60, 52], [48, 68]].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="14" style="fill:none;stroke:${V("onion")};stroke-width:4"/><circle cx="${x}" cy="${y}" r="8" style="fill:none;stroke:#cdb3d6;stroke-width:3"/>`).join(""))),
    crispy: () => svg("0 0 100 100", pan(Array.from({ length: 30 }, (_, i) => {
      const r = rng(i + 40); return `<circle cx="${18 + r() * 64}" cy="${40 + r() * 38}" r="${2 + r() * 3}" ${f(i % 2 ? V("crispy") : "#e3b061")}/>`;
    }).join("") + spoon())),
    mush: () => svg("0 0 100 100", pan(Array.from({ length: 16 }, (_, i) => {
      const r = rng(i + 90); const x = 18 + r() * 60, y = 40 + r() * 36;
      return `<path d="M${x} ${y} q5 -8 10 0 l-2 6 h-6 z" ${f(i % 2 ? V("mush") : "#c9955f")}/>`;
    }).join("") + spoon(), )),
  };
  function spoon() {
    return `<ellipse cx="74" cy="30" rx="12" ry="8" ${f("#9c968c")}/><rect x="80" y="10" width="5" height="22" rx="2" transform="rotate(35 82 20)" ${f("#9c968c")}/>`;
  }
  function pattyIcon(label, r) {
    return svg("0 0 100 100", `
      <defs><clipPath id="gb-pi-${label.length}-${r}"><ellipse cx="50" cy="52" rx="${r - 1}" ry="${r * 0.72 - 1}"/></clipPath></defs>
      <ellipse cx="50" cy="56" rx="${r + 6}" ry="${r * 0.72 + 5}" ${f(V("steel"))}/>
      <ellipse cx="50" cy="52" rx="${r}" ry="${r * 0.72}" ${f(V("patty"))}/>
      <g clip-path="url(#gb-pi-${label.length}-${r})">${[-0.5, 0, 0.5].map(k => `<path d="M${50 - r} ${52 + k * r * 0.9 + 9} L${50 + r} ${52 + k * r * 0.9 - 9}" style="stroke:${V("grill")};stroke-width:3;stroke-linecap:round;opacity:.8"/>`).join("")}</g>
      <rect x="18" y="82" width="64" height="14" rx="7" ${f("#fff")}/>
      <text x="50" y="92" text-anchor="middle" font-size="8" font-weight="700" ${f("var(--ku__cap-800)")}>${label}</text>`);
  }

  /* ════════════════════════════════════════════════════════════════════
     СЛОИ СЭНДВИЧА — вид сверху (viewBox 0 0 200 200, центр 100/100)
     ════════════════════════════════════════════════════════════════════ */
  // Порции соуса — крупные, компактным треугольником по центру, как на станции
  const SAUCE_POS = [[100, 76], [75, 120], [125, 120], [100, 116], [76, 82], [124, 82], [100, 150]];
  const TOMATO_POS = [[72, 90], [128, 110], [100, 100]];
  const layerArt = {
    sauceM: (i) => floret(SAUCE_POS[i % SAUCE_POS.length], V("sauce"), "#d6c4a4", false, i),
    mayo: (i) => floret(SAUCE_POS[(i + 1) % SAUCE_POS.length], V("mayo"), "#fffaf0", true),
    iceberg: () => Array.from({ length: 34 }, (_, k) => {
      const r = rng(k + 11); const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 70;
      const x = 100 + Math.cos(a) * d, y = 100 + Math.sin(a) * d;
      return `<path d="M${x} ${y} q9 -9 18 0 q-9 4 -18 0" ${f(k % 3 ? V("lettuce") : "#c4e09a")}/>`;
    }).join(""),
    tomato: (i) => { const [x, y] = TOMATO_POS[i % 3]; return `<circle cx="${x}" cy="${y}" r="34" ${f(V("tomato"))}/><circle cx="${x}" cy="${y}" r="24" ${f("#f07b5f")}/>${[0, 72, 144, 216, 288].map(a => `<ellipse cx="${x + Math.cos(a * Math.PI / 180) * 14}" cy="${y + Math.sin(a * Math.PI / 180) * 14}" rx="4" ry="2.4" ${f("#fbd2a0")}/>`).join("")}`; },
    patty: (i, o) => patty(o && o.r || 80, true, 3 + i),
    cheddar: (i) => `<rect x="42" y="42" width="116" height="116" rx="6" transform="rotate(${45 + i * 12} 100 100)" ${f(V("cheese"))} opacity="0.95"/>`,
    hot: () => [70, 52, 34].map(r => `<circle cx="100" cy="100" r="${r}" style="fill:none;stroke:${V("hot")};stroke-width:5;opacity:.9"/>`).join(""),
    mush: (i) => Array.from({ length: 14 }, (_, k) => {
      const r = rng((i + 1) * 100 + k); const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 62;
      const x = 100 + Math.cos(a) * d, y = 100 + Math.sin(a) * d;
      return `<path d="M${x} ${y} q7 -11 14 0 l-3 8 h-8 z" ${f(k % 2 ? V("mush") : "#c9955f")}/>`;
    }).join(""),
    pickle: (i) => { const pos = [[72, 72], [128, 72], [72, 128], [128, 128], [100, 100]][i % 5]; return `<circle cx="${pos[0]}" cy="${pos[1]}" r="22" ${f(V("pickle"))}/><circle cx="${pos[0]}" cy="${pos[1]}" r="15" ${f("#a8c264")}/>${[0, 120, 240].map(a => `<circle cx="${pos[0] + Math.cos(a * Math.PI / 180) * 7}" cy="${pos[1] + Math.sin(a * Math.PI / 180) * 7}" r="2" ${f("#e9f0c8")}/>`).join("")}`; },
    onion: () => [[80, 86, 30], [122, 112, 26], [96, 126, 20]].map(([x, y, r]) => `<path d="M${x - r} ${y} A${r} ${r} 0 0 1 ${x + r} ${y}" style="fill:none;stroke:${V("onion")};stroke-width:6;stroke-linecap:round"/>`).join(""),
    crispy: () => Array.from({ length: 40 }, (_, k) => {
      const r = rng(k + 400); const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 60;
      return `<circle cx="${100 + Math.cos(a) * d}" cy="${100 + Math.sin(a) * d}" r="${2.5 + r() * 3}" ${f(k % 2 ? V("crispy") : "#e3b061")}/>`;
    }).join(""),
  };
  function floret([x, y], c, hi, drop, seed) {
    if (drop) return `<ellipse cx="${x}" cy="${y}" rx="18" ry="15" style="fill:${c};stroke:rgba(61,35,20,.14);stroke-width:1.2"/><ellipse cx="${x - 5}" cy="${y - 5}" rx="6" ry="3.5" ${f("#fff")} opacity=".85"/>`;
    // крупинки грибов в соусе — как на фото со станции
    const r = rng((seed || 0) * 17 + 3);
    const bits = Array.from({ length: 7 }, () => {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 12;
      return `<circle cx="${(x + Math.cos(a) * d).toFixed(1)}" cy="${(y + Math.sin(a) * d).toFixed(1)}" r="${(1.2 + r() * 1.4).toFixed(1)}" ${f("#6b5a45")} opacity=".55"/>`;
    }).join("");
    return `<g style="stroke:rgba(61,35,20,.13);stroke-width:1.2">
      ${[0, 72, 144, 216, 288].map(a => `<circle cx="${(x + Math.cos(a * Math.PI / 180) * 15).toFixed(1)}" cy="${(y + Math.sin(a * Math.PI / 180) * 15).toFixed(1)}" r="13" ${f(c)}/>`).join("")}
      <circle cx="${x}" cy="${y}" r="16" style="fill:${c};stroke:none"/>
      <circle cx="${x}" cy="${y}" r="9" style="fill:${hi};stroke:none"/>
      <g style="stroke:none">${bits}</g></g>`;
  }
  function patty(r, marksUp, seed) {
    const rr = rng(seed || 5);
    const id = "gb-patty-" + Math.round(r * 10) + "-" + (seed || 5);
    let spots = "";
    for (let k = 0; k < 18; k++) { const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * r * 0.85; spots += `<circle cx="${100 + Math.cos(a) * d}" cy="${100 + Math.sin(a) * d}" r="${1.5 + rr() * 2.5}" ${f("#4f2a17")} opacity=".6"/>`; }
    // следы от гриля обрезаны по краю котлеты — за неё не выходят
    const marks = marksUp ? `<g clip-path="url(#${id})">${[-0.55, -0.18, 0.18, 0.55].map(k =>
      `<path d="M${100 - r} ${100 + k * r * 1.2 + 16} L${100 + r} ${100 + k * r * 1.2 - 16}" style="stroke:${V("grill")};stroke-width:${r * 0.1};stroke-linecap:round;opacity:.85"/>`).join("")}</g>` : "";
    return `<defs><clipPath id="${id}"><circle cx="100" cy="100" r="${r - 1}"/></clipPath></defs>
      <circle cx="100" cy="100" r="${r}" ${f(marksUp ? V("patty") : "#8a5638")}/>${spots}${marks}`;
  }
  function bun(cutUp, opts) {
    const o = Object.assign({ r: 90, sesame: true }, opts);
    if (cutUp) {
      return `<circle cx="100" cy="100" r="${o.r}" ${f(V("bun"))}/><circle cx="100" cy="100" r="${o.r - 7}" ${f(V("bun-cut"))}/>` +
        Array.from({ length: 30 }, (_, k) => { const r = rng(k + 700); const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (o.r - 16); return `<circle cx="${100 + Math.cos(a) * d}" cy="${100 + Math.sin(a) * d}" r="${1 + r() * 1.6}" ${f("#e3bb7a")}/>`; }).join("");
    }
    return `<circle cx="100" cy="100" r="${o.r}" ${f(V("bun"))}/><circle cx="84" cy="80" r="${o.r * 0.55}" ${f("#e8b774")} opacity=".45"/>` +
      (o.sesame ? Array.from({ length: 34 }, (_, k) => { const r = rng(k + 800); const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (o.r - 14); return `<ellipse cx="${100 + Math.cos(a) * d}" cy="${100 + Math.sin(a) * d}" rx="3.2" ry="1.8" transform="rotate(${r() * 180} ${100 + Math.cos(a) * d} ${100 + Math.sin(a) * d})" ${f(V("sesame"))}/>`; }).join("") : "");
  }
  function tortilla() {
    return `<circle cx="100" cy="100" r="94" ${f(V("tortilla"))}/>` +
      Array.from({ length: 22 }, (_, k) => { const r = rng(k + 900); const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 84; return `<ellipse cx="${100 + Math.cos(a) * d}" cy="${100 + Math.sin(a) * d}" rx="${3 + r() * 5}" ry="${2 + r() * 3}" ${f("#b8854a")} opacity=".45"/>`; }).join("") +
      `<path d="M8 100 L192 100" style="stroke:#b8854a;stroke-width:1.5;stroke-dasharray:5 5;opacity:.6"/>`;
  }

  /* ── Бумага: надписи «Воппер» и «Ангус / Биг Кинг», логотип ближе к себе ── */
  function paper(opts) {
    const o = Object.assign({ w: 200, h: 200 }, opts);
    return svg(`0 0 ${o.w} ${o.h}`, `
      <rect x="4" y="4" width="${o.w - 8}" height="${o.h - 8}" rx="4" ${fs(V("paper"), "rgba(61,35,20,.12)", 1.5)}/>
      ${Array.from({ length: 14 }, (_, k) => `<path d="M${10 + k * 14} 8 L${4 + k * 14} ${o.h - 8}" style="stroke:rgba(61,35,20,.04);stroke-width:5"/>`).join("")}
      <path d="M16 44 L184 44" style="stroke:${P("brown")};stroke-width:1.5;stroke-dasharray:6 4"/>
      <text x="100" y="38" text-anchor="middle" font-size="12" font-weight="700" font-family="Flame, Golos Text, sans-serif" ${f(P("brown"))}>ВОППЕР</text>
      <path d="M16 76 L184 76" style="stroke:${P("brown")};stroke-width:1.5;stroke-dasharray:6 4"/>
      <text x="100" y="70" text-anchor="middle" font-size="12" font-weight="700" font-family="Flame, Golos Text, sans-serif" ${f(P("brown"))}>АНГУС / БИГ КИНГ</text>
      ${bkLogo(100, 150, 58)}
      <text x="100" y="192" text-anchor="middle" font-size="7" ${f("rgba(61,35,20,.55)")}>край к себе</text>`);
  }

  /* ════════════════════════════════════════════════════════════════════
     УПАКОВКИ
     type: angus | pita | bigking | whopper | alafrance | whopperOld
     view: "front" (лицо, маркировки не видно) | "marks" (сторона с маркировкой)
     marks: [{kind:"flap"|"sticker"|"icon"|"mod"|"side", key, label}]
     zoom: подписи крупно и читаемо
     ════════════════════════════════════════════════════════════════════ */
  const FLAP_COLORS = {
    "Новинка": P("purple"), "Белые грибы": P("blue"), "Острый": P("red"), "Пармезан": P("grey"),
    "4 сыра": P("orange"), "Гриль": P("brown"), "Сезонный": "#2f7d4a", "Классика": P("yellow"),
    "Звезда": P("yellow"), "Двойная котлета": P("brown"), "Тройная котлета": P("brown"), "Сыр": P("orange"),
  };
  const PACK_LAYOUT = {
    angus:   { title: "АНГУС", body: P("angus"), accent: "#c9a46a", flaps: ["Сезонный", "Классика"], icons: ["Двойная котлета"], sticker: true },
    bigking: { title: "БИГ КИНГ", body: P("bk"), accent: "#ffffff", flaps: ["Звезда", "Классика"], mods: ["Сыр", "Хрустящий лук", "Томаты"], sticker: true },
    whopper: { title: "ТВОЙ ОСОБЕННЫЙ ВОППЕР", body: P("beige"), accent: P("brown"), flaps: ["Новинка", "Белые грибы", "Острый", "Пармезан", "4 сыра", "Гриль"], icons: ["Двойная котлета", "Тройная котлета", "Сыр"] },
    whopperOld: { title: "ВОППЕР", body: P("orange"), accent: "#fff", flaps: ["Сезонный"] },
    pita:    { title: "ПИТА", body: P("orange"), accent: "#fff", flaps: ["Сезонный", "Классика"], side: true },
  };

  function pack(type, opts) {
    const o = Object.assign({ view: "front", marks: [], zoom: false }, opts);
    const L = PACK_LAYOUT[type];
    const has = (label) => o.marks.some(m => m.label === label);
    if (type === "alafrance") {
      return svg("0 0 200 200", `
        <ellipse cx="100" cy="170" rx="70" ry="10" ${f("rgba(61,35,20,.15)")}/>
        <path d="M34 90 C34 50 166 50 166 90 L160 160 C140 172 60 172 40 160 Z" style="fill:${V("paper")};stroke:rgba(61,35,20,.2);stroke-width:2"/>
        <path d="M40 96 C80 120 120 120 160 96" style="fill:none;stroke:rgba(61,35,20,.2);stroke-width:2"/>
        ${bkLogo(100, 130, 46)}`);
    }

    /* ── Лицевая сторона: закрытая упаковка, вид 3/4 сверху ──────────── */
    if (o.view === "front") {
      const lid = type === "whopper" ? P("beige") : L.body;     // крышка
      const side = type === "whopper" ? P("orange") : L.body;   // бока
      const dark = "rgba(0,0,0,.16)";
      if (type === "pita") {
        // пита: плоская коробка-лодочка с откидной крышкой
        return svg("0 0 200 200", `
          <ellipse cx="100" cy="172" rx="76" ry="9" ${f("rgba(61,35,20,.18)")}/>
          <path d="M26 92 L100 64 L174 92 L174 140 L100 168 L26 140 Z" ${f(P("orange"))}/>
          <path d="M26 92 L100 120 L174 92 L100 64 Z" ${f("#ff9028")}/>
          <path d="M26 92 L100 120 L100 168 L26 140 Z" ${f(dark)}/>
          <g transform="translate(32 146) scale(0.34 0.06)" opacity=".5">${flames(200, 200, P("flame"), 4)}</g>
          ${bkLogo(100, 92, 44)}
          <text x="100" y="140" text-anchor="middle" font-size="9" font-weight="700" font-family="Flame, Golos Text, sans-serif" ${f("rgba(255,255,255,.9)")}>ПИТА</text>`);
      }
      const title = L.title.length > 10 ? L.title.split(" ").slice(-1)[0] : L.title;
      return svg("0 0 200 200", `
        <ellipse cx="100" cy="178" rx="78" ry="9" ${f("rgba(61,35,20,.2)")}/>
        <!-- корпус -->
        <path d="M24 108 L100 132 L176 108 L176 152 Q176 158 170 161 L104 182 Q100 183 96 182 L30 161 Q24 158 24 152 Z" ${f(side)}/>
        <path d="M24 108 L100 132 L100 183 L24 152 Z" ${f(dark)}/>
        <!-- крышка -->
        <path d="M24 78 Q24 72 30 70 L96 48 Q100 47 104 48 L170 70 Q176 72 176 78 L176 106 L100 130 L24 106 Z" ${f(lid)}/>
        <path d="M24 78 L100 102 L176 78 L100 54 Z" ${f(type === "whopper" ? "#f6ece2" : "rgba(255,255,255,.08)")}/>
        <path d="M24 78 L100 102 L100 130 L24 106 Z" ${f("rgba(0,0,0,.1)")}/>
        <!-- щель между крышкой и корпусом -->
        <path d="M24 106 L100 130 L176 106" style="fill:none;stroke:rgba(0,0,0,.28);stroke-width:2"/>
        ${type === "angus" ? "" : `<g transform="translate(26 156) scale(0.37 0.09)" opacity=".55">${flames(200, 200, P("orange"), type.length)}</g>`}
        ${bkLogo(100, 150, 42)}
        <text x="100" y="84" text-anchor="middle" font-size="${title.length > 7 ? 11 : 14}" font-weight="700"
              font-family="Flame, Golos Text, sans-serif" ${f(type === "whopper" ? P("brown") : L.accent)}>${title}</text>`);
    }

    /* ── Сторона с маркировкой: крышка сверху ────────────────────────── */
    const onWhite = type === "whopper" || type === "pita";
    const ink = onWhite ? P("brown") : "#fff";
    const lbl = (x, y, text, size) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size || (o.zoom ? 8.5 : 7)}"
      font-weight="700" ${f(ink)} opacity="${o.zoom ? 1 : .92}">${text}</text>`;
    // клапан: продавленный — вдавленный кружок с галочкой
    const flap = (x, y, label, r) => {
      const on = has(label);
      r = r || (o.zoom ? 13 : 11);
      const c = FLAP_COLORS[label] || P("grey");
      return `<g>
        <circle cx="${x}" cy="${y}" r="${r + 3.5}" style="fill:none;stroke:${onWhite ? "rgba(91,51,38,.5)" : "rgba(255,255,255,.55)"};stroke-width:1.4;stroke-dasharray:2.5 2"/>
        <circle cx="${x}" cy="${y}" r="${r}" ${f(c)}/>
        ${on ? `<circle cx="${x}" cy="${y}" r="${r}" ${f("rgba(0,0,0,.45)")}/>
                <circle cx="${x}" cy="${y - r * 0.18}" r="${r * 0.82}" style="fill:none;stroke:rgba(0,0,0,.35);stroke-width:${r * 0.3}"/>
                <path d="M${x - r * 0.42} ${y} l${r * 0.3} ${r * 0.34} l${r * 0.6} -${r * 0.68}"
                      style="fill:none;stroke:#fff;stroke-width:${r * 0.24};stroke-linecap:round;stroke-linejoin:round"/>` : ""}
        ${lbl(x, y + r + (o.zoom ? 13 : 11), label.toUpperCase())}
      </g>`;
    };
    const tab = (x, y, label, w, h) => {              // язычок: двойная/тройная котлета, сыр
      const on = has(label);
      w = w || (o.zoom ? 32 : 28); h = h || (o.zoom ? 24 : 21);
      return `<g>
        <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="5"
          style="fill:${on ? P("brown") : "rgba(255,255,255,.9)"};stroke:${P("brown")};stroke-width:1.6;stroke-dasharray:${on ? "0" : "3 2"}"/>
        ${iconGlyph(label, x, y, on ? "#fff" : P("brown"))}
        ${lbl(x, y + h / 2 + (o.zoom ? 11 : 9), label === "Сыр" ? "СЫР" : label.split(" ")[0].toUpperCase(), o.zoom ? 7 : 6)}
      </g>`;
    };
    const sticker = () => has("Остро")
      ? `<g transform="rotate(-11 152 66)">
           <rect x="122" y="52" width="60" height="27" rx="6" style="fill:${P("red")};stroke:#fff;stroke-width:2.5"/>
           <text x="152" y="71" text-anchor="middle" font-size="13" font-weight="700" font-family="Flame, Golos Text, sans-serif" ${f("#fff")}>ОСТРО</text>
         </g>` : "";
    // корпус крышки: подложка + фаска по краю
    const shell = (fill, inner) => `
      <rect x="8" y="8" width="184" height="184" rx="16" ${f(fill)}/>
      <rect x="8" y="8" width="184" height="184" rx="16" style="fill:none;stroke:rgba(0,0,0,.18);stroke-width:2"/>
      <rect x="18" y="18" width="164" height="164" rx="11" ${f(inner)}/>`;

    let body = "";
    if (type === "whopper") {
      body += shell(P("orange"), P("beige"));
      body += `<g transform="translate(18 174) scale(0.82 0.07)" opacity=".5">${flames(200, 200, P("flame"), 3)}</g>
        <text x="100" y="104" text-anchor="middle" font-size="7.5" font-weight="700" font-family="Flame, Golos Text, sans-serif" ${f(P("brown"))}>ТВОЙ ОСОБЕННЫЙ</text>
        <text x="100" y="121" text-anchor="middle" font-size="13" font-weight="700" font-family="Flame, Golos Text, sans-serif" ${f(P("brown"))}>ВОППЕР</text>`;
      body += flap(66, 42, "Новинка") + flap(134, 42, "Белые грибы");
      const sideFlap = (x, y, label, right) => {
        const on = has(label), c = FLAP_COLORS[label] || P("grey"), r = 8;
        return `<g>
          <circle cx="${x}" cy="${y}" r="${r + 3}" style="fill:none;stroke:rgba(91,51,38,.45);stroke-width:1.2;stroke-dasharray:2.5 2"/>
          <circle cx="${x}" cy="${y}" r="${r}" ${f(c)}/>
          ${on ? `<circle cx="${x}" cy="${y}" r="${r}" ${f("rgba(0,0,0,.45)")}/>
                  <path d="M${x - 3.4} ${y} l2.4 2.8 l5 -5.6" style="fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"/>` : ""}
          <text x="${right ? x - r - 5 : x + r + 5}" y="${y + 3}" text-anchor="${right ? "end" : "start"}"
                font-size="${o.zoom ? 7 : 6}" font-weight="700" ${f(P("brown"))}>${label.toUpperCase()}</text>
        </g>`;
      };
      body += sideFlap(30, 78, "Острый") + sideFlap(30, 134, "Пармезан") +
              sideFlap(170, 78, "4 сыра", true) + sideFlap(170, 134, "Гриль", true);
      body += tab(54, 156, "Двойная котлета", 26, 19) + tab(100, 156, "Тройная котлета", 26, 19) + tab(146, 156, "Сыр", 26, 19);
    } else if (type === "whopperOld") {
      body += shell(P("orange"), P("orange"));
      body += `${bkLogo(100, 80, 74)}
        <g transform="translate(18 140) scale(0.82 0.24)">${flames(200, 200, P("flame"), 5)}</g>`;
      body += flap(100, 148, "Сезонный");
    } else if (type === "pita") {
      // две створки крышки: одна с надписью «Остро», другая чистая
      const spicy = o.marks.some(m => m.kind === "side" && m.key === "spicy");
      body += `<rect x="8" y="16" width="184" height="150" rx="14" ${f(P("orange"))}/>
        <rect x="8" y="16" width="184" height="150" rx="14" style="fill:none;stroke:rgba(0,0,0,.18);stroke-width:2"/>
        <path d="M100 16 V166" style="stroke:rgba(0,0,0,.25);stroke-width:2;stroke-dasharray:5 4"/>
        <g transform="translate(12 140) scale(0.84 0.09)" opacity=".55">${flames(200, 200, P("flame"), 9)}</g>`;
      body += spicy
        ? `<g transform="rotate(-8 54 76)"><rect x="18" y="58" width="72" height="34" rx="7" style="fill:${P("red")};stroke:#fff;stroke-width:2.5"/>
             <text x="54" y="82" text-anchor="middle" font-size="17" font-weight="700" font-family="Flame, Golos Text, sans-serif" ${f("#fff")}>ОСТРО</text></g>`
        : bkLogo(54, 76, 56);
      body += `<text x="148" y="72" text-anchor="middle" font-size="7.5" font-weight="700" ${f("rgba(255,255,255,.9)")}>СТОРОНА</text>
        <text x="148" y="84" text-anchor="middle" font-size="7.5" font-weight="700" ${f("rgba(255,255,255,.9)")}>БЕЗ НАДПИСИ</text>`;
      // торец с клапанами: кружок и подпись в строку
      body += `<rect x="8" y="150" width="184" height="42" rx="8" ${f(P("brown"))}/>
        <text x="18" y="164" font-size="7" font-weight="700" ${f("rgba(255,255,255,.65)")}>ТОРЕЦ УПАКОВКИ</text>`;
      [["Сезонный", 40], ["Классика", 118]].forEach(([label, x]) => {
        const on = has(label), c = FLAP_COLORS[label] || P("grey");
        body += `<circle cx="${x}" cy="178" r="9" ${f(c)}/>
          ${on ? `<circle cx="${x}" cy="178" r="9" ${f("rgba(0,0,0,.45)")}/>
                  <path d="M${x - 4} 178 l3 3.5 l6 -7" style="fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round"/>` : ""}
          <text x="${x + 14}" y="181" font-size="7.5" font-weight="700" ${f("#fff")}>${label.toUpperCase()}</text>`;
      });
    } else {
      // Ангус / Биг Кинг: крышка кламшелла
      body += shell(L.body, "rgba(255,255,255,.06)");
      body += `${type === "angus" ? "" : `<g transform="translate(18 174) scale(0.82 0.07)" opacity=".5">${flames(200, 200, P("orange"), type.length)}</g>`}
        <text x="100" y="58" text-anchor="middle" font-size="${L.title.length > 6 ? 18 : 22}" font-weight="700"
              font-family="Flame, Golos Text, sans-serif" ${f(L.accent)}>${L.title}</text>`;
      L.flaps.forEach((label, i) => { body += flap(58 + i * 84, 100, label); });
      if (L.icons) L.icons.forEach((label) => { body += tab(100, 146, label); });
      if (L.mods) {
        const mod = o.marks.find(m => m.kind === "mod");
        L.mods.forEach((label, i) => {
          const x = 44 + i * 56, y = 146, on = mod && mod.label === label;
          body += `<circle cx="${x}" cy="${y}" r="${o.zoom ? 13 : 11}"
              style="fill:${on ? "#fff" : "rgba(255,255,255,.12)"};stroke:rgba(255,255,255,.8);stroke-width:1.6"/>
            <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="${o.zoom ? 15 : 13}" font-weight="700"
              ${f(on ? P("bk") : "rgba(255,255,255,.8)")}>${on ? (mod.key === "minus" ? "−" : "+") : "·"}</text>
            ${lbl(x, y + (o.zoom ? 26 : 24), label.toUpperCase(), o.zoom ? 6.5 : 5.5)}`;
        });
      }
    }
    body += sticker();
    return svg("0 0 200 200", body);
  }
  function iconGlyph(label, x, y, color) {
    if (label === "Сыр") return `<path d="M${x - 8} ${y + 5} L${x + 8} ${y + 5} L${x + 8} ${y - 1} L${x - 8} ${y - 6} Z" style="fill:${color}"/>`;
    const n = label.startsWith("Тройная") ? 3 : 2;
    return Array.from({ length: n }, (_, i) => `<rect x="${x - 9}" y="${y - 7 + i * (14 / n) + (n === 2 ? 2 : 0)}" width="18" height="${n === 3 ? 3 : 4}" rx="1.5" style="fill:${color}"/>`).join("");
  }

  /* ── Упаковка-иконка для выбора (витрина «перед сотрудником») ────── */
  function packChoice(type) {
    if (type === "alafrance") return pack("alafrance");
    return pack(type, { view: "front" });
  }

  // Рендер по имени для слотов: "ing:sauceM", "pack:angus", "choice:alafrance", "paper", "porcini"
  window.GBArtRender = function (name) {
    const [kind, arg] = name.split(":");
    if (kind === "ing") return ING_ART[arg] ? ING_ART[arg]() : "";
    if (kind === "pack") return pack(arg, { view: "front" });
    if (kind === "choice") return packChoice(arg);
    if (kind === "paper") return paper();
    if (kind === "lid") { const [, type, label] = name.split(":"); return pack(type, { view: "marks", zoom: true, marks: label ? [{ kind: "flap", label }] : [] }); }
    if (kind === "porcini") return porcini();
    return "";
  };

  window.GBArt = { porcini, leaf, oakLeaf, bkLogo, flames, ING_ART, layerArt, patty, bun, tortilla, paper, pack, packChoice, FLAP_COLORS, svg, rng };
})();
