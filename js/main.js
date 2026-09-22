/* =========================================================
   PROYECTO FLOR PRIMAVERAL — main.js
   ---------------------------------------------------------
   Ideas clave que puedes aprender de aquí:
   1) Cuerda "Verlet": simulamos el cordón como una cadena de
      puntos. Cada punto recuerda su posición anterior; la
      diferencia entre "ahora" y "antes" ES su velocidad. Así
      la gravedad y el rebote salen gratis, sin fórmulas raras.
   2) Restricciones de distancia: mantenemos fija la separación
      entre puntos vecinos para que parezca una cuerda tensa.
   3) Transición por "cortina de luz": al jalar lo suficiente,
      encendemos la lámpara, expandimos un destello radial y,
      con el brillo cubriendo la pantalla, cambiamos de escena.
   ========================================================= */

(() => {
  "use strict";

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- referencias del DOM ---------- */
  const scenesEl = document.getElementById("scenes");
  const scenes   = [...scenesEl.querySelectorAll(".scene")];
  const lamp     = document.getElementById("lamp");
  const flash    = document.getElementById("flash");
  const hint     = document.getElementById("hint");
  const dotsWrap = document.getElementById("dots");
  const canvas   = document.getElementById("ropeCanvas");
  const ctx      = canvas.getContext("2d");

  let current = 0;
  let transitioning = false;

  /* ---------- puntitos de progreso ---------- */
  scenes.forEach(() => dotsWrap.insertAdjacentHTML("beforeend", "<i></i>"));
  const dots = [...dotsWrap.children];
  const paintDots = () => dots.forEach((d, i) => d.classList.toggle("on", i === current));
  paintDots();

  /* =========================================================
     1) CONSTRUIR EL RAMO (escena 1)
     ========================================================= */
  (function buildBouquet() {
    const bq = document.getElementById("bouquet");
    if (!bq) return;
    const flowers = [
      { x:50, b:96,  size:132, stem:170, tilt:0,   swing:3,  d:0,  spin:30, c:"#ffd12e", deep:"#f2a11c" },
      { x:26, b:74,  size:104, stem:132, tilt:-9,  swing:4,  d:.6, spin:24, c:"#ffde4d", deep:"#f5b125" },
      { x:74, b:74,  size:104, stem:132, tilt:9,   swing:-4, d:.3, spin:27, c:"#ffcf1c", deep:"#e89412" },
      { x:14, b:54,  size:86,  stem:100, tilt:-17, swing:5,  d:1.1,spin:22, c:"#ffe36b", deep:"#f6bb33" },
      { x:86, b:54,  size:86,  stem:100, tilt:17,  swing:-5, d:.9, spin:25, c:"#ffd83a", deep:"#efa61a" },
    ];
    const PETALS = 12;
    flowers.forEach(f => {
      const wrap = document.createElement("div");
      wrap.className = "flower";
      wrap.style.left = f.x + "%";
      wrap.style.bottom = f.b + "px";
      wrap.style.marginLeft = -f.size / 2 + "px";
      wrap.style.setProperty("--tilt", f.tilt + "deg");
      wrap.style.setProperty("--swing", f.swing + "deg");
      wrap.style.setProperty("--d", f.d + "s");
      wrap.style.setProperty("--dur", (5 + f.d) + "s");

      const stem = document.createElement("div");
      stem.className = "stem";
      stem.style.setProperty("--stem", f.stem + "px");
      wrap.appendChild(stem);

      const head = document.createElement("div");
      head.className = "head";
      head.style.setProperty("--size", f.size + "px");
      head.style.setProperty("--d", f.d + "s");
      head.style.bottom = (f.stem - 8) + "px";

      const petals = document.createElement("div");
      petals.className = "petals";
      petals.style.setProperty("--spin", f.spin + "s");
      for (let i = 0; i < PETALS; i++) {
        const p = document.createElement("div");
        p.className = "petal";
        p.style.background = `linear-gradient(180deg, ${f.c}, ${f.deep})`;
        p.style.transform = `translate(-50%,-100%) rotate(${i * (360 / PETALS)}deg)`;
        petals.appendChild(p);
      }
      const core = document.createElement("div");
      core.className = "core";
      head.append(petals, core);
      wrap.appendChild(head);
      bq.appendChild(wrap);
    });
  })();

  /* =========================================================
     2) POLVO DE AMBIENTE (estrellitas cálidas flotando)
     ========================================================= */
  (function dust() {
    const c = document.getElementById("dust");
    const g = c.getContext("2d");
    let W, H, parts = [];
    const resize = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
    resize(); addEventListener("resize", resize);
    for (let i = 0; i < 46; i++) {
      parts.push({ x: Math.random()*innerWidth, y: Math.random()*innerHeight,
        r: Math.random()*1.6 + .4, s: Math.random()*.3 + .05, tw: Math.random()*Math.PI*2 });
    }
    (function loop() {
      g.clearRect(0,0,W,H);
      for (const p of parts) {
        p.y -= p.s; p.tw += .02;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random()*W; }
        g.globalAlpha = .3 + Math.sin(p.tw)*.3;
        g.fillStyle = "#ffe9bf";
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI*2); g.fill();
      }
      if (!reduce) requestAnimationFrame(loop);
    })();
  })();

  /* =========================================================
     3) LA CUERDA VERLET (el cordón de la lámpara)
     ========================================================= */
  const SEGMENTS = 14;          // cuántos puntos tiene la cuerda
  const SEG_LEN  = 12;          // separación en reposo (px)
  const GRAVITY  = 0.55;        // qué tan fuerte cae
  const FRICTION = 0.98;        // 1 = sin roce; <1 pierde energía
  const ITER     = 18;          // iteraciones de restricción por frame
  const PULL_THRESHOLD = 130;   // cuánto hay que estirar para "encender"

  let points = [];
  let anchor = { x: 0, y: 0 };  // de dónde cuelga (borde inferior de la pantalla)
  let dragging = false;
  let maxStretch = 0;           // estiramiento máximo alcanzado en un jalón

  function resizeCanvas() {
    canvas.width  = innerWidth;
    canvas.height = innerHeight;
    computeAnchor();
  }
  function computeAnchor() {
    // el cordón cuelga desde el borde inferior de la pantalla del foco
    const r = lamp.getBoundingClientRect();
    anchor.x = r.right - r.width * 0.30;   // un poco a la derecha del centro
    anchor.y = r.top   + r.height * 0.42;  // desde la falda de la pantalla
  }
  function initRope() {
    computeAnchor();
    points = [];
    for (let i = 0; i < SEGMENTS; i++) {
      points.push({ x: anchor.x, y: anchor.y + i * SEG_LEN,
                    ox: anchor.x, oy: anchor.y + i * SEG_LEN });
    }
  }
  resizeCanvas();
  initRope();
  addEventListener("resize", () => { resizeCanvas(); initRope(); });

  const knob = () => points[points.length - 1];

  /* --- integración de Verlet --- */
  function simulate() {
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      if (dragging && i === points.length - 1) continue; // el nudo lo manda el puntero
      const vx = (p.x - p.ox) * FRICTION;
      const vy = (p.y - p.oy) * FRICTION;
      p.ox = p.x; p.oy = p.y;
      p.x += vx;
      p.y += vy + GRAVITY;
    }
    // restricciones: el punto 0 está clavado en el ancla
    for (let k = 0; k < ITER; k++) {
      points[0].x = anchor.x; points[0].y = anchor.y;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const diff = (SEG_LEN - dist) / dist * 0.5;
        const ox = dx * diff, oy = dy * diff;
        if (i !== 0) { a.x -= ox; a.y -= oy; }
        b.x += ox; b.y += oy;
      }
    }
  }

  /* --- dibujar la cuerda + el nudo --- */
  function drawRope() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // cuerda
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const p = points[i], prev = points[i - 1];
      const mx = (prev.x + p.x) / 2, my = (prev.y + p.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    ctx.strokeStyle = "rgba(230,214,180,.85)";
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // nudo/tirador al final
    const k = knob();
    const grad = ctx.createRadialGradient(k.x, k.y, 1, k.x, k.y, 12);
    grad.addColorStop(0, "#fff2d4");
    grad.addColorStop(1, "#d8a24a");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(k.x, k.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1; ctx.stroke();
  }

  /* --- bucle principal --- */
  (function frame() {
    simulate();
    drawRope();
    if (dragging) {
      const stretch = knob().y - anchor.y - (SEGMENTS - 1) * SEG_LEN;
      maxStretch = Math.max(maxStretch, stretch);
    }
    requestAnimationFrame(frame);
  })();

  /* =========================================================
     4) INTERACCIÓN: agarrar y jalar el cordón
     ========================================================= */
  function pointer(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }
  function nearKnob(pos) {
    const k = knob();
    return Math.hypot(pos.x - k.x, pos.y - k.y) < 40;
  }

  function onDown(e) {
    if (transitioning) return;
    const pos = pointer(e);
    if (!nearKnob(pos)) return;
    dragging = true;
    maxStretch = 0;
    hint && (hint.style.display = "none");
    canvas.style.pointerEvents = "auto";
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    const pos = pointer(e);
    const k = knob();
    // el nudo sigue al puntero, pero no puede subir más allá del ancla
    k.x = pos.x;
    k.y = Math.max(pos.y, anchor.y);
    e.preventDefault();
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    canvas.style.pointerEvents = "none";
    if (maxStretch > PULL_THRESHOLD) pullSwitch();
  }

  // el canvas solo escucha cuando de verdad hace falta; el "down" lo
  // ponemos en toda la ventana y filtramos por cercanía al nudo.
  addEventListener("mousedown", onDown);
  addEventListener("mousemove", onMove);
  addEventListener("mouseup",   onUp);
  addEventListener("touchstart", onDown, { passive: false });
  addEventListener("touchmove",  onMove, { passive: false });
  addEventListener("touchend",   onUp);

  // el cursor cambia a "manita" cuando pasas cerca del nudo
  addEventListener("mousemove", (e) => {
    if (dragging || transitioning) return;
    canvas.style.pointerEvents = nearKnob(pointer(e)) ? "auto" : "none";
    canvas.style.cursor = "grab";
  });

  /* =========================================================
     5) ENCENDER LA LUZ + TRANSICIÓN DE ESCENA
     ========================================================= */
  function pullSwitch() {
    if (transitioning) return;
    transitioning = true;

    // origen del destello = posición de la lámpara (en %)
    const r = lamp.getBoundingClientRect();
    const fx = ((r.left + r.width * 0.5) / innerWidth * 100).toFixed(1) + "%";
    const fy = ((r.top  + r.height * 0.4) / innerHeight * 100).toFixed(1) + "%";
    flash.style.setProperty("--fx", fx);
    flash.style.setProperty("--fy", fy);

    // 1) encender lámpara
    lamp.classList.add("on");

    // 2) expandir el destello (la "cortina de luz")
    flash.animate(
      [ { opacity: 0, transform: "scale(.2)" },
        { opacity: 1, transform: "scale(2.6)", offset: .55 },
        { opacity: 1, transform: "scale(3)" } ],
      { duration: 820, easing: "ease-in", fill: "forwards" }
    );

    // 3) difuminar y ocultar la escena actual mientras el brillo tapa todo
    const from = scenes[current];
    from.classList.add("blurring");

    // 4) a mitad del destello, cambiamos de escena por detrás
    setTimeout(() => {
      from.classList.remove("active", "blurring");
      current = (current + 1) % scenes.length;
      scenes[current].classList.add("active");
      paintDots();
    }, 460);

    // 5) el destello se retira revelando la nueva escena; apagamos la luz
    setTimeout(() => {
      flash.animate(
        [ { opacity: 1 }, { opacity: 0 } ],
        { duration: 620, easing: "ease-out", fill: "forwards" }
      );
      lamp.classList.remove("on");
    }, 820);

    setTimeout(() => { transitioning = false; }, 1500);
  }

  // atajo de teclado: barra espaciadora o Enter también jala el cordón
  addEventListener("keydown", (e) => {
    if ((e.code === "Space" || e.code === "Enter") && !transitioning) {
      e.preventDefault();
      hint && (hint.style.display = "none");
      pullSwitch();
    }
  });

})();
