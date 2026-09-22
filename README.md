# 🌼 Proyecto Flor Primaveral — base limpia

Experiencia web para el **Día de la Primavera (21 de setiembre)**.
La navegación entre escenas se hace **jalando el cordón de una lámpara**:
al jalarlo, la luz se enciende, todo se difumina en un destello cálido
y aparece la siguiente escena.

> Esta es la **base**: trae solo el motor (lámpara + cordón + transiciones).
> La flor, el mensaje y los efectos los agregas tú.

## 🗂️ Estructura

```
PROYECTO-FLOR-PRIMAVERAL/
├── index.html        → escenas (con lugares marcados para tu contenido)
├── css/styles.css    → tema visual + base de la lámpara/transición
├── js/main.js        → motor: cordón (Verlet) + cortina de luz
└── README.md
```

## 🧩 Dónde poner tus cosas

- **Mensaje y flor:** en `index.html`, dentro de cada
  `<section class="scene">`. La escena 1 ya tiene un contenedor
  `<div class="flor-slot" id="flor">` listo para tu flor.
  Puedes agregar o quitar `<section>` libremente: el JS se adapta
  al número de escenas.
- **Efectos por escena:** en `js/main.js`, hasta abajo, está la
  función `onSceneEnter(i, scene)` marcada con **▼ TU ZONA ▼**.
  Se ejecuta cada vez que una escena entra en pantalla; ahí animas
  tu flor, tu texto, lanzas partículas, cambias el fondo, etc.
- **Colores:** en `css/styles.css`, las variables `--glow`, `--script`,
  `--bg`, etc. al inicio (`:root`).

## 🧠 Lo que ya trae el motor (para aprender)

- **Cuerda Verlet:** el cordón es una cadena de puntos. Cada punto
  recuerda dónde estaba antes; la diferencia "ahora − antes" es su
  velocidad, así la gravedad y el rebote salen naturales. Luego se
  aplican *restricciones de distancia* para que parezca una cuerda.
- **Cortina de luz:** al jalar, un `radial-gradient` se expande desde
  la lámpara (Web Animations API) y, con la luz cubriendo todo, se
  cambia de escena por detrás.
- **Ambiente:** partículas cálidas en un canvas de fondo.
- **Accesibilidad:** respeta `prefers-reduced-motion` y funciona con
  **Espacio/Enter**.

---
Hecho con cariño 🌻
