/* ════════════════════════════════════════════════════════════════════════
   ГРИБНАЯ ЛИНЕЙКА · 3D-УПАКОВКА «ТВОЙ ОСОБЕННЫЙ ВОППЕР»
   ────────────────────────────────────────────────────────────────────────
   Модель собрана в Blender из развёртки pack/CURVE_SPECIAL-CLAMSHELL…pdf
   (blender/build_clamshell.py) и лежит в assets/3d/clamshell.glb.js (base64 —
   так она грузится и по file://, и в LMS). three.js — локальная сборка
   js/vendor/gb-three.min.js. Всё подгружается лениво, когда блок рядом.

   Что умеет:
     • крутить коробку пальцем/мышкой, приближать щипком/колёсиком;
     • тап по клапану — продавить/вернуть (или кнопки-чипы под моделью);
     • «Открыть крышку»;
     • шаги-экскурсия: камера подлетает к нужному месту;
     • задание «продави „Белые грибы“ сам» → KU.progress.markDone("pack-3d").
   Без WebGL показывается статичный рендер.

   Шарниры в GLB: узлы «*_hinge» с extras press_angle / open_angle —
   поворот вокруг локальной X поверх исходного положения.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const THREE_SRC = "js/vendor/gb-three.min.js";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const icon = (id, cls) => `<svg class="ku-ico ${cls || ""}"><use href="#${id}"/></svg>`;

  /* ── Настройки моделей ─────────────────────────────────────────────
     steps(api) — действия шагов экскурсии; api: flaps, setPressed, setLid,
     flyTo, viewFlap, center, R, THREE, home, pressOnly(k) */
  const MODELS = {
    clamshell: {
      script: "assets/3d/clamshell.glb.js", glbVar: "GB_CLAMSHELL_GLB",
      flapOrder: ["novinka", "belye_griby", "ostryi", "parmezan", "4syra", "gril", "double", "triple", "cheese"],
      radio: [["novinka", "belye_griby", "ostryi", "parmezan", "4syra", "gril"], ["double", "triple"]],   // «Сыр» — отдельно
      homeDir: [-0.55, 0.62, 1], homeDist: 3.3,
      chipView: (k) => ["double", "triple", "cheese"].includes(k) ? [2.2, 0.35] : [2.1, 0.85],
      steps: (a) => [
        () => { a.setLid(false); a.pressOnly("belye_griby"); a.viewFlap("belye_griby", 2.1, 0.85); },      // что изменилось
        () => { a.pressOnly(null); a.setLid(false); const h = a.home(); a.flyTo(h.pos, h.target, 1000); }, // сначала старая
      ],
      mission: {
        key: "belye_griby", step: 0, doneId: "pack-3d", fb: "fb-pack3d",
        view: (a) => a.flyTo(a.center.clone().add(new a.THREE.Vector3(0.35, 0.8, -1).normalize().multiplyScalar(a.R * 3.2)), a.center.clone(), 1000),
        prompt: "Найди на коробке клапан «Белые грибы» и нажми на него. Коробку можно крутить.",
        wrong: (label) => `Это «${label}». Поищи клапан с подписью «Белые грибы» — он на ребре крышки, со стороны шарнира.`,
        right: "<strong>Есть!</strong> Клапан «Белые грибы» продавлен — кассир увидит вкус сразу.",
      },
    },
    roll: {
      script: "assets/3d/roll.glb.js", glbVar: "GB_ROLL_GLB",
      flapOrder: ["parmezan", "gril", "4syra", "ostryi", "belye_griby", "novinka"],
      radio: [["parmezan", "gril", "4syra", "ostryi", "belye_griby", "novinka"]],
      homeDir: [-0.6, 0.3, 1], homeDist: 3.4,
      headlight: 0.9,                                   // грани ролла узкие: подсветка от камеры, чтобы боковое ребро не уходило в тень
      chipView: () => [2, 0.15],
      steps: (a) => [
        () => { a.pressOnly("belye_griby"); a.viewFlap("belye_griby", 2, 0.15); },                          // что изменилось
        () => { a.pressOnly(null); const h = a.home(); a.flyTo(h.pos, h.target, 1000); },                   // сначала старая
      ],
      mission: {
        key: "belye_griby", step: 0, doneId: "pack-3d-roll", fb: "fb-pack3d-roll",
        view: (a) => { const h = a.home(); a.flyTo(h.pos, h.target, 1000); },
        prompt: "Найди на упаковке ролла клапан «Белые грибы» и нажми на него. Упаковку можно крутить.",
        wrong: (label) => `Это «${label}». Клапаны вкусов — столбиком на боковом ребре. «Белые грибы» — второй снизу.`,
        right: "<strong>Есть!</strong> Клапан «Белые грибы» на ролле продавлен.",
      },
    },
    bigking: {
      script: "assets/3d/bigking.glb.js", glbVar: "GB_BIGKING_GLB",
      flapOrder: ["klassika", "zvezda"],
      radio: [["klassika", "zvezda"]],
      homeDir: [-0.75, 0.45, 1], homeDist: 3.2,
      chipView: () => [2.4, 0.15],
      steps: (a) => [
        () => a.flyTo(a.center.clone().add(new a.THREE.Vector3(0.3, -0.9, 0.5).normalize().multiplyScalar(a.R * 2.9)),
                      a.center.clone().add(new a.THREE.Vector3(0, -a.R * 0.5, 0)), 1000),                // дно
        () => { const h = a.home(); a.flyTo(h.pos, h.target, 1000); },                                   // окно: как стоит сэндвич
        () => a.flyTo(a.center.clone().add(new a.THREE.Vector3(-0.5, 0.1, 1).normalize().multiplyScalar(a.R * 2.1)),
                      a.center.clone().add(new a.THREE.Vector3(0, -a.R * 0.32, 0)), 1000),               // клапаны и время
      ],
      mission: {
        key: "zvezda", step: 2, doneId: "pack-3d-bk", fb: "fb-pack3d-bk",
        view: (a) => a.viewFlap("zvezda", 2.4, 0.15),
        prompt: "Найди на коробке клапан «Звезда» и продави его. Коробку можно крутить.",
        wrong: (label) => `Это «${label}». Биг Кинг Белые грибы отмечают клапаном «Звезда» — он справа от «Классики».`,
        right: "<strong>Есть!</strong> Клапан «Звезда» продавлен — так отмечают Биг Кинг Белые грибы.",
      },
    },
    angus: {
      script: "assets/3d/angus.glb.js", glbVar: "GB_ANGUS_GLB",
      flapOrder: ["klassika", "sezonnyi"],
      radio: [["klassika", "sezonnyi"]],
      homeDir: [0.75, 0.45, -1], homeDist: 3.4,        // лицевая сторона — та, где маркировка
      chipView: () => [2.9, 0.12],
      steps: (a) => [
        () => { const h = a.home(); a.flyTo(h.pos, h.target, 1000); },                                   // как закрывается
        () => a.flyTo(a.center.clone().add(new a.THREE.Vector3(0.5, 0.2, -1).normalize().multiplyScalar(a.R * 3.0)),
                      a.center.clone().add(new a.THREE.Vector3(0, -a.R * 0.15, 0)), 1000),              // клапаны маркировки
      ],
      mission: {
        key: "sezonnyi", step: 1, doneId: "pack-3d-angus", fb: "fb-pack3d-angus",
        view: (a) => a.viewFlap("sezonnyi", 2.9, 0.12),
        prompt: "Найди на коробке клапан «Сезонный» и продави его. Коробку можно крутить.",
        wrong: (label) => `Это «${label}». Ангус Белые грибы отмечают клапаном «Сезонный» — он справа, у дальнего ребра.`,
        right: "<strong>Есть!</strong> Клапан «Сезонный» продавлен — так отмечают Ангус Белые грибы.",
      },
    },
    pita: {
      script: "assets/3d/pita.glb.js", glbVar: "GB_PITA_GLB",
      flapOrder: ["klassika", "sezonnyi"],
      radio: [["klassika", "sezonnyi"]],
      homeDir: [1, 0.45, 0.6], homeDist: 3.6,          // разворот к узкой грани с клапанами
      chipView: () => [2.6, 0.1],
      steps: (a) => [
        () => { const h = a.home(); a.flyTo(h.pos, h.target, 1000); },                                   // как собран пакет
        () => a.flyTo(a.center.clone().add(new a.THREE.Vector3(1, 0.2, 0.3).normalize().multiplyScalar(a.R * 2.8)),
                      a.center.clone().add(new a.THREE.Vector3(0, -a.R * 0.05, 0)), 1000),             // клапаны маркировки
      ],
      mission: {
        key: "sezonnyi", step: 1, doneId: "pack-3d-pita", fb: "fb-pack3d-pita",
        view: (a) => a.viewFlap("sezonnyi", 2.6, 0.1),
        prompt: "Найди на узкой грани клапан «Сезонный» и продави его. Упаковку можно крутить.",
        wrong: (label) => `Это «${label}». Ангус Пита Белые грибы отмечают клапаном «Сезонный» — он ниже «Классики».`,
        right: "<strong>Есть!</strong> Клапан «Сезонный» продавлен — так отмечают Ангус Пита Белые грибы.",
      },
    },
  };

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[data-gb-src="${src}"]`)) return res();
      const s = document.createElement("script");
      s.src = src; s.async = true; s.dataset.gbSrc = src;
      s.onload = res; s.onerror = () => rej(new Error("Не загрузился " + src));
      document.head.appendChild(s);
    });
  }
  function hasWebGL() {
    try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
    catch (e) { return false; }
  }

  function init(root) {
    if (root.dataset.gbReady) return;
    root.dataset.gbReady = "1";
    const cfg = MODELS[root.dataset.model || "clamshell"];
    const stage = $(".gb-3d__stage", root);
    if (!cfg || !hasWebGL()) { stage.classList.add("is-fallback"); return; }
    stage.classList.add("is-loading");
    [THREE_SRC, cfg.script].reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve())
      .then(() => start(root, cfg))
      .catch((e) => { console.warn(e); stage.classList.remove("is-loading"); stage.classList.add("is-fallback"); });
  }

  function start(root, cfg) {
    const { THREE, GLTFLoader, OrbitControls } = window.GBThree;
    const stage = $(".gb-3d__stage", root);
    const tip = $(".gb-3d__tip", root);

    /* ── Рендерер, сцена, свет ─────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;          // фирменные цвета принта без искажений
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "gb-3d__canvas";
    stage.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x9a7a5c, 1.9));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.radius = 6;
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight(0xfff1e0, 0.7);
    scene.add(fill);
    const head = cfg.headlight ? new THREE.DirectionalLight(0xfff6ea, cfg.headlight) : null;
    if (head) scene.add(head, head.target);

    /* ── Модель ────────────────────────────────────────────────────── */
    const bin = atob(window[cfg.glbVar]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    new GLTFLoader().parse(bytes.buffer, "", (gltf) => {
      const model = gltf.scene;
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true;
          const m = o.material;
          if (m && m.map) { m.map.anisotropy = maxAniso; m.map.needsUpdate = true; }
        }
      });
      // центрируем: середина по X/Z в нуле, дно на y = 0
      const box = new THREE.Box3().setFromObject(model);
      const c = box.getCenter(new THREE.Vector3());
      model.position.set(-c.x, -box.min.y, -c.z);
      scene.add(model);
      model.updateMatrixWorld(true);
      setup(model, box.getSize(new THREE.Vector3()));
    }, (err) => { console.warn(err); stage.classList.remove("is-loading"); stage.classList.add("is-fallback"); });

    function setup(model, size) {
      const R = size.length() / 2;
      const center = new THREE.Vector3(0, size.y / 2, 0);

      // тень на «столе»
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(R * 12, R * 12), new THREE.ShadowMaterial({ opacity: 0.16 }));
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
      scene.add(ground);
      key.position.set(-R * 1.6, R * 3.2, R * 2.2); key.target.position.copy(center);
      const sc = key.shadow.camera; sc.left = sc.bottom = -R * 1.6; sc.right = sc.top = R * 1.6; sc.near = R * 0.5; sc.far = R * 8; sc.updateProjectionMatrix();
      fill.position.set(R * 2.5, R * 1.2, -R * 1.5);

      // шарниры
      const X = new THREE.Vector3(1, 0, 0);
      const qTmp = new THREE.Quaternion();
      const lidNode = model.getObjectByName("lid_back_hinge");
      const lid = lidNode ? { node: lidNode, q0: lidNode.quaternion.clone(), angle: lidNode.userData.open_angle || -2, t: 0, target: 0 } : null;
      const flaps = {};
      model.traverse((o) => {
        const ud = o.userData || {};
        if (ud.flap_key && typeof ud.press_angle === "number") {
          const f = flaps[ud.flap_key] || (flaps[ud.flap_key] = { key: ud.flap_key, label: ud.flap_key, hinges: [], meshes: [], t: 0, target: 0 });
          f.hinges.push({ node: o, q0: o.quaternion.clone(), angle: ud.press_angle });
        }
        if (ud.flap_key && ud.flap_label) {
          const f = flaps[ud.flap_key] || (flaps[ud.flap_key] = { key: ud.flap_key, label: ud.flap_label, hinges: [], meshes: [], t: 0, target: 0 });
          f.label = ud.flap_label; f.meshes.push(o);
        }
      });
      // для тапа берём ВСЕ поверхности коробки: клапан засчитывается, только если он ближе всего
      const pickables = [];
      model.traverse((o) => { if (o.isMesh) pickables.push(o); });

      function flapCenter(k) {
        const b = new THREE.Box3();
        flaps[k].meshes.forEach((m) => b.expandByObject(m));
        return b.getCenter(new THREE.Vector3());
      }

      // камера и управление
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.minDistance = R * 1.2; controls.maxDistance = R * 6;
      controls.rotateSpeed = 0.8; controls.zoomSpeed = 0.7;
      controls.autoRotate = !reduce; controls.autoRotateSpeed = 1.1;
      controls.target.copy(center);
      const home = () => ({ pos: center.clone().add(new THREE.Vector3(...cfg.homeDir).normalize().multiplyScalar(R * cfg.homeDist)), target: center.clone() });
      const h0 = home(); camera.position.copy(h0.pos); controls.update();

      let camTween = null;
      function flyTo(pos, target, ms) {
        controls.autoRotate = false;
        if (reduce || !ms) { camera.position.copy(pos); controls.target.copy(target); controls.update(); return; }
        camTween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: performance.now(), ms };
      }
      function viewFlap(k, dist, up) {
        const C = flapCenter(k);
        const dir = C.clone().sub(center); dir.y = 0; dir.normalize(); dir.y = up; dir.normalize();
        flyTo(C.clone().add(dir.multiplyScalar(R * dist)), C, 900);
      }

      // Клапаны вкуса — радиокнопки: продавил один, соседние по группе отжимаются.
      // «Классика» и «Сезонный» (как и два вкуса на кламшелле) вместе не бывают.
      const radioOf = (k) => (cfg.radio || []).find((g) => g.includes(k)) || [];
      function setPressed(k, on) {
        if (!flaps[k]) return;
        if (on) radioOf(k).forEach((o) => { if (o !== k && flaps[o]) flaps[o].target = 0; });
        flaps[k].target = on ? 1 : 0;
        paintChips();
      }
      function setLid(open) { if (lid) { lid.target = open ? 1 : 0; paintTools(); } }

      /* ── Шаги-экскурсия ──────────────────────────────────────────── */
      const steps = [...root.querySelectorAll("[data-step]")];
      const pressOnly = (key) => Object.keys(flaps).forEach((k) => setPressed(k, k === key));
      const api = { flaps, setPressed, setLid, flyTo, viewFlap, center, R, THREE, home, pressOnly };
      const STEP_ACTIONS = cfg.steps(api);
      function goStep(i) {
        steps.forEach((s, j) => { s.classList.toggle("is-active", j === i); s.setAttribute("aria-current", j === i ? "step" : "false"); });
        stopMission();
        STEP_ACTIONS[i] && STEP_ACTIONS[i]();
      }
      steps.forEach((s, i) => s.addEventListener("click", (e) => {
        if (e.target.closest("[data-mission]")) return;
        goStep(i);
      }));

      /* ── Задание: продави «Белые грибы» сам ──────────────────────── */
      let mission = null;
      const missionBtn = root.querySelector("[data-mission]");
      const M = cfg.mission;                      // у модели без задания (например, коробка Биг Кинг) его нет
      const missionFb = M ? document.getElementById(M.fb) : null;
      function startMission() {
        if (!M) return;
        pressOnly(null); setLid(false);
        M.view(api);
        mission = M.key;
        stage.classList.add("is-mission");
        missionFb.className = "ku-feedback show"; missionFb.style.background = "var(--ku-surface)";
        missionFb.innerHTML = `<span>${M.prompt}</span>`;
      }
      function stopMission() { mission = null; stage.classList.remove("is-mission"); }
      if (missionBtn && M) missionBtn.addEventListener("click", (e) => { e.stopPropagation(); goStep(M.step); startMission(); });

      /* ── Чипы клапанов (доступно с клавиатуры) ───────────────────── */
      const chipsBox = root.querySelector(".gb-3d__chips");
      if (chipsBox) {
        chipsBox.innerHTML = cfg.flapOrder.filter((k) => flaps[k]).map((k) =>
          `<button type="button" class="gb-flap-chip" data-flap="${k}" aria-pressed="false"><span class="gb-flap-chip__dot"></span>${flaps[k].label}</button>`).join("");
        chipsBox.addEventListener("click", (e) => {
          const b = e.target.closest("[data-flap]"); if (!b) return;
          const k = b.dataset.flap;
          const on = flaps[k].target < 0.5;
          if (on) viewFlap(k, ...cfg.chipView(k));
          toggleFlap(k, on);
        });
      }
      function paintChips() {
        if (!chipsBox) return;
        chipsBox.querySelectorAll("[data-flap]").forEach((b) => {
          const on = flaps[b.dataset.flap].target > 0.5;
          b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on);
        });
      }
      function toggleFlap(k, on, fromTap) {
        setPressed(k, on);
        if (mission && on) {
          if (k === mission) {
            missionFb.className = "ku-feedback show correct"; missionFb.style.background = "";
            missionFb.innerHTML = `<span>${M.right}</span>`;
            stopMission();
            if (window.KU) window.KU.progress.markDone(M.doneId);
            if (window.GBShell && !reduce) burstIn(stage);
          } else {
            missionFb.className = "ku-feedback show incorrect"; missionFb.style.background = "";
            missionFb.innerHTML = `<span>${M.wrong(flaps[k].label)}</span>`;
            setTimeout(() => setPressed(k, false), 700);
          }
        }
      }

      /* ── Инструменты ─────────────────────────────────────────────── */
      const lidBtn = root.querySelector('[data-3d="lid"]');
      const resetBtn = root.querySelector('[data-3d="reset"]');
      function paintTools() {
        if (!lidBtn || !lid) return;
        lidBtn.innerHTML = lid.target ? `${icon("i-package")} Закрыть крышку` : `${icon("i-package")} Открыть крышку`;
        lidBtn.setAttribute("aria-pressed", !!lid.target);
      }
      if (lidBtn) lidBtn.addEventListener("click", () => setLid(!lid.target));
      if (resetBtn) resetBtn.addEventListener("click", () => goStep(0));
      paintTools(); paintChips();

      /* ── Тап по клапану и подсказка при наведении ────────────────── */
      const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
      function pick(ev) {
        const r = renderer.domElement.getBoundingClientRect();
        ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(pickables, false)[0];
        if (!hit) return null;
        let o = hit.object;
        while (o && !(o.userData && o.userData.flap_key)) o = o.parent;
        return o ? o.userData.flap_key : null;
      }
      let down = null, tipTimer = null;
      function showTip(ev, text) {
        const r = stage.getBoundingClientRect();
        tip.textContent = text;
        tip.style.left = (ev.clientX - r.left) + "px"; tip.style.top = (ev.clientY - r.top) + "px";
        tip.classList.add("is-show");
        clearTimeout(tipTimer); tipTimer = setTimeout(() => tip.classList.remove("is-show"), 1400);
      }
      renderer.domElement.addEventListener("pointerdown", (ev) => {
        down = { x: ev.clientX, y: ev.clientY, t: performance.now() };
        controls.autoRotate = false;
        stage.classList.add("is-touched");
      });
      renderer.domElement.addEventListener("pointerup", (ev) => {
        if (!down) return;
        const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
        const quick = performance.now() - down.t < 450;
        down = null;
        if (moved > 7 || !quick) return;
        const k = pick(ev);
        if (!k) return;
        const on = flaps[k].target < 0.5;
        toggleFlap(k, on, true);
        showTip(ev, (on ? "Продавлен: " : "") + flaps[k].label);
      });
      let hoverRaf = 0;
      renderer.domElement.addEventListener("pointermove", (ev) => {
        if (ev.pointerType !== "mouse" || down) return;
        if (hoverRaf) return;
        hoverRaf = requestAnimationFrame(() => {
          hoverRaf = 0;
          const k = pick(ev);
          renderer.domElement.style.cursor = k ? "pointer" : "grab";
          if (k) showTip(ev, flaps[k].label);
        });
      });

      /* ── Цикл: крутим, только когда блок видно ──────────────────── */
      let visible = true, raf = 0, last = performance.now();
      function resize() {
        const w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // в узком (портретном) окне держим горизонтальный охват как у кадра 4:3,4 — коробка не режется по бокам
        const REF = 1.18, BASE = 30;
        camera.fov = camera.aspect >= REF ? BASE
          : Math.min(58, 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(BASE / 2)) * REF / camera.aspect)));
        camera.updateProjectionMatrix();
      }
      new ResizeObserver(resize).observe(stage);
      resize();
      const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      function applyHinge(hg, t) {
        qTmp.setFromAxisAngle(X, hg.angle * t);
        hg.node.quaternion.copy(hg.q0).multiply(qTmp);
      }
      function frame(now) {
        raf = 0;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        const k = reduce ? 1 : Math.min(1, dt * 7);
        if (lid) { lid.t += (lid.target - lid.t) * k; applyHinge(lid, lid.t); }
        Object.values(flaps).forEach((f) => { f.t += (f.target - f.t) * (reduce ? 1 : Math.min(1, dt * 10)); f.hinges.forEach((hg) => applyHinge(hg, f.t)); });
        if (camTween) {
          const p = Math.min(1, (now - camTween.start) / camTween.ms), e = ease(p);
          camera.position.lerpVectors(camTween.p0, camTween.p1, e);
          controls.target.lerpVectors(camTween.t0, camTween.t1, e);
          if (p >= 1) camTween = null;
        }
        controls.update();
        if (head) { head.position.copy(camera.position); head.target.position.copy(controls.target); }
        renderer.render(scene, camera);
        if (visible && !document.hidden) raf = requestAnimationFrame(frame);
      }
      const kick = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };
      new IntersectionObserver((es) => { visible = es[0].isIntersecting && stage.offsetParent !== null; if (visible) { resize(); kick(); } }, { threshold: 0.01 }).observe(stage);
      document.addEventListener("visibilitychange", kick);
      document.addEventListener("gb:page", () => { resize(); kick(); });

      stage.classList.remove("is-loading");
      stage.classList.add("is-ready");
      kick();
      window.GBPack3D = window.GBPack3D || {};
      window.GBPack3D[root.dataset.model || "clamshell"] = { goStep, setPressed, setLid, flaps, startMission, camera, renderer };
    }
  }

  function burstIn(stage) {
    const b = document.createElement("div"); b.className = "gb-burst";
    const colors = ["var(--ku-brand)", "var(--ku-warning)", "var(--ku-success)", "var(--gb-pack-blue)"];
    for (let i = 0; i < 24; i++) {
      const el = document.createElement("i"); const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 140;
      el.style.setProperty("--tx", Math.cos(a) * d + "px"); el.style.setProperty("--ty", Math.sin(a) * d + "px");
      el.style.setProperty("--c", colors[i % colors.length]);
      b.appendChild(el);
    }
    stage.appendChild(b); setTimeout(() => b.remove(), 1000);
  }

  /* ── Ленивый старт: когда блок подъезжает к экрану ─────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".gb-3d[data-model]").forEach((root) => {
      const io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { io.disconnect(); init(root); }
      }, { rootMargin: "400px 0px" });
      io.observe(root);
      document.addEventListener("gb:page", (e) => { if (e.detail === "pack") setTimeout(() => { if (root.offsetParent) init(root); }, 200); });
    });
  });
})();
