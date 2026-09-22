# 🌼 Proyecto Flor Primaveral

Una experiencia web interactiva para el **Día de la Primavera (21 de setiembre)**.
La navegación entre escenas se hace **jalando el cordón de una lámpara**: al jalarlo,
la luz se enciende, todo se difumina en un destello cálido y aparece la siguiente escena.

## ✨ Cómo se usa

1. Abre `index.html` en el navegador (doble clic).
2. Acerca el mouse (o el dedo) al **nudo del cordón** de la lámpara, a la derecha.
3. **Jálalo hacia abajo** y suéltalo. Si lo jalaste lo suficiente, se enciende la luz
   y pasa a la siguiente escena.
   - También puedes usar la tecla **Espacio** o **Enter**.

## 🗂️ Estructura

```
PROYECTO-FLOR-PRIMAVERAL/
├── index.html        → estructura y escenas
├── css/
│   └── styles.css    → estilos y tema visual
├── js/
│   └── main.js       → física del cordón + transiciones
└── README.md
```

## 🧠 Técnicas que se usan (para aprender)

- **Cuerda Verlet:** el cordón es una cadena de puntos. Cada punto recuerda dónde
  estaba el frame anterior; la diferencia entre "ahora" y "antes" es su velocidad,
  así que la gravedad y el rebote salen naturales. Luego se aplican *restricciones de
  distancia* para que los puntos no se separen y parezca una cuerda de verdad.
- **Transición por cortina de luz:** al jalar, se expande un destello radial
  (`radial-gradient` animado con la Web Animations API) desde la posición de la
  lámpara; mientras la luz cubre la pantalla, se cambia de escena por detrás.
- **Canvas de ambiente:** partículas cálidas flotando dan profundidad.
- **Accesibilidad:** respeta `prefers-reduced-motion` y permite teclado.

## 🔧 Ideas para seguir mejorando

- Añadir sonido suave al encender la luz (un "click" + brillo).
- Sumar más escenas (el arreglo de escenas en el HTML es todo lo que hay que tocar).
- Transición de color de fondo distinta por escena.

---
Hecho con cariño 🌻
