# SPEC 04 — Niveles con filas crecientes, bloques resistentes y pelota más rápida

> **Status:** aprobado
> **Depends on:** SPEC 01, SPEC 02, SPEC 03
> **Date:** 2026-10-24
> **Objective:** Al romper todos los bloques se pasa a un nivel nuevo con una fila más, bloques grises que necesitan dos golpes, una pelota 20 px/s más rápida y un multiplicador de puntos ×1, ×2, ×4, ×6…

## Alcance

**Dentro:**

- La partida empieza en el nivel 1 y los niveles son infinitos.
- Filas por nivel: `min(6 + (nivel − 1), 12)`. Nivel 1 = 6 filas, nivel 2 = 7… nivel 7 en adelante = 12.
- Los colores de fila ciclan `ROW_COLORS`: fila 7 = red, fila 8 = yellow… fila 12 = green. Ninguna fila normal es gris.
- Bloques especiales de color gris (`block_gray`), único color que no usa ningún bloque normal.
- Un bloque especial necesita dos golpes para romperse.
- Patrón fijo de especiales: en el nivel N, columnas 2 y 9 (base 0) de las primeras `min(N − 1, filas)` filas. Sustituyen al bloque normal de esa posición.
  - Nivel 1 = 0 especiales, nivel 2 = 2, nivel 3 = 4… nivel 13 en adelante = 24.
- Primer golpe a un especial: la pelota rebota, suena `ball-bounce.mp3`, no suma puntos y el bloque se dibuja con opacidad 0,5.
- Segundo golpe: se rompe como un bloque normal (`break-sound.mp3`, explosión de SPEC 02 y puntos).
- La explosión de un especial usa `EXPLOSION_FRAMES.gray`, que se ve roja. Se acepta así.
- Puntos por bloque roto: `10 × multiplicador`. Multiplicador: nivel 1 = ×1, nivel N ≥ 2 = ×2(N − 1). Es decir 10, 20, 40, 60, 80…
- Un especial roto vale lo mismo que un bloque normal de su nivel.
- Al romper el último bloque de un nivel:
  - La pelota y la paleta se detienen al instante (como hoy en `'win'`).
  - Cuando termina la última explosión, aparece el overlay "NIVEL N" (N = nivel siguiente) durante 1,5 s.
  - Después se construye el nivel siguiente y la pelota vuelve a `'serve'`, pegada a la paleta.
- Al cambiar de nivel se conservan vidas y puntos.
- Velocidad de la pelota por nivel: `min(400 + 20 × (nivel − 1), 600)` px/s. Nivel 1 = 400, nivel 2 = 420… nivel 11 en adelante = 600.
- La velocidad se aplica en cada saque (`launchBall`) y es constante durante todo el nivel; el ángulo de saque (45°) no cambia.
- La paleta no acelera: `PADDLE_SPEED` sigue en 500 px/s.
- HUD: "NIVEL N" centrado entre PUNTOS y VIDAS.
- Desaparece el estado `'win'` y el mensaje "¡VICTORIA!": ya no hay último nivel.

**Fuera de alcance (para specs futuras):**

- Récords, nivel máximo o cualquier persistencia entre sesiones.
- Vida extra al subir de nivel.
- Aceleración de la pelota dentro de un mismo nivel (por tiempo o por golpes).
- Aceleración de la paleta.
- Bloques de tres o más golpes, o indestructibles.
- Sprite propio de bloque dañado o explosión gris propia (se tocaría `assets/spritesheet.js`).
- Sonido distinto para el golpe a un especial o para la subida de nivel.
- Diseños de nivel a mano, aleatorios o cargados de un archivo.
- Pausa, pantalla de inicio y reinicio sin recargar.

## Modelo de datos

```js
// game.js — constantes nuevas
const MAX_ROWS = 12; // tope de filas: 100 + 12×24 = 388 px, lejos de la paleta (740)
const SPECIAL_COLS = [2, 9]; // columnas (base 0) de los bloques especiales
const SPECIAL_COLOR = 'gray'; // único color de los especiales
const SPECIAL_HITS = 2;
const DAMAGED_ALPHA = 0.5; // opacidad de un especial tras el primer golpe
const LEVEL_MESSAGE_TIME = 1.5; // s que se muestra el overlay "NIVEL N"
const BALL_SPEED_STEP = 20; // px/s que gana la pelota por nivel (5 % de BALL_SPEED)
const MAX_BALL_SPEED = 600; // px/s; tope alcanzado en el nivel 11
// BRICK_ROWS (6) pasa a ser el número de filas del nivel 1.
// BALL_SPEED (400) pasa a ser la velocidad del nivel 1.

// game.js — estado: campos nuevos o cambiados
const state = {
  status: 'serve', // 'serve' | 'playing' | 'gameover' | 'levelup'  ('win' desaparece)
  level: 1,
  levelTimer: 0, // s restantes del overlay "NIVEL N"; solo se usa en 'levelup'
  bricks: buildBricks(1), // { x, y, color, hits, alive }
  // ...resto de campos sin cambios
};
```

Convenciones:

- `brick.hits` son los golpes que faltan para romperlo: 1 en bloques normales, `SPECIAL_HITS` en especiales.
- Un especial está dañado cuando `color === SPECIAL_COLOR && hits === 1`.
- `brick.alive` sigue siendo la única fuente de verdad para colisiones y para detectar que el nivel terminó.
- `buildBricks(level)` calcula filas, colores y especiales a partir del nivel; no recibe más parámetros.
- `levelMultiplier(level)` devuelve `1` en el nivel 1 y `2 × (level − 1)` en los demás.
- `ballSpeed(level)` devuelve `min(BALL_SPEED + BALL_SPEED_STEP × (level − 1), MAX_BALL_SPEED)`.
- `levelTimer` solo descuenta cuando `state.explosions.length === 0`.

## Plan de implementación

1. Añadir `state.level = 1` y `levelMultiplier(level)`. En `hitBrick`, sumar `POINTS_PER_BRICK * levelMultiplier(state.level)`. Prueba manual: en el nivel 1 cada bloque suma 10; en consola, con `state.level = 3`, cada bloque suma 40.
2. Cambiar `buildBricks()` por `buildBricks(level)`: filas `min(BRICK_ROWS + level − 1, MAX_ROWS)`, color `ROW_COLORS[row % ROW_COLORS.length]` y `hits: 1` en cada bloque. Prueba: el nivel 1 se ve igual que hoy; en consola, `state.bricks = buildBricks(7)` muestra 12 filas con los colores ciclados.
3. Añadir los especiales en `buildBricks(level)`: en las primeras `min(level − 1, filas)` filas, las columnas de `SPECIAL_COLS` llevan `color: SPECIAL_COLOR` y `hits: SPECIAL_HITS`. Prueba: `buildBricks(1)` no tiene grises; `buildBricks(3)` tiene 4 grises en columnas 2 y 9 de las filas 0 y 1; `buildBricks(13)` tiene 24.
4. En `hitBrick`, si `brick.hits > 1`: restar un golpe, rebotar con la lógica actual, `playSound('bounce')` y salir sin puntos ni explosión. En `render()`, dibujar los especiales dañados con `ctx.globalAlpha = DAMAGED_ALPHA`. Prueba: con `state.bricks = buildBricks(2)`, un gris se atenúa al primer golpe y estalla al segundo.
5. Sustituir `'win'` por `'levelup'`: al no quedar bloques vivos, detener la pelota, `status = 'levelup'` y `levelTimer = LEVEL_MESSAGE_TIME`. En `update(dt)`, si es `'levelup'` y no hay explosiones, descontar `levelTimer`; al llegar a 0, `level += 1`, `bricks = buildBricks(level)` y `status = 'serve'`. Prueba: al limpiar el nivel 1, la pelota se para, explota el último bloque, pasa 1,5 s y aparece el nivel 2 con 7 filas y la pelota en la paleta.
6. Mostrar el overlay: `drawMessage(title, subtitle)` acepta subtítulo opcional (GAME OVER mantiene "Recarga la página para jugar de nuevo"). En `'levelup'` sin explosiones, dibujar `drawMessage(\`NIVEL ${state.level + 1}\`)` sin subtítulo. Quitar el mensaje "¡VICTORIA!". Prueba: el overlay "NIVEL 2" se ve 1,5 s tras la última explosión.
7. En `drawHud`, dibujar `NIVEL ${state.level}` centrado en `WIDTH / 2`. Prueba: el HUD muestra "NIVEL 1" al cargar y "NIVEL 2" tras la transición.
8. Añadir `BALL_SPEED_STEP`, `MAX_BALL_SPEED` y `ballSpeed(level)`. En `launchBall`, usar `ballSpeed(state.level)` en lugar de `BALL_SPEED`. Prueba: en consola, tras lanzar, `Math.hypot(state.ball.vx, state.ball.vy)` da 400 en el nivel 1; con `state.level = 2` antes del saque da 420, y con `state.level = 15` da 600.

## Criterios de aceptación

- [ ] Al cargar, el HUD muestra "NIVEL 1", hay 6 filas × 12 columnas y ningún bloque gris.
- [ ] En el nivel 1 cada bloque roto suma 10 puntos.
- [ ] Al romper el último bloque, la pelota y la paleta se detienen al instante.
- [ ] El overlay "NIVEL 2" aparece cuando termina la última explosión y dura 1,5 s (±1 frame).
- [ ] Tras el overlay, el nivel 2 tiene 7 filas y la pelota está pegada a la paleta en `'serve'`.
- [ ] Vidas y puntos se conservan al cambiar de nivel.
- [ ] El nivel 2 tiene exactamente 2 bloques grises, en las columnas 2 y 9 de la fila superior.
- [ ] El nivel 3 tiene 8 filas y 4 grises (columnas 2 y 9 de las filas 0 y 1).
- [ ] A partir del nivel 7 hay 12 filas; las filas 7–12 tienen los colores red, yellow, cyan, magenta, hotpink y green.
- [ ] `buildBricks(13)` y `buildBricks(14)` tienen 24 grises.
- [ ] Ningún bloque normal es gris en ningún nivel.
- [ ] El primer golpe a un gris rebota la pelota, suena `ball-bounce.mp3`, no suma puntos ni explota, y el bloque queda al 50 % de opacidad.
- [ ] El segundo golpe a un gris suena `break-sound.mp3`, muestra su explosión y suma los puntos del nivel.
- [ ] Un bloque roto vale 20 puntos en el nivel 2, 40 en el 3 y 60 en el 4 (normal o gris).
- [ ] Tras el saque, el módulo de la velocidad de la pelota es 400 px/s en el nivel 1, 420 en el 2, 500 en el 6 y 600 en el 11.
- [ ] En los niveles 12 y siguientes la pelota va a 600 px/s.
- [ ] Tras perder una vida, el nuevo saque mantiene la velocidad del nivel actual.
- [ ] La paleta se mueve con el teclado a 500 px/s en cualquier nivel.
- [ ] "¡VICTORIA!" no aparece en ningún momento.
- [ ] "GAME OVER" sigue apareciendo con 0 vidas en cualquier nivel.
- [ ] No hay errores en consola; el proyecto sigue sin dependencias y `assets/` no se modifica.

## Decisiones

- **Sí:** multiplicador ×1, ×2, ×4, ×6… (`2 × (N − 1)` desde el nivel 2). Elegido por el usuario: "valen el doble" al subir y luego "de dos en dos".
- **No:** que el especial valga el doble que un normal, ni sumar +2 puntos base por nivel.
- **Sí:** el especial solo puntúa al romperse. Elegido por el usuario; no premia golpear sin romper.
- **Sí:** patrón fijo en columnas 2 y 9 de las primeras N − 1 filas. Elegido por el usuario; determinista, simétrico y fácil de verificar.
- **No:** especiales aleatorios por porcentaje (no reproducible) ni fila nueva entera de especiales.
- **Sí:** nivel 1 idéntico al actual. Elegido por el usuario; los especiales empiezan en el nivel 2.
- **Sí:** niveles infinitos con tope de 12 filas. Elegido por el usuario; los bloques nunca bajan hasta la paleta.
- **No:** nivel final con "¡VICTORIA!", ni filas sin tope.
- **Sí:** a partir del nivel 13 solo crece el multiplicador. Consecuencia del patrón: no quedan filas sin especiales.
- **Sí:** gris como color especial. Es el único sprite de bloque que no usa ningún nivel.
- **Sí:** aceptar que la explosión gris se vea roja (`EXPLOSION_FRAMES.gray` reutiliza las coordenadas de `red`). Elegido por el usuario; no se toca `assets/spritesheet.js`.
- **No:** quitar la explosión al gris ni desvanecerlo por opacidad (rompería la regla de SPEC 02 de usar solo frames del spritesheet).
- **Sí:** especial dañado al 50 % de opacidad y con sonido de rebote. Elegido por el usuario; el jugador ve qué grises ya golpeó, y el sonido de ruptura sigue reservado a romper (SPEC 03).
- **Sí:** overlay "NIVEL N" de 1,5 s tras la última explosión y vuelta a `'serve'`. Elegido por el usuario; reutiliza el retraso de victoria de SPEC 02.
- **No:** pedir Espacio para continuar, ni cambiar de nivel sin overlay.
- **Sí:** la paleta queda congelada durante `'levelup'`. Mantiene el comportamiento actual de `'win'`; al volver a `'serve'` la pelota se recoloca sobre la paleta.
- **Sí:** estado `'levelup'` que sustituye a `'win'`. Un estado explícito evita mezclar la transición con `'serve'`.
- **Sí:** colores ciclados para las filas 7–12. Elegido por el usuario; nunca generan gris.
- **No:** insertar la fila nueva arriba desplazando las demás.
- **Sí:** "NIVEL N" centrado en el HUD. Elegido por el usuario.
- **Sí:** pelota +20 px/s por nivel (5 % de la velocidad base, suma lineal). Elegido por el usuario: "ligeramente más rápida".
- **No:** +10 % por nivel ni incremento compuesto (×1,05 por nivel). Crecen demasiado rápido.
- **Sí:** tope de 600 px/s. Elegido por el usuario; a esa velocidad la pelota avanza como máximo 20 px por frame (con `MAX_DT`) y no atraviesa paleta ni bloques.
- **No:** velocidad sin tope.
- **Sí:** la velocidad se fija en el saque y es constante en el nivel. Encaja con el saque actual, que ya fija el módulo de la velocidad.
- **Sí:** la paleta no acelera. Elegido por el usuario; con el ratón no influye.
- **Sí:** sin persistencia. Elegido por el usuario; los récords irán en su propia spec.

## Riesgos

| Riesgo                                                                                                 | Mitigación                                                                                                          |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `globalAlpha` no se restaura y el resto del frame se dibuja semitransparente.                           | Ajustar `globalAlpha` solo alrededor del `drawSprite` del especial dañado y devolverlo a 1 justo después.            |
| El primer golpe a un especial deja la pelota dentro del bloque y en el frame siguiente lo rompe.        | El rebote fija el signo de la velocidad según el lado del bloque (lógica actual), así la pelota sale en el siguiente frame. |
| `levelTimer` descuenta mientras explota el último bloque y el overlay dura menos de 1,5 s.              | Descontar solo cuando `state.explosions.length === 0`, la misma condición con la que se dibuja el overlay.            |
| Una explosión del nivel anterior se dibuja sobre el nivel nuevo.                                        | El nivel nuevo solo se construye cuando no hay explosiones y ha pasado `levelTimer`.                                |
| A 600 px/s la pelota atraviesa la paleta o un bloque entre dos frames.                                   | Con `MAX_DT` (1/30 s) avanza como máximo 20 px por frame, menos que la ventana de choque con la paleta (16 + 12 = 28 px) y con un bloque (24 + 12 = 36 px). |
| Quedan referencias a `'win'` (en `update()` o `render()`) y el juego se congela tras limpiar un nivel.   | El paso 5 sustituye todas las apariciones de `'win'`; criterio: "¡VICTORIA!" no aparece nunca.                       |

## Qué **no** entra en esta spec

- Récords y persistencia del nivel alcanzado.
- Vida extra al subir de nivel.
- Aceleración de la pelota dentro de un nivel y aceleración de la paleta.
- Bloques de más de dos golpes o indestructibles.
- Sprites o explosiones nuevas en `assets/spritesheet.js`.
- Sonidos nuevos para golpe a especial o subida de nivel.
- Niveles diseñados a mano, aleatorios o desde archivo.

Cada uno de estos, si llega, va en su propia spec.
