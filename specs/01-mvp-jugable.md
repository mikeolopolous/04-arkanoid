# SPEC 01 — MVP jugable de Arkanoid

> **Status:** aprobado
> **Depends on:** —
> **Date:** 2026-10-21
> **Objective:** Una partida jugable de Arkanoid en un canvas de 600×800 con paleta, pelota, un nivel fijo de bloques, puntuación y 3 vidas.

## Alcance

**Dentro:**

- Canvas fijo de 600 px de ancho × 800 px de alto, centrado en la página, sin escalado.
- Paleta controlada con teclado (←/→ y A/D) y con ratón (sigue la X del puntero).
- Pelota que arranca pegada a la paleta y se lanza con Espacio o clic.
- Saque a 45° hacia arriba, con lado (izquierda/derecha) aleatorio.
- Rebote por reflexión simple en paredes, techo, paleta y bloques.
- Un nivel fijo de 6 filas × 12 columnas; cada bloque se rompe de un golpe.
- Puntuación: 10 puntos por bloque.
- 3 vidas; al caer la pelota se pierde una y se vuelve al saque.
- Estados de fin: "GAME OVER" con 0 vidas y "¡VICTORIA!" al romper todos los bloques.
- HUD en el canvas con puntos y vidas.
- Sprites de `assets/spritesheet.js` (paleta, pelota, bloques).
- Movimiento en píxeles/segundo con delta time.

**Fuera de alcance (para specs futuras):**

- Sonidos (`assets/sounds/`).
- Animación de explosión (`EXPLOSION_FRAMES`).
- Pausa.
- Pantalla de inicio.
- Reinicio desde el juego (se reinicia recargando la página).
- Ángulo de rebote según el punto de impacto en la paleta.
- Aceleración de la pelota.
- Bloques resistentes (varios golpes).
- Varios niveles.
- Récords o cualquier persistencia.
- Escalado del canvas o pantalla completa.
- Controles táctiles.

## Modelo de datos

```js
// game.js — constantes
const WIDTH = 600;
const HEIGHT = 800;
const HUD_HEIGHT = 40; // franja superior para puntos y vidas
const PADDLE_W = 100,
  PADDLE_H = 16,
  PADDLE_SPEED = 500; // px/s
const PADDLE_Y = HEIGHT - 60; // borde superior de la paleta
const BALL_SIZE = 12,
  BALL_SPEED = 400; // px/s (módulo de la velocidad)
const BRICK_COLS = 12,
  BRICK_ROWS = 6;
const BRICK_W = 48,
  BRICK_H = 24; // sprite 32×16 escalado ×1.5
const BRICK_OFFSET_X = 12; // (600 - 12×48) / 2
const BRICK_OFFSET_Y = 100;
const ROW_COLORS = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green'];
const START_LIVES = 3;
const POINTS_PER_BRICK = 10;
const MAX_DT = 1 / 30; // s; evita saltos tras cambiar de pestaña

// game.js — estado
const state = {
  status: 'serve', // 'serve' | 'playing' | 'gameover' | 'win'
  score: 0,
  lives: START_LIVES,
  paddle: { x: (WIDTH - PADDLE_W) / 2 }, // y fija en PADDLE_Y
  ball: { x: 0, y: 0, vx: 0, vy: 0 }, // esquina superior izquierda; px/s
  bricks: [
    /* { x, y, color, alive: true } */
  ],
  input: { left: false, right: false, mouseX: null },
};
```

Convenciones:

- Coordenadas con origen arriba a la izquierda; `x`/`y` son la esquina superior izquierda de cada entidad.
- Velocidades en píxeles/segundo; cada frame se multiplica por `dt` en segundos.
- La paleta se limita a `0 ≤ x ≤ WIDTH - PADDLE_W`.
- En `'serve'` la pelota se recoloca cada frame centrada sobre la paleta.
- El saque fija `vx = ±BALL_SPEED·cos45°` (signo aleatorio) y `vy = -BALL_SPEED·sin45°`.
- El ratón tiene prioridad: si `mouseX` cambió en este frame, la paleta se centra en él. Si no, se aplican las teclas.

## Plan de implementación

1. Crear `index.html` con un `<canvas id="game" width="600" height="800">` y los scripts clásicos `assets/spritesheet.js` y `game.js`, en ese orden. Crear `style.css` con fondo oscuro y el canvas centrado. En `game.js`, iniciar el bucle `requestAnimationFrame` con `dt` limitado a `MAX_DT` dentro del callback de `loadSpritesheet`. Prueba manual: se ve el canvas vacío sin errores en consola.
2. Añadir la paleta: estado, teclas ←/→ y A/D, límites y dibujo con `drawSprite(ctx, 'paddle', …)`. Prueba: la paleta se mueve y no sale del canvas.
3. Añadir el control con ratón con `mousemove` sobre el canvas, convirtiendo la posición con `getBoundingClientRect`. Prueba: la paleta sigue al puntero.
4. Añadir la pelota en estado `'serve'` pegada a la paleta. Lanzarla con Espacio o clic a 45° con lado aleatorio. Rebote en paredes laterales y en el techo (límite inferior de `HUD_HEIGHT`). Si cae por debajo de `HEIGHT`, volver a `'serve'`. Prueba: la pelota sale, rebota y vuelve a la paleta al caer.
5. Añadir la colisión pelota–paleta: si la pelota baja y se solapa con la paleta, invertir `vy` y recolocarla encima. Prueba: la pelota rebota en la paleta.
6. Construir la cuadrícula `state.bricks` (6×12, un color por fila según `ROW_COLORS`) y dibujarla con `drawSprite(ctx, 'block_<color>', …)`. Prueba: se ven 72 bloques en 6 colores.
7. Añadir la colisión pelota–bloque (AABB). Marcar el bloque como `alive: false`, sumar `POINTS_PER_BRICK` e invertir `vx` o `vy` según el eje de menor penetración. Romper como máximo un bloque por frame. Prueba: los bloques desaparecen y la pelota rebota.
8. Añadir el HUD (puntos a la izquierda, vidas a la derecha, dentro de `HUD_HEIGHT`) y las vidas. Al caer la pelota se resta una vida. Con 0 vidas pasar a `'gameover'`, detener la pelota y mostrar "GAME OVER" y "Recarga la página para jugar de nuevo". Prueba: tras 3 caídas aparece el mensaje.
9. Añadir la victoria: si no quedan bloques vivos, pasar a `'win'`, detener la pelota y mostrar "¡VICTORIA!" con el mismo texto de recarga. Prueba: al romper el último bloque aparece el mensaje.

## Criterios de aceptación

- [ ] Abrir `index.html` servido con `python3 -m http.server` muestra un canvas de 600×800 centrado, sin errores en consola.
- [ ] El proyecto no tiene dependencias externas: solo `index.html`, `style.css`, `game.js` y `assets/`.
- [ ] ←/→ y A/D mueven la paleta; mover el ratón sobre el canvas la centra en el puntero.
- [ ] La paleta nunca sale de los bordes del canvas.
- [ ] Al empezar y tras perder una vida, la pelota queda sobre la paleta y la sigue hasta pulsar Espacio o hacer clic.
- [ ] La pelota sale a 45° hacia arriba; en varios saques sale unas veces a la izquierda y otras a la derecha.
- [ ] La pelota rebota en las paredes laterales, en el techo (bajo el HUD) y en la paleta, sin atravesarlos.
- [ ] Hay 72 bloques en 6 filas de colores distintos.
- [ ] Cada bloque golpeado desaparece y suma exactamente 10 puntos.
- [ ] El HUD muestra la puntuación y las vidas actuales; las vidas empiezan en 3.
- [ ] Si la pelota cae por debajo del canvas se resta exactamente una vida.
- [ ] Con 0 vidas se muestra "GAME OVER" y la pelota y la paleta dejan de responder.
- [ ] Al romper el último bloque se muestra "¡VICTORIA!" con 720 puntos.
- [ ] La velocidad de la pelota es la misma en un monitor de 60 Hz y en uno de 120 Hz.
- [ ] Recargar la página empieza una partida nueva con 0 puntos, 3 vidas y 72 bloques.

## Decisiones

- **Sí:** teclado + ratón. Cubre a casi cualquier jugador con poco código extra.
- **Sí:** 3 vidas con estados de Game Over y Victoria. Es el bucle mínimo que hace de esto un juego.
- **Sí:** HUD con puntos y vidas, 10 puntos por bloque.
- **No:** récord guardado. Requiere persistencia; irá en otra spec.
- **Sí:** `index.html` + `style.css` + `game.js` como scripts clásicos. Reutiliza `assets/spritesheet.js` sin modificarlo.
- **No:** módulos ES en `src/`. Obligaría a adaptar `spritesheet.js` y es más estructura de la que necesita un MVP.
- **Sí:** saque con la pelota pegada a la paleta y Espacio/clic.
- **Sí:** reflexión simple en la paleta (solo se invierte `vy`).
- **No:** ángulo según el punto de impacto. Lo descartó el usuario para el MVP. Consecuencia: el jugador no puede apuntar.
- **Sí:** saque a 45° con lado aleatorio. Con reflexión simple el ángulo nunca cambia, y salir recto haría rebotar la pelota siempre en la misma columna.
- **Sí:** un nivel fijo con bloques de un golpe.
- **No:** sonidos, explosiones, pausa ni pantalla de inicio. El usuario los dejó fuera del MVP aunque los assets existan.
- **Sí:** canvas fijo de 600×800 sin escalado. Elegido por el usuario.
- **Sí:** píxeles/segundo con delta time limitado a `MAX_DT`. Misma velocidad en cualquier tasa de refresco.
- **Sí:** reiniciar recargando la página. Evita lógica de reinicio en el MVP.
- **No:** usar bloques grises. Se usan los 6 colores restantes, uno por fila.
- **Sí:** tamaños y velocidades concretos del modelo de datos (paleta 100×16 a 500 px/s, pelota 12 px a 400 px/s, bloques 48×24). Son valores de partida propuestos; se ajustan en las constantes si al jugar no se sienten bien.

## Riesgos

| Riesgo                                                                                                          | Mitigación                                                                                            |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Con reflexión simple la pelota sigue siempre la misma trayectoria y puede quedar en un bucle sin tocar bloques. | Aceptado para el MVP. El ángulo según el punto de impacto queda para una spec futura.                 |
| Efecto túnel: la pelota atraviesa un bloque o la paleta en un frame largo.                                      | `dt` limitado a `MAX_DT` (1/30 s): avance máximo ≈ 13 px por frame, menor que `BRICK_H` y `PADDLE_H`. |
| Abrir `index.html` con `file://` puede bloquear la carga del spritesheet en el canvas.                          | Servir con `python3 -m http.server`, como indica `CLAUDE.md`.                                         |
| La pelota rebota varias veces seguidas contra la paleta y queda atrapada en ella.                               | Invertir `vy` solo si `vy > 0` y recolocar la pelota justo encima de la paleta.                       |
| Con 800 px de alto el canvas no cabe entero en pantallas bajas.                                                 | Aceptado: se eligió tamaño fijo sin escalado. El escalado queda fuera de alcance.                     |

## Qué **no** entra en esta spec

- Sonidos y animación de explosión.
- Pausa y pantalla de inicio.
- Reinicio sin recargar la página.
- Ángulo de rebote variable y aceleración.
- Bloques resistentes y varios niveles.
- Récords y persistencia.
- Escalado, pantalla completa y controles táctiles.

Cada uno de estos, si llega, va en su propia spec.
