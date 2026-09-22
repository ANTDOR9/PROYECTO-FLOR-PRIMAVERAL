/* =========================================================
   PROYECTO FLOR PRIMAVERAL — main.js  (PRUEBA)
   Motor: cordón (Verlet) + cortina de luz + composición floral.
   ========================================================= */

(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scenesEl = document.getElementById("scenes");
  const scenes   = [...scenesEl.querySelectorAll(".scene")];
  const lamp     = document.getElementById("lamp");
  const flash    = document.getElementById("flash");
  const hint     = document.getElementById("hint");
  const canvas   = document.getElementById("ropeCanvas");
  const ctx      = canvas.getContext("2d");

  let current = 0;
  let transitioning = false;

  /* =========================================================
     CUERDA VERLET (el cordón de la lámpara)
     ========================================================= */
  const SEGMENTS = 14, SEG_LEN = 12, GRAVITY = 0.55, FRICTION = 0.98, ITER = 18;
  const PULL_THRESHOLD = 130;
  let points = [], anchor = { x:0, y:0 }, dragging = false, maxStretch = 0;

  function resizeCanvas(){ canvas.width = innerWidth; canvas.height = innerHeight; computeAnchor(); }
  function computeAnchor(){
    const r = lamp.getBoundingClientRect();
    anchor.x = r.left + r.width * 0.62;   // cuelga un poco a la derecha del centro de la lámpara
    anchor.y = r.top  + r.height * 0.42;
  }
  function initRope(){
    computeAnchor(); points = [];
    for (let i=0;i<SEGMENTS;i++)
      points.push({ x:anchor.x, y:anchor.y+i*SEG_LEN, ox:anchor.x, oy:anchor.y+i*SEG_LEN });
  }
  resizeCanvas(); initRope();
  addEventListener("resize", () => { resizeCanvas(); initRope(); bloom.resize(); });
  const knob = () => points[points.length-1];

  function simulate(){
    for (let i=1;i<points.length;i++){
      const p = points[i];
      if (dragging && i===points.length-1) continue;
      const vx=(p.x-p.ox)*FRICTION, vy=(p.y-p.oy)*FRICTION;
      p.ox=p.x; p.oy=p.y; p.x+=vx; p.y+=vy+GRAVITY;
    }
    for (let k=0;k<ITER;k++){
      points[0].x=anchor.x; points[0].y=anchor.y;
      for (let i=0;i<points.length-1;i++){
        const a=points[i], b=points[i+1];
        const dx=b.x-a.x, dy=b.y-a.y, dist=Math.hypot(dx,dy)||1e-4;
        const diff=(SEG_LEN-dist)/dist*0.5, ox=dx*diff, oy=dy*diff;
        if(i!==0){ a.x-=ox; a.y-=oy; } b.x+=ox; b.y+=oy;
      }
    }
  }
  function drawRope(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (current!==0) return;              // el cordón solo en la escena de la lámpara
    ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i=1;i<points.length;i++){
      const p=points[i], pr=points[i-1];
      ctx.quadraticCurveTo(pr.x, pr.y, (pr.x+p.x)/2, (pr.y+p.y)/2);
    }
    ctx.strokeStyle="rgba(235,220,185,.85)"; ctx.lineWidth=2.4; ctx.stroke();
    const k=knob();
    const g=ctx.createRadialGradient(k.x,k.y,1,k.x,k.y,12);
    g.addColorStop(0,"#fff2d4"); g.addColorStop(1,"#d8a24a");
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(k.x,k.y,9,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,.25)"; ctx.lineWidth=1; ctx.stroke();
  }
  (function frame(){
    simulate(); drawRope();
    if (dragging){
      const stretch = knob().y - anchor.y - (SEGMENTS-1)*SEG_LEN;
      maxStretch = Math.max(maxStretch, stretch);
    }
    requestAnimationFrame(frame);
  })();

  const pointer = e => { const t=e.touches?e.touches[0]:e; return {x:t.clientX,y:t.clientY}; };
  const nearKnob = pos => { const k=knob(); return Math.hypot(pos.x-k.x,pos.y-k.y)<44; };
  function onDown(e){
    if (transitioning || current!==0) return;
    const pos=pointer(e); if(!nearKnob(pos)) return;
    dragging=true; maxStretch=0; hint && (hint.style.display="none");
    canvas.style.pointerEvents="auto"; e.preventDefault();
  }
  function onMove(e){
    if(!dragging) return;
    const pos=pointer(e), k=knob();
    k.x=pos.x; k.y=Math.max(pos.y,anchor.y); e.preventDefault();
  }
  function onUp(){
    if(!dragging) return;
    dragging=false; canvas.style.pointerEvents="none";
    if (maxStretch>PULL_THRESHOLD) pullSwitch();
  }
  addEventListener("mousedown",onDown); addEventListener("mousemove",onMove); addEventListener("mouseup",onUp);
  addEventListener("touchstart",onDown,{passive:false}); addEventListener("touchmove",onMove,{passive:false}); addEventListener("touchend",onUp);
  addEventListener("mousemove", e => {
    if (dragging||transitioning||current!==0) return;
    canvas.style.pointerEvents = nearKnob(pointer(e)) ? "auto" : "none";
    canvas.style.cursor="grab";
  });

  /* =========================================================
     TRANSICIÓN: encender luz naranja + cambiar de bloque
     ========================================================= */
  function pullSwitch(){
    if (transitioning) return; transitioning = true;
    const r = lamp.getBoundingClientRect();
    flash.style.setProperty("--fx", ((r.left+r.width/2)/innerWidth*100).toFixed(1)+"%");
    flash.style.setProperty("--fy", ((r.top +r.height*0.4)/innerHeight*100).toFixed(1)+"%");

    lamp.classList.add("on");
    flash.animate(
      [ {opacity:0, transform:"scale(.15)"},
        {opacity:1, transform:"scale(2.8)", offset:.55},
        {opacity:1, transform:"scale(3.2)"} ],
      { duration:820, easing:"ease-in", fill:"forwards" });

    const from = scenes[current];
    from.classList.add("blurring");
    lamp.classList.add("hidden");        // la lámpara se difumina y desaparece

    setTimeout(() => {
      from.classList.remove("active","blurring");
      current = (current+1) % scenes.length;
      scenes[current].classList.add("active");
      updateLamp();
      onSceneEnter(current);
    }, 460);

    setTimeout(() => {
      flash.animate([{opacity:1},{opacity:0}], {duration:640, easing:"ease-out", fill:"forwards"});
      lamp.classList.remove("on");
    }, 840);

    setTimeout(() => { transitioning=false; }, 1500);
  }
  function updateLamp(){ lamp.classList.toggle("hidden", current!==0); }

  addEventListener("keydown", e => {
    if ((e.code==="Space"||e.code==="Enter") && !transitioning){
      e.preventDefault(); hint && (hint.style.display="none"); pullSwitch();
    }
  });

  /* =========================================================
     COMPOSICIÓN FLORAL (canvas #bloom)
       • arriba: cabeza de flor naranja 3D (espiral phyllotaxis
         + pétalos), con tonos por profundidad para dar volumen.
       • abajo: orbe de "polen" (inspirado en PLANTILLA FONDO):
         partículas orbitando en esfera.
       Ambos con mezcla aditiva ('lighter') para que se
       transparenten al superponerse.
     ========================================================= */
  const bloom = (() => {
    const cv = document.getElementById("bloom");
    const g  = cv.getContext("2d");
    let W, H, cx, cy, running = false, raf = 0, t = 0;

    // --- datos de la cabeza de flor (phyllotaxis) ---
    const HEAD_N = 260;
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));   // ~137.5°
    const florets = [];
    for (let i=0;i<HEAD_N;i++){
      const frac = i/HEAD_N;
      florets.push({ frac, r: Math.sqrt(frac), theta: i*GOLDEN });
    }
    // --- pétalos exteriores ---
    const PETALS = 18, petals = [];
    for (let i=0;i<PETALS;i++) petals.push({ a: i/PETALS*Math.PI*2 });

    // --- orbe de polen (esfera de partículas) ---
    const POLLEN_N = 300, pollen = [];
    for (let i=0;i<POLLEN_N;i++){
      const u = Math.random(), v = Math.random();
      const phi = Math.acos(2*u-1), th = 2*Math.PI*v;
      pollen.push({
        x: Math.sin(phi)*Math.cos(th),
        y: Math.cos(phi),
        z: Math.sin(phi)*Math.sin(th),
        hue: 20 + Math.random()*28,          // 20–48: naranjas/ámbar
        tw: Math.random()*Math.PI*2,
        sz: 0.6 + Math.random()*1.4
      });
    }

    function resize(){
      const dpr = Math.min(devicePixelRatio||1, 2);
      W = cv.clientWidth || innerWidth; H = cv.clientHeight || innerHeight;
      cv.width = W*dpr; cv.height = H*dpr;
      g.setTransform(dpr,0,0,dpr,0,0);
      cx = W/2; cy = H/2;
    }

    // rota (x,y,z) alrededor de Y y luego X
    function rot(x,y,z, ay, ax){
      let X = x*Math.cos(ay) + z*Math.sin(ay);
      let Z = -x*Math.sin(ay) + z*Math.cos(ay);
      let Y = y*Math.cos(ax) - Z*Math.sin(ax);
      Z = y*Math.sin(ax) + Z*Math.cos(ax);
      return [X, Y, Z];
    }

    function drawHead(){
      const R = Math.min(W,H) * 0.15;
      const headY = cy - H*0.12;             // un poco arriba
      const dome = R*0.5;                     // abombado hacia el espectador
      const focal = 620;
      const spin = t*0.18;                    // vida (gira la espiral)
      const ay = 0.45*Math.sin(t*0.5);        // bamboleo → 3D
      const ax = -0.5;                        // inclinada hacia atrás

      // pétalos primero (detrás del disco)
      const proj = [];
      for (const p of petals){
        const ang = p.a + spin*0.5;
        // dos puntos: base (en R) y punta (en 1.75R), z ligeramente atrás
        const bx = Math.cos(ang)*R*0.95, by = Math.sin(ang)*R*0.95;
        const tx = Math.cos(ang)*R*1.85, ty = Math.sin(ang)*R*1.85;
        const [BX,BY,BZ] = rot(bx,by,-dome*0.2, ay, ax);
        const [TX,TY,TZ] = rot(tx,ty,-dome*0.35, ay, ax);
        const bp = focal/(focal-BZ), tp = focal/(focal-TZ);
        proj.push({ z:(BZ+TZ)/2, kind:"petal",
          bx:cx+BX*bp, by:headY+BY*bp, tx:cx+TX*tp, ty:headY+TY*tp,
          ang, depth:(TZ) });
      }
      // florecitas del disco
      for (const f of florets){
        const ang = f.theta + spin;
        const rr = f.r*R;
        const x = Math.cos(ang)*rr, y = Math.sin(ang)*rr;
        const z = dome*(1 - f.r*f.r);         // domo
        const [X,Y,Z] = rot(x,y,z, ay, ax);
        const pp = focal/(focal-Z);
        proj.push({ z:Z, kind:"floret",
          x:cx+X*pp, y:headY+Y*pp, s:Math.max(1.2, R*0.05*pp), frac:f.frac, depth:Z });
      }
      // pintar de atrás hacia adelante
      proj.sort((a,b)=>a.z-b.z);
      const dmax = dome+R, dmin = -dome-R;
      const norm = zz => (zz - dmin)/(dmax - dmin);   // 0 lejos, 1 cerca

      g.globalCompositeOperation = "lighter";
      for (const o of proj){
        const d = norm(o.depth);
        if (o.kind==="petal"){
          const light = 30 + 30*d;
          const hue = 30 - 8*d;                // más rojizo cuando resalta
          g.strokeStyle = `hsla(${hue}, 95%, ${light}%, .85)`;
          g.lineWidth = Math.max(2, 10*(0.5+d));
          g.lineCap = "round";
          g.beginPath(); g.moveTo(o.bx,o.by); g.lineTo(o.tx,o.ty); g.stroke();
          // brillo en la punta
          g.fillStyle = `hsla(42, 100%, ${55+25*d}%, .5)`;
          g.beginPath(); g.arc(o.tx,o.ty, 4*(0.6+d),0,Math.PI*2); g.fill();
        } else {
          const hue = 18 + 26*o.frac;          // centro rojo-naranja, borde ámbar
          const light = 28 + 40*d;
          g.fillStyle = `hsl(${hue}, 95%, ${light}%)`;
          g.beginPath(); g.arc(o.x,o.y,o.s,0,Math.PI*2); g.fill();
          // pequeño realce
          g.fillStyle = `hsla(48,100%,80%,${0.15*d})`;
          g.beginPath(); g.arc(o.x,o.y,o.s*0.5,0,Math.PI*2); g.fill();
        }
      }
    }

    function drawPollen(){
      const Ro = Math.min(W,H) * 0.13;
      const orbY = cy + H*0.14;                // abajo, superpuesto a la cabeza
      const focal = 600;
      const ay = t*0.35, ax = 0.4 + 0.15*Math.sin(t*0.3);
      g.globalCompositeOperation = "lighter";
      for (const p of pollen){
        const [X,Y,Z] = rot(p.x*Ro, p.y*Ro, p.z*Ro, ay, ax);
        const pp = focal/(focal-Z);
        const sx = cx + X*pp, sy = orbY + Y*pp;
        const d = (Z + Ro)/(2*Ro);             // 0 atrás, 1 frente
        const tw = 0.55 + 0.45*Math.sin(t*2 + p.tw);
        g.globalAlpha = (0.2 + 0.8*d) * tw;
        g.fillStyle = `hsl(${p.hue}, 100%, ${45+25*d}%)`;
        g.beginPath(); g.arc(sx, sy, p.sz*(0.5+d), 0, Math.PI*2); g.fill();
      }
      g.globalAlpha = 1;
    }

    function loop(){
      g.clearRect(0,0,W,H);
      t += reduce ? 0 : 0.016;
      drawPollen();     // polen detrás
      drawHead();       // cabeza delante
      g.globalCompositeOperation = "source-over";
      if (running) raf = requestAnimationFrame(loop);
    }

    return {
      resize,
      start(){ if(running) return; resize(); running=true; loop(); },
      stop(){ running=false; cancelAnimationFrame(raf); }
    };
  })();

  /* =========================================================
     HOOK de escena
     ========================================================= */
  function onSceneEnter(i){
    if (i===1) bloom.start();
    else       bloom.stop();
  }
  updateLamp();
  onSceneEnter(current);

})();
