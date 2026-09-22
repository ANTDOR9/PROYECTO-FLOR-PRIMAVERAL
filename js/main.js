(() => {
  const c = document.getElementById("c");
  const g = c.getContext("2d");
  const intro = document.getElementById("intro");
  let W, H, cx, cy, scale, maxR = 1;

  let parts = [], orb = [], ring = [];
  let phase = "text";          // "text" → "flower"
  let orbAlpha = 0, t = 0;
  const mouse = { x:-1e4, y:-1e4 };

  function sampleText(step){
    const o = document.createElement("canvas");
    o.width = W; o.height = H;
    const x = o.getContext("2d");
    const size = Math.min(W*0.16, 130);
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = `${size}px "Pacifico", cursive`;
    x.fillText("Feliz",     W/2, H/2 - size*0.55);
    x.fillText("Primavera", W/2, H/2 + size*0.55);
    const img = x.getImageData(0,0,W,H).data;
    const pts = [];
    for (let py=0; py<H; py+=step)
      for (let px=0; px<W; px+=step)
        if (img[(py*W+px)*4+3] > 40) pts.push({ x:px, y:py });
    return pts;
  }

  function sampleFlower(size, step){
    const o = document.createElement("canvas");
    o.width = o.height = size;
    const x = o.getContext("2d");
    const s = size/2; x.translate(s, s); x.fillStyle = "#fff";
    function petal(L, Wp){
      x.beginPath(); x.moveTo(0,0);
      x.bezierCurveTo( Wp, -L*0.30,  Wp*0.55, -L*0.95, 0, -L);
      x.bezierCurveTo(-Wp*0.55, -L*0.95, -Wp, -L*0.30, 0, 0);
      x.fill();
    }
    const layers = [
      { n:8, L:size*0.44, W:size*0.17, off:0   },
      { n:7, L:size*0.32, W:size*0.15, off:0.5 },
      { n:6, L:size*0.22, W:size*0.13, off:0.2 },
    ];
    for (const ly of layers)
      for (let i=0;i<ly.n;i++){
        x.save(); x.rotate((i+ly.off)/ly.n*Math.PI*2); petal(ly.L, ly.W); x.restore();
      }
    const img = x.getImageData(0,0,size,size).data;
    const pts = [];
    const coreR = size*0.24;               // hueco mayor: los pétalos NO invaden la banda del anillo
    for (let py=0; py<size; py+=step)
      for (let px=0; px<size; px+=step){
        if (img[(py*size+px)*4+3] > 40){
          const rx = px-s, ry = py-s;
          if (Math.hypot(rx,ry) > coreR) pts.push({ x:rx, y:ry });
        }
      }
    return pts;
  }

  function build(){
    W = c.width = innerWidth; H = c.height = innerHeight;
    cx = W/2; cy = H/2; scale = Math.min(W,H)/300;

    const txt = sampleText(5);
    const pet = sampleFlower(300, 5);
    const N = Math.max(txt.length, pet.length);

    maxR = 1;
    for (const p of pet) maxR = Math.max(maxR, Math.hypot(p.x, p.y));

    parts = [];
    for (let i=0;i<N;i++){
      const ta = txt[i % txt.length];
      const pr = pet[i % pet.length];
      const rad = Math.hypot(pr.x, pr.y);
      parts.push({
        x: Math.random()*W, y: Math.random()*H,
        txt: { x:ta.x, y:ta.y },
        pet: { x:pr.x, y:pr.y },
        pang: Math.atan2(pr.y, pr.x),        // ángulo del punto en el pétalo (para la onda)
        edge: rad / maxR,                    // 0 centro, 1 punta
        hue: 14 + rad/170*34,
        tw: Math.random()*Math.PI*2
      });
    }

    // orbe central (más grande)
    orb = [];
    for (let i=0;i<340;i++){
      const u=Math.random(), v=Math.random();
      const phi=Math.acos(2*u-1), th=2*Math.PI*v;
      orb.push({
        x:Math.sin(phi)*Math.cos(th), y:Math.cos(phi), z:Math.sin(phi)*Math.sin(th),
        hue:30 + Math.random()*18, tw:Math.random()*Math.PI*2, sz:0.7+Math.random()*1.5
      });
    }

    // CAPA-ANILLO: anillos concéntricos de partículas que rodean la esfera
    // (reemplazan a las partículas de pétalo cercanas y dan un halo parejo)
    ring = [];
    const rows = [
      { rf:0.150, n:44 },
      { rf:0.176, n:54 },
      { rf:0.202, n:64 },
    ];
    for (const row of rows)
      for (let i=0;i<row.n;i++)
        ring.push({ a:i/row.n*Math.PI*2, rf:row.rf, tw:Math.random()*Math.PI*2 });
  }

  addEventListener("resize", () => { if(started) build(); });
  addEventListener("mousemove", e => { mouse.x=e.clientX; mouse.y=e.clientY; });
  addEventListener("mouseleave", () => { mouse.x=mouse.y=-1e4; });
  addEventListener("click", () => { for(const p of parts){ p.x=Math.random()*W; p.y=Math.random()*H; } phase="text"; orbAlpha=0; schedule(); });

  let toFlower, flowerAt = 1e9;
  function schedule(){ clearTimeout(toFlower); toFlower = setTimeout(() => { phase="flower"; flowerAt=t; }, 3600); }

  function rot3(x,y,z, ay, ax){
    let X=x*Math.cos(ay)+z*Math.sin(ay), Z=-x*Math.sin(ay)+z*Math.cos(ay);
    let Y=y*Math.cos(ax)-Z*Math.sin(ax); Z=y*Math.sin(ax)+Z*Math.cos(ax);
    return [X,Y,Z];
  }
  const wrap = a => { a = (a+Math.PI)%(2*Math.PI); if(a<0)a+=2*Math.PI; return a-Math.PI; };

  /* ---------- FONDO BOKEH (degradado suave animado) ----------
     Manchas grandes muy difuminadas que flotan lento. Naranjas
     oscuros/ámbar + un toque muy tenue de rosa/morado. Aparece
     suave cuando ya está la flor; el negro sigue dominando. */
  const bg = (() => {
    const COLORS = [
      [28,90,30], [22,85,26], [36,80,28], [18,88,24],  // naranjas oscuros / ámbar
      [338,55,22], [295,40,22]                          // toque tenue de rosa/morado
    ];
    const blobs = [];
    for(let i=0;i<10;i++){
      const c = COLORS[i%COLORS.length];
      blobs.push({ ax:Math.random(), ay:Math.random(), r:0.34+Math.random()*0.34,
        h:c[0], s:c[1], l:c[2],
        sx:0.10+Math.random()*0.18, sy:0.10+Math.random()*0.18,   // ritmo de vagar
        amp:0.10+Math.random()*0.08,                              // cuánto orbita (contenido)
        ph:Math.random()*Math.PI*2, ph2:Math.random()*Math.PI*2 });
    }
    function draw(g,W,H,now,fade){
      if(fade<=0) return;
      const min=Math.min(W,H);
      for(const b of blobs){
        // vaga suavemente alrededor de su punto (sin alejarse mucho)
        const cx = (b.ax + Math.sin(now*b.sx + b.ph)*b.amp) * W;
        const cy = (b.ay + Math.cos(now*b.sy + b.ph2)*b.amp) * H;
        const R = b.r*min * (1 + 0.08*Math.sin(now*0.3 + b.ph)); // respira un poco
        const hue = b.h + Math.sin(now*0.13 + b.ph)*12;          // cambio de tono ligero
        const a = 0.11*fade*(0.7+0.3*Math.sin(now*0.4+b.ph2));   // sutil, palpita
        const grd=g.createRadialGradient(cx,cy,0,cx,cy,R);
        grd.addColorStop(0,`hsla(${hue},${b.s}%,${b.l}%,${a})`);
        grd.addColorStop(1,`hsla(${hue},${b.s}%,${b.l}%,0)`);
        g.fillStyle=grd; g.beginPath(); g.arc(cx,cy,R,0,Math.PI*2); g.fill();
      }
    }
    return { draw };
  })();

  /* ---------- HOJAS NEÓN (solo líneas: contorno + nervaduras) ----------
     Se auto-dibujan y se desvanecen, cambiando entre verdes/morados/rosas.
     Van abajo del todo y detrás de la flor. */
  const leaves = (() => {
    const HUES = [135, 155, 285, 305, 325];   // verdes, morados, rosas
    const items = [];
    const P = (x,y) => ({x,y});
    function bez(a,b,c,d,t){ const m=1-t;
      return { x:m*m*m*a.x+3*m*m*t*b.x+3*m*t*t*c.x+t*t*t*d.x,
               y:m*m*m*a.y+3*m*m*t*b.y+3*m*t*t*c.y+t*t*t*d.y }; }
    function makeStrokes(){
      const L=70+Math.random()*70, Wd=22+Math.random()*18, steps=20, S=[];
      const out=[];
      for(let i=0;i<=steps;i++) out.push(bez(P(0,0),P(Wd,-L*0.3),P(Wd*0.5,-L*0.9),P(0,-L), i/steps));
      for(let i=0;i<=steps;i++) out.push(bez(P(0,-L),P(-Wd*0.5,-L*0.9),P(-Wd,-L*0.3),P(0,0), i/steps));
      S.push(out);
      const mid=[]; for(let i=0;i<=18;i++) mid.push(P(0,-L*i/18)); S.push(mid);
      const veins=6;
      for(let k=1;k<=veins;k++){
        const fy=-L*(k/(veins+1)), dir=k%2?1:-1, vl=Wd*(0.95-0.09*k), v=[];
        for(let i=0;i<=8;i++){ const tt=i/8; v.push(P(dir*vl*tt, fy - vl*0.55*tt)); }
        S.push(v);
      }
      return S;
    }
    function spawn(idx, now){
      return { strokes:makeStrokes(),
        th: Math.random()*Math.PI*2,          // ángulo aleatorio alrededor de la flor
        rbase: 0.40 + Math.random()*0.06,     // raíz casi al ras de las puntas de los pétalos
        scale: 0.8 + Math.random()*0.8,
        hue:HUES[(idx*2+Math.floor(Math.random()*HUES.length))%HUES.length],
        born: now + Math.random()*3.5 };
    }
    for(let i=0;i<8;i++) items.push(spawn(i, 0));

    // se dibuja alrededor del centro (cx,cy); la punta apunta hacia el centro
    function draw(g, W, H, now, gfade){
      const DRAW=1.8, HOLD=1.3, FADE=1.6, TOTAL=DRAW+HOLD+FADE;
      const cx=W/2, cy=H/2, min=Math.min(W,H);
      g.lineCap="round"; g.lineJoin="round";
      for(let idx=0; idx<items.length; idx++){
        const it=items[idx];
        const age=now-it.born;
        if(age<0) continue;
        if(age>TOTAL){ items[idx]=spawn(idx, now); continue; }
        const p = age<DRAW ? age/DRAW : 1;
        // alpha: fade-in suave al aparecer, mantiene, y fade-out
        let alpha = age<DRAW ? Math.min(1, age/0.7)
                  : age<DRAW+HOLD ? 1
                  : 1-(age-DRAW-HOLD)/FADE;
        alpha *= gfade;                         // desvanecido inicial global
        const hue = it.hue + Math.sin(now*0.4+idx)*18;
        g.save();
        g.translate(cx + Math.cos(it.th)*it.rbase*min, cy + Math.sin(it.th)*it.rbase*min);
        g.rotate(it.th + Math.PI/2);           // la RAÍZ mira al centro; la hoja se abre hacia afuera
        const s = it.scale * (min/860);        // un poco más grandes
        g.scale(s, s);
        g.strokeStyle=`hsla(${hue},100%,66%,${alpha})`;
        g.shadowColor=`hsla(${hue},100%,60%,${alpha})`; g.shadowBlur=10;
        g.lineWidth=2.0;
        for(const st of it.strokes){
          const n=Math.max(2, Math.floor(st.length*p));
          g.beginPath(); g.moveTo(st[0].x, st[0].y);
          for(let i=1;i<n;i++) g.lineTo(st[i].x, st[i].y);
          g.stroke();
        }
        g.restore();
      }
      g.shadowBlur=0;
    }
    return { draw };
  })();

  function loop(){
    t += 0.016;
    g.clearRect(0,0,W,H);
    g.globalCompositeOperation = "lighter";

    // fondo bokeh: aparece suave cuando ya está la flor (detrás de todo)
    bg.draw(g, W, H, t, phase==="flower" ? Math.min(1, (t - flowerAt - 0.3)/2.6) : 0);

    // hojas neón: solo cuando ya está la flor (con un pequeño retraso)
    if (phase==="flower" && t - flowerAt > 1.2)
      leaves.draw(g, W, H, t, Math.min(1, (t - flowerAt - 1.2)/1.4));  // aparición suave

    const isFlower = phase==="flower";
    orbAlpha += ((isFlower?1:0) - orbAlpha) * 0.04;

    const ang = isFlower ? t*0.05 : 0;          // giro suave de la flor
    const ca=Math.cos(ang), sa=Math.sin(ang);
    const wave = t*0.9;                          // onda que recorre los pétalos

    for (const p of parts){
      let TX, TY, bump = 0;
      if (isFlower){
        // onda: los puntos cerca del frente de onda se dispersan hacia afuera y regresan
        const vis = p.pang + ang;
        const dd = wrap(vis - wave);
        bump = Math.exp(-(dd*dd)/0.20) * 0.22 * p.edge;   // más en las puntas
        const rs = 1 + bump;
        const px = p.pet.x*rs, py = p.pet.y*rs;
        const rx = px*ca - py*sa, ry = px*sa + py*ca;
        TX = cx + rx*scale; TY = cy + ry*scale;
      } else { TX = p.txt.x; TY = p.txt.y; }
      p.x += (TX-p.x)*0.08; p.y += (TY-p.y)*0.08;

      const dx=p.x-mouse.x, dy=p.y-mouse.y, d2=dx*dx+dy*dy;
      if (d2<9000){ const f=(9000-d2)/9000; p.x+=dx/Math.sqrt(d2+1)*f*6; p.y+=dy/Math.sqrt(d2+1)*f*6; }

      const pulse = 0.6 + 0.4*Math.sin(t*3 + p.tw);
      const r = (1.6 + 1.0*pulse) * scale;

      // ---- color: LATIDO entre dos versiones ----
      // A) degradado leve original (naranja parejo por radio)
      // B) centro dorado (color luz) → puntas naranja saturado
      // se mezclan con un latido suave que respira entre ambas.
      let hue, light, alpha;
      if (isFlower){
        const centerF = 1 - p.edge;
        const boost   = Math.pow(centerF, 0.55);
        // ambas versiones ponen el AMARILLO cerca del anillo → oscuro a las puntas (profundidad)
        const hueA = 44 - 22*p.edge,   lightA = 44 + 12*centerF + 4*pulse, alphaA = 1;            // versión A (vivo)
        const hueB = 20 + 20*boost,    lightB = 44 + 16*boost,             alphaB = 0.9 + 0.1*boost;// versión B (vivo)
        const m = 0.5 + 0.5*Math.sin(t*1.1);   // respiración A↔B
        hue   = hueA*(1-m) + hueB*m;
        light = lightA*(1-m) + lightB*m;
        alpha = alphaA*(1-m) + alphaB*m;
      } else { hue = p.hue; light = 52 + 8*pulse; alpha = 1; }
      g.globalAlpha = alpha;
      g.fillStyle = `hsl(${hue}, 100%, ${light}%)`;
      g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI*2); g.fill();
    }
    g.globalAlpha = 1;

    // ---- centro eléctrico (orbe, más grande) ----
    if (orbAlpha>0.02){
      const Ro = Math.min(W,H)*0.115;
      const ay=t*0.6, ax=0.4+0.15*Math.sin(t*0.4);
      for (const o of orb){
        const [X,Y,Z]=rot3(o.x*Ro,o.y*Ro,o.z*Ro, ay, ax);
        const pp=600/(600-Z), sx=cx+X*pp, sy=cy+Y*pp;
        const d=(Z+Ro)/(2*Ro), tw=0.55+0.45*Math.sin(t*3+o.tw);
        g.globalAlpha=(0.25+0.75*d)*tw*orbAlpha;
        g.fillStyle=`hsl(${o.hue},100%,${46+16*d}%)`;
        g.beginPath(); g.arc(sx,sy,o.sz*(0.6+d),0,Math.PI*2); g.fill();
      }
      g.globalAlpha=1;

      // ---- CAPA-ANILLO iluminada (halo parejo alrededor de la esfera) ----
      const m = Math.min(W,H);
      // halo suave (un solo degradado → sin costo de rendimiento)
      const halo = g.createRadialGradient(cx,cy, m*0.10, cx,cy, m*0.24);
      halo.addColorStop(0.0, "rgba(255,180,60,0)");
      halo.addColorStop(0.5, `rgba(255,205,90,${0.40*orbAlpha})`);
      halo.addColorStop(1.0, "rgba(255,150,40,0)");
      g.fillStyle = halo; g.fillRect(0,0,W,H);
      // partículas del anillo (repartidas, giran suave)
      for (const q of ring){
        const a  = q.a + t*(0.22 - (q.rf-0.15)*0.6);   // filas giran a distinto ritmo
        const rr = m*q.rf;
        const sx = cx + Math.cos(a)*rr, sy = cy + Math.sin(a)*rr;
        const pl = 0.6 + 0.4*Math.sin(t*2.5 + q.tw);
        g.globalAlpha = orbAlpha;
        g.fillStyle = `hsl(${44 - (q.rf-0.15)*140}, 100%, ${56 + 14*pl}%)`;
        g.beginPath(); g.arc(sx, sy, (1.6 + 1.0*pl)*scale, 0, Math.PI*2); g.fill();
      }
      g.globalAlpha = 1;
    }

    g.globalCompositeOperation="source-over";
    requestAnimationFrame(loop);
  }

  /* ---------- orquestación: intro 6s → secuencia ---------- */
  let started = false;
  function start(){ if (started) return; started = true; build(); schedule(); loop(); }

  const kickoff = () => {
    setTimeout(() => intro.classList.add("gone"), 6000);  // intro dura ~6s
    setTimeout(start, 6800);                              // luego arranca la secuencia
  };
  // esperar fuentes (para que el texto se muestree bien), con tope
  try {
    if (document.fonts && document.fonts.ready)
      Promise.race([ document.fonts.ready, new Promise(r=>setTimeout(r,1500)) ]).then(kickoff);
    else kickoff();
  } catch(e){ kickoff(); }
})();
