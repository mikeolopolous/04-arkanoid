# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Juego Arkanoid en HTML, CSS y JavaScript vanilla, **cero dependencias** (sin npm, bundler ni frameworks). El juego está implementado; cada funcionalidad tiene su spec en `specs/`.

## Ejecutar

No hay build, lint ni tests. Sirve la raíz con un servidor estático: los ES modules no cargan desde `file://`, y cargar imágenes en un canvas desde `file://` puede fallar.

    python3 -m http.server 8000   # luego abrir http://localhost:8000

## Arquitectura

`index.html` carga dos scripts, en este orden: `assets/spritesheet.js` (script clásico que define globales) y `<script type="module" src="src/main.js">`. El código del juego son ocho ES modules nativos en `src/`:

- `src/constants.js` — todas las constantes de juego.
- `src/audio.js` — exporta `playSound(name)`; `SOUNDS` es interno.
- `src/levels.js` — exporta `levelMultiplier(level)`, `ballSpeed(level)` y `buildBricks(level)`.
- `src/state.js` — exporta `createState()`, que devuelve un estado nuevo.
- `src/update.js` — exporta `update(state, dt)` y `launchBall(state)`; el resto de la lógica es interna.
- `src/input.js` — exporta `initInput(canvas, state)`, que registra teclado y ratón.
- `src/render.js` — exporta `render(ctx, state)`; `drawHud` y `drawMessage` son internas.
- `src/main.js` — punto de entrada: canvas, `ctx`, estado, `initInput`, loop y arranque.

Reglas:

- Solo `src/main.js` llama a `createState()`, a `document.getElementById` y a `canvas.getContext`. El resto de módulos recibe `state` y `ctx` por parámetro y no los guarda a nivel de módulo.
- Los imports usan ruta relativa con extensión (`'./update.js'`); no hay bundler que la resuelva.
- El grafo de imports no tiene ciclos: `input.js` importa de `update.js`, nunca al revés.
- Los módulos usan los globales de `assets/spritesheet.js` directamente, sin importarlos.
- `src/main.js` asigna `window.state = state` solo para depurar en consola (p. ej. `state.level = 3`); ningún módulo lo lee.

## Assets existentes

- `assets/spritesheet.js` — script clásico (no módulo ES) que define globales: `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` (ms), `loadSpritesheet(cb)`, `drawSprite(ctx, name, x, y, w, h)` y `drawFrame(ctx, frame, x, y, w, h)`. Se carga con `<script>` antes de `src/main.js`, que inicia el loop dentro del callback de `loadSpritesheet`.
  - `drawSprite` acepta `'paddle'`, `'ball'` o `'block_<color>'` (colores: gray, red, yellow, cyan, magenta, hotpink, green).
  - `EXPLOSION_FRAMES[color]` es un array de 4 frames para animar la destrucción de un bloque con `drawFrame`.
  - La ruta `'assets/spritesheet-breakout.png'` es relativa a la página, así que el HTML principal (`index.html`) debe vivir en la raíz del repo.
  - Nota: `EXPLOSION_FRAMES.gray` reutiliza las coordenadas de `red` (sy: 176).
- `assets/sounds/ball-bounce.mp3` y `assets/sounds/break-sound.mp3` — rebote y ruptura de bloque (usar `Audio` nativo).
