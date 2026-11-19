# SPEC 05 — Modularizar `game.js` en ES modules dentro de `src/`

> **Status:** aprobado
> **Depends on:** SPEC 01, SPEC 02, SPEC 03, SPEC 04
> **Date:** 2026-11-19
> **Objective:** Dividir `game.js` en ocho ES modules dentro de `src/`, con `state` y `ctx` pasados por parámetro, sin cambiar el comportamiento del juego.

## Por qué existe esta spec

`game.js` reúne en 331 líneas constantes, audio, niveles, estado, entrada, lógica y dibujo.
Todas las funciones leen los globales `state` y `ctx`, así que ninguna parte se entiende ni se cambia de forma aislada.
Esta spec rompe un patrón de las specs anteriores: hasta ahora todo el código vivía en `game.js` y `index.html` no se tocaba.

## Alcance

**Dentro:**

- `game.js` desaparece de la raíz. Su código se reparte en ocho archivos dentro de `src/`:
  - `src/constants.js` — todas las constantes de juego.
  - `src/audio.js` — `SOUNDS` y `playSound`.
  - `src/levels.js` — `levelMultiplier`, `ballSpeed` y `buildBricks`.
  - `src/state.js` — `createState`.
  - `src/update.js` — `update`, `launchBall` y las funciones internas de lógica.
  - `src/input.js` — `initInput` y los listeners de teclado y ratón.
  - `src/render.js` — `render`, `drawHud` y `drawMessage`.
  - `src/main.js` — canvas, `ctx`, creación del estado, loop y arranque.
- Los archivos se conectan con `import` / `export` (ES modules nativos, sin bundler).
- `index.html` carga `assets/spritesheet.js` como script clásico y después `<script type="module" src="src/main.js">`.
- `state` deja de ser un global: `createState()` devuelve un estado nuevo y `src/main.js` lo crea una sola vez.
- Las funciones de lógica reciben `state` por parámetro: `update(state, dt)`, `launchBall(state)`.
- Las funciones de dibujo reciben `ctx` por parámetro: `render(ctx, state)`, `drawHud(ctx, state)`, `drawMessage(ctx, title, subtitle)`.
- `initInput(canvas, state)` registra los listeners y solo escribe en `state.input` o llama a `launchBall(state)`.
- `src/update.js` importa `playSound` directamente de `src/audio.js`.
- `src/main.js` asigna `window.state = state` para depurar en consola.
- `assets/spritesheet.js` no se modifica: los módulos usan sus globales (`drawSprite`, `drawFrame`, `loadSpritesheet`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`) tal cual.
- `CLAUDE.md` se actualiza: quita "el juego aún no está implementado" y describe la estructura de `src/` y el `<script type="module">`.
- El comportamiento del juego es idéntico al de SPEC 04: mismas reglas, velocidades, puntos, sonidos, textos y píxeles.

**Fuera de alcance (para specs futuras):**

- Convertir `assets/spritesheet.js` a ES module.
- Inyectar el sonido por parámetro (`update(state, dt, playSound)`).
- Dividir `src/update.js` en archivos más finos (`paddle.js`, `ball.js`, `bricks.js`…).
- Reinicio sin recargar, pausa o pantalla de inicio (`createState()` lo facilita, pero no se implementa aquí).
- Tests automáticos, linter, bundler o cualquier dependencia.
- Cambios de reglas, valores de constantes, textos o aspecto visual.
- Renombrar funciones, constantes o campos de `state`.
- Cambios en `style.css`.

## Modelo de datos

Esta spec no introduce estructuras de datos nuevas.
El objeto `state` conserva exactamente los campos de SPEC 04; solo cambia quién lo crea.

```js
// src/state.js
export function createState() {
  return {
    status: 'serve', // 'serve' | 'playing' | 'gameover' | 'levelup'
    score: 0,
    lives: START_LIVES,
    level: 1,
    levelTimer: 0,
    paddle: { x: (WIDTH - PADDLE_W) / 2 },
    ball: { x: 0, y: 0, vx: 0, vy: 0 },
    bricks: buildBricks(1),
    explosions: [],
    input: { left: false, right: false, mouseX: null },
  };
}
```

API pública de cada módulo (todo lo no listado es interno y no se exporta):

| Módulo             | Exporta                                                        | Importa de                                   |
| ------------------ | -------------------------------------------------------------- | -------------------------------------------- |
| `src/constants.js` | Todas las constantes actuales (`WIDTH` … `EXPLOSION_FRAME_TIME`) | —                                            |
| `src/audio.js`     | `playSound(name)`                                              | —                                            |
| `src/levels.js`    | `levelMultiplier(level)`, `ballSpeed(level)`, `buildBricks(level)` | `constants.js`                               |
| `src/state.js`     | `createState()`                                                | `constants.js`, `levels.js`                  |
| `src/update.js`    | `update(state, dt)`, `launchBall(state)`                       | `constants.js`, `levels.js`, `audio.js`      |
| `src/input.js`     | `initInput(canvas, state)`                                     | `update.js`                                  |
| `src/render.js`    | `render(ctx, state)`                                           | `constants.js`                               |
| `src/main.js`      | — (punto de entrada)                                           | `constants.js`, `state.js`, `update.js`, `input.js`, `render.js` |

Convenciones:

- Solo `src/main.js` llama a `createState()`, a `document.getElementById` y a `canvas.getContext`.
- Ningún módulo salvo `src/main.js` tiene una variable `state` o `ctx` a nivel de módulo; siempre llegan por parámetro.
- Funciones internas de `src/update.js`: `updatePaddle(state, dt)`, `hitBrick(state)`, `updateBall(state, dt)`, `updateExplosions(state, dt)`, `updateLevelUp(state, dt)`.
- `hitBrick` pasa de recibir `ball` a recibir `state`; lee la pelota de `state.ball`.
- `SOUNDS` queda interno en `src/audio.js`.
- `LEFT_KEYS` y `RIGHT_KEYS` quedan internos en `src/input.js`.
- `MAX_DT` se queda en `src/constants.js`; `lastTime` y `loop` viven en `src/main.js`.
- `EXPLOSION_FRAME_TIME` se sigue calculando en `src/constants.js` a partir del global `EXPLOSION_DURATION`.
- El grafo de imports no tiene ciclos.
- Los imports usan rutas relativas con extensión: `import { update } from './update.js'`.
- `window.state` es solo para depuración: ningún módulo lo lee.

## Plan de implementación

Cada paso deja el juego jugable e idéntico. Prueba común a todos: servir con `python3 -m http.server 8000`, jugar un saque, romper un bloque y comprobar que la consola no tiene errores.

1. Mover `game.js` a `src/main.js` con `git mv`, sin cambiar su contenido. En `index.html`, sustituir `<script src="game.js">` por `<script type="module" src="src/main.js">`. Añadir `window.state = state` tras crear el estado. Prueba: el juego funciona igual y `state.level` responde en consola.
2. Crear `src/constants.js` con todas las constantes (líneas 2–29 del `game.js` actual) exportadas. Importarlas en `src/main.js`. Prueba: 6 filas × 12 columnas y HUD como antes.
3. Crear `src/audio.js` con `SOUNDS` (interno) y `playSound` (exportado). Importar `playSound` en `src/main.js`. Prueba: suenan el rebote y la ruptura.
4. Crear `src/levels.js` con `levelMultiplier`, `ballSpeed` y `buildBricks`. Importarlas en `src/main.js`. Prueba: en consola, `state.level = 3` y cada bloque suma 40.
5. Crear `src/state.js` con `createState()`. En `src/main.js`, `const state = createState()`. Prueba: al cargar hay 3 vidas, 0 puntos y "NIVEL 1".
6. Crear `src/render.js` con `render(ctx, state)`, `drawHud(ctx, state)` y `drawMessage(ctx, title, subtitle)`. El loop llama a `render(ctx, state)`. Prueba: bloques, paleta, pelota, HUD, explosiones y "GAME OVER" se ven igual.
7. Crear `src/update.js` con `update(state, dt)`, `launchBall(state)` y las cinco funciones internas, todas con `state` por parámetro. El loop llama a `update(state, dt)`; los listeners, aún en `src/main.js`, llaman a `launchBall(state)`. Prueba: saque, rebotes, especiales de dos golpes, pérdida de vida y transición "NIVEL 2" funcionan.
8. Crear `src/input.js` con `initInput(canvas, state)`, que registra `keydown`, `keyup`, `mousemove` y `click`. `src/main.js` lo llama una vez antes de arrancar el loop. Prueba: flechas, A/D, ratón, Espacio y clic funcionan; `src/main.js` solo contiene canvas, `ctx`, estado, `initInput`, `loop` y `loadSpritesheet`.
9. Actualizar `CLAUDE.md`: quitar "el juego aún no está implementado", describir los ocho módulos de `src/`, el `<script type="module">` y `window.state`.

## Criterios de aceptación

- [ ] `game.js` no existe en la raíz del repo.
- [ ] `src/` contiene exactamente `constants.js`, `audio.js`, `levels.js`, `state.js`, `update.js`, `input.js`, `render.js` y `main.js`.
- [ ] `index.html` tiene exactamente dos `<script>`: `assets/spritesheet.js` (clásico) y `src/main.js` (`type="module"`), en ese orden.
- [ ] Cada módulo exporta exactamente lo que indica la tabla del modelo de datos.
- [ ] `createState(`, `document.getElementById` y `getContext` solo aparecen en `src/main.js` (salvo la definición de `createState` en `src/state.js`).
- [ ] `src/update.js`, `src/render.js` e `src/input.js` no declaran `state` ni `ctx` a nivel de módulo.
- [ ] `src/input.js` no importa nada de `src/constants.js` ni de `src/levels.js`.
- [ ] El grafo de imports no tiene ciclos.
- [ ] `git status` no muestra cambios en `assets/` ni en `style.css`.
- [ ] El proyecto sigue sin `package.json` ni dependencias.
- [ ] Servido con `python3 -m http.server 8000`, el juego carga sin errores ni avisos en la consola.
- [ ] Al cargar: HUD con "PUNTOS 0", "NIVEL 1" y 3 vidas; 6 filas × 12 columnas; pelota pegada a la paleta.
- [ ] La paleta se mueve con flechas, A/D y ratón; Espacio y clic lanzan la pelota.
- [ ] Los rebotes en paredes, techo y paleta suenan con `ball-bounce.mp3`; romper un bloque suena con `break-sound.mp3` y muestra su explosión.
- [ ] En el nivel 1 cada bloque roto suma 10 puntos.
- [ ] Al limpiar el nivel 1 aparece el overlay "NIVEL 2" durante 1,5 s y después hay 7 filas con 2 bloques grises.
- [ ] Un bloque gris necesita dos golpes y queda al 50 % de opacidad tras el primero.
- [ ] Perder las 3 vidas muestra "GAME OVER" con "Recarga la página para jugar de nuevo".
- [ ] En consola, `window.state.level = 3` hace que el siguiente bloque roto sume 40 puntos.
- [ ] En consola, tras el saque, `Math.hypot(state.ball.vx, state.ball.vy)` da 400 en el nivel 1.
- [ ] `CLAUDE.md` no contiene "aún no está implementado" y lista los ocho archivos de `src/`.

## Decisiones

- **Sí:** ES modules nativos. Elegido por el usuario; dependencias explícitas, sin globales nuevos y sin bundler.
- **No:** varios `<script>` clásicos con globales. El orden de carga sería manual y las dependencias, implícitas.
- **Sí:** carpeta `src/` con `src/main.js` como entrada y `game.js` eliminado. Elegido por el usuario; la raíz queda solo con `index.html`, `style.css` y documentación.
- **No:** carpeta `js/`, ni módulos en la raíz con `game.js` como entrada.
- **Sí:** ocho módulos por responsabilidad. Elegido por el usuario; coinciden con los bloques que ya existen en `game.js`.
- **No:** cinco módulos gruesos (mezclan constantes, estado y niveles) ni más de diez módulos finos (demasiados imports cruzados para 331 líneas).
- **Sí:** mover y además limpiar acoplamientos. Elegido por el usuario frente al refactor puro; `state` y `ctx` dejan de ser globales.
- **Sí:** fábrica `createState()` y una sola instancia creada en `src/main.js`. Elegido por el usuario; ningún módulo puede saltarse el parámetro importando un singleton.
- **No:** `state` exportado como singleton.
- **Sí:** `launchBall(state)` en `src/update.js`. Elegido por el usuario; es lógica de juego y `src/input.js` queda sin reglas.
- **No:** `launchBall` en `src/input.js`, como en el árbol inicial. Obligaría a `input.js` a importar `ballSpeed` y mutar la pelota.
- **Sí:** `ctx` por parámetro en `src/render.js`. Elegido por el usuario; `render.js` no depende del DOM.
- **No:** que `src/render.js` obtenga el canvas con `document.getElementById`.
- **Sí:** `src/update.js` importa `playSound` directamente. Elegido por el usuario; evita propagar un callback por cinco funciones.
- **No:** inyectar `playSound` por parámetro.
- **Sí:** `window.state = state` en `src/main.js`. Elegido por el usuario; las pruebas manuales de SPEC 04 (`state.level = 3`) siguen funcionando.
- **Sí:** `assets/spritesheet.js` intacto y consumido como globales. Elegido por el usuario; mantiene la regla de las specs anteriores de no tocar `assets/`.
- **No:** convertir `assets/spritesheet.js` a ES module.
- **Sí:** actualizar `CLAUDE.md` en esta spec. Elegido por el usuario; su descripción del proyecto quedaría falsa tras el cambio.
- **Sí:** migración incremental que empieza moviendo `game.js` entero a `src/main.js`. Cada paso extrae un módulo y deja el juego jugable.
- **No:** reescribir los ocho archivos de una vez. Un fallo sería difícil de localizar sin tests.
- **Sí:** `git mv` en el paso 1. Conserva el historial del archivo.
- **Sí:** `LEFT_KEYS` / `RIGHT_KEYS` internos en `src/input.js` y `SOUNDS` interno en `src/audio.js`. Solo los usa su módulo.
- **Sí:** mismos nombres de funciones, constantes y campos. Solo cambian las firmas que ganan `state` o `ctx`.

## Riesgos

| Riesgo                                                                                              | Mitigación                                                                                                                         |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Los ES modules no cargan desde `file://` (CORS).                                                     | `CLAUDE.md` ya exige servidor estático; el paso 9 lo deja explícito para los módulos.                                              |
| Los módulos no ven los globales de `assets/spritesheet.js`.                                          | Son `const` y `function` de nivel superior de un script clásico: visibles desde módulos. El script clásico se carga antes que el módulo. |
| Una función sigue leyendo un `state` o `ctx` que ya no existe y lanza `ReferenceError` solo en una rama poco frecuente (`gameover`, `levelup`). | Los módulos son estrictos y el error es inmediato al ejecutar la rama. Los criterios cubren game over, subida de nivel y especiales. |
| El refactor cambia el orden de `update` y altera el comportamiento (p. ej. explosiones en `levelup`). | `update(state, dt)` conserva el orden exacto actual: explosiones, `levelup`, corte por estado, paleta y pelota.                    |
| Import circular entre `src/input.js` y `src/update.js`.                                              | `input.js` importa de `update.js` y nunca al revés; el grafo de la tabla es acíclico.                                              |
| El navegador sirve un `game.js` o un módulo en caché durante las pruebas.                             | Probar con recarga forzada (Cmd+Shift+R) o con la caché desactivada en DevTools.                                                    |
| Un import sin extensión `.js` falla en el navegador (no hay bundler que la resuelva).                 | Convención: todos los imports llevan ruta relativa con `.js`.                                                                       |

## Qué **no** entra en esta spec

- Convertir `assets/spritesheet.js` a ES module.
- Inyección del sonido por parámetro.
- Dividir `src/update.js` en módulos más finos.
- Reinicio sin recargar, pausa y pantalla de inicio.
- Tests, linter, bundler o dependencias.
- Cambios de reglas, valores, textos, nombres o aspecto visual.

Cada uno de estos, si llega, va en su propia spec.
