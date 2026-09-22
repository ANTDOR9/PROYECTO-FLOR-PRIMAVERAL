# 🌸 Proyecto Flor Primaveral

Experiencia web animada para el **Día de la Primavera**. Sobre fondo negro,
un mensaje aparece en letra estilizada y se transforma en una **flor hecha de
partículas**, con luces, hojas neón y un fondo de auras suaves.

## ▶️ Cómo verlo

Abre `index.html` en el navegador (doble clic). No necesita internet salvo
para las tipografías (Google Fonts); sin conexión usa fuentes de respaldo.

## 🎬 Secuencia

1. **Intro (~6 s):** mensaje *"Un regalito para usted"* en letra Rubik con
   degradado cálido deslizándose y estrellitas titilando. Luego se difumina.
2. **"Feliz Primavera"** dibujado con partículas.
3. **La flor:** las partículas se reacomodan formando una **rosa** de pétalos.
   - Color que **late** entre dos versiones de naranja (profundidad).
   - **Anillo de luz** alrededor del centro + **orbe** de partículas orbitando.
   - **Hojas neón** que se dibujan y desvanecen alrededor (verde/morado/rosa).
   - **Fondo bokeh** de auras naranjas que flotan suave (aparece con la flor).
   - Reacciona al **cursor**.

## 🗂️ Estructura

```
PROYECTO-FLOR-PRIMAVERAL/
├── index.html        → estructura + intro
├── css/styles.css    → estilos (fondo, intro, tipografías)
├── js/main.js        → todos los efectos en canvas
└── README.md
```

## 🧠 Técnicas usadas (para aprender)

- **Partículas por muestreo de forma:** se dibuja el texto / la rosa en un
  lienzo oculto, se leen sus píxeles y cada uno se vuelve el objetivo de una
  partícula → así "dibujan" cualquier silueta.
- **Mezcla aditiva** (`globalCompositeOperation = "lighter"`) para el brillo.
- **Hojas neón** dibujadas trazo a trazo (contorno + nervaduras) con reveal
  progresivo y desvanecido.
- **Fondo bokeh**: degradados radiales grandes que vagan y cambian de tono.

## 🔧 Pendiente / ideas

- Integrar la **lámpara con cordón** (física Verlet) como disparador: jalar el
  cordón → destello → arranca la secuencia. (El motor del cordón ya se
  desarrolló antes y puede reincorporarse.)

---
Hecho con cariño 🌻
