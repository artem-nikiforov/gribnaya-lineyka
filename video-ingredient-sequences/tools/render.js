/* Рендер кадров секвенции: 640×1080 PNG, имена те же, что ждёт монтаж в Resolve.
   Запуск из папки video-ingredient-sequences:
     python3 -m http.server 8777 &   node tools/render.js
   Нужен puppeteer-core (npm i puppeteer-core) и установленный Google Chrome. */
const path = require("path");
const puppeteer = require("puppeteer-core");
const ROOT = path.resolve(__dirname, "..");
const manifest = require(path.join(ROOT, "manifest.json"));
const BASE = process.env.SEQ_URL || "http://localhost:8777/index.html";
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 640, height: 1080, deviceScaleFactor: 1 });
  for (const seq of manifest.sequences) {
    for (let step = 1; step <= seq.frames; step++) {
      await page.goto(`${BASE}?dish=${seq.id}&step=${step}&render=1`, { waitUntil: "networkidle0" });
      await page.waitForFunction(() => document.documentElement.dataset.ready === "1");
      const out = path.join(ROOT, seq.pattern.replace("%03d", String(step).padStart(3, "0")));
      const el = await page.$("#frame");
      await el.screenshot({ path: out });
      console.log(path.relative(ROOT, out));
    }
  }
  await browser.close();
})();
