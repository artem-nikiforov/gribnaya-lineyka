#!/usr/bin/env node
/* Собирает assets/PROMPTS.md из манифеста js/gb-assets.js.
   Запуск из папки курса:  node tools/build-prompts.js */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.resolve(__dirname, "..");
const code = fs.readFileSync(path.join(root, "js/gb-assets.js"), "utf8");
const ctx = { window: {}, document: { addEventListener() {}, documentElement: { classList: { add() {} } } } };
vm.runInNewContext(code, ctx);
const A = ctx.window.GBAssets.list;
const groups = [
  ["Обложка", (k) => k === "hero"],
  ["Глава 2 · Ингредиенты", (k) => k.startsWith("ingr-")],
  ["Глава 3 · Упаковка", (k) => k.startsWith("pack-")],
  ["Тренажёр «Повар»", (k) => k.startsWith("cook-") || k.startsWith("ing-") || k === "paper" || k.startsWith("box-")],
  ["Тренажёр «Кассир»", (k) => k.startsWith("cashier-")],
];
let md = `# Промты для картинок курса «Грибная линейка»

Файл собран автоматически из \`js/gb-assets.js\` — правь промты там и пересобирай: \`node tools/build-prompts.js\`.

**Как это работает.** Положи картинку ровно по пути из поля «Файл» — курс подхватит её сам, заглушка исчезнет. Пока файла нет, на месте картинки SVG-заглушка и кнопка «Промт».

**Эталонные фото.** Для ингредиентов тренажёра в проекте лежат фото сборки со станции: \`game_refs/angus/\` — строго вид сверху, обе половинки булочки на фирменной бумаге, по шагам (соус, майонез, котлета, сыр, грибы, салат, томаты). Цвет, форму и размер порции сверяй по ним, а не по стоковым картинкам бургеров.

**Общие требования:** WebP (или PNG — тогда поменяй расширение в \`gb-assets.js\`), размеры и прозрачность — как указано в промте, без текста поверх, кроме оговорённого.

`;
for (const [title, test] of groups) {
  md += `\n## ${title}\n`;
  for (const [key, a] of Object.entries(A)) {
    if (!test(key)) continue;
    const done = fs.existsSync(path.join(root, a.file));
    md += `\n### \`${key}\` — ${a.alt}${done ? " ✅ готово" : ""}\n\n- **Файл:** \`${a.file}\`${done ? " (файл уже лежит в курсе — промт не нужен)" : ""}\n- **Пропорции:** ${a.ratio}\n\n${a.prompt}\n`;
  }
}
fs.writeFileSync(path.join(root, "assets/PROMPTS.md"), md);
console.log("assets/PROMPTS.md —", Object.keys(A).length, "картинок");
