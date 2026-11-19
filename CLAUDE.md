# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Juego Arkanoid en HTML, CSS y JavaScript vanilla, **cero dependencias** (sin npm, bundler ni frameworks). El juego está implementado; cada funcionalidad tiene su spec en `specs/`.

## Flujo spec-driven

El proyecto se desarrolla con specs: **ninguna funcionalidad o refactor se implementa sin una spec previa** en `specs/`. La spec es la fuente de verdad; el código la sigue, no al revés.

### Archivos

- `specs/NN-slug-en-minusculas.md` — una spec por cambio, numeradas de forma correlativa (`01-mvp-jugable.md` … `05-modularizar-game-js.md`). La siguiente es `06-…`. Un cambio nuevo es una spec nueva, no una edición de una anterior.
- `specs/.spec-config.yml` — configuración del flujo. `AutoCreateBranch: true` hace que `/spec-impl` cree y cambie a la rama `spec-NN-slug` sin preguntar (con `false` pide confirmación `[y/N]`).

### Estructura de una spec

Todas siguen la misma plantilla, en español:

1. Título `# SPEC NN — <título>` y cabecera con cuatro campos: `Status`, `Depends on` (specs previas o `—`), `Date` (AAAA-MM-DD) y `Objective` (una frase medible).
2. `## Alcance` — con **Dentro** y **Fuera de alcance (para specs futuras)**.
3. `## Modelo de datos` — constantes, estructuras y, si aplica, la API pública de cada módulo (qué exporta e importa).
4. `## Plan de implementación` — pasos numerados e incrementales; cada uno deja el juego jugable y trae su prueba manual.
5. `## Criterios de aceptación` — lista de casillas `- [ ]` verificables; se marcan `- [x]` al terminar.
6. `## Decisiones` — **Sí:** / **No:** con el motivo; indica si la elección fue del usuario.
7. `## Riesgos` — tabla Riesgo | Mitigación.
8. `## Qué **no** entra en esta spec` — recordatorio de lo excluido; cada punto, si llega, va en su propia spec.

La spec 05 añade además `## Por qué existe esta spec` cuando rompe un patrón de las anteriores.

### Ciclo de vida

1. **Redactar** la spec (`Status` inicial `aprobado`, que pasa a `implementado` al cerrar). Antes de escribirla, aclara con el usuario las decisiones que no se deduzcan del código y regístralas en `## Decisiones`.
2. **Implementar** siguiendo el plan paso a paso, con un commit por paso. Sin salirse del alcance: lo de "Fuera de alcance" no se toca.
3. **Verificar** cada criterio de aceptación (servir con el servidor estático y jugar; no hay tests automáticos).
4. **Cerrar**: marcar los criterios `[x]` y poner `Status: implementado` (commit aparte, p. ej. `update status to implemented and mark acceptance criteria as complete`).
5. Si la spec cambia algo descrito en este `CLAUDE.md` (módulos, reglas, assets), actualizarlo en el mismo cambio; así lo hizo la spec 05.

### Reglas

- Las specs ya implementadas son historial: no se reescriben. Si el comportamiento cambia, se crea una spec nueva que declare `Depends on` de las anteriores.
- Una spec nueva debe respetar las convenciones de las anteriores (mismos nombres de funciones, constantes y campos de `state`) salvo que ella misma justifique el cambio en `## Decisiones`.
- Los commits son cortos, en inglés y en minúsculas, y describen el paso (`add …`, `update …`, `modularize …`).

### Specs existentes

| Spec | Tema | Estado |
| ---- | ---- | ------ |
| 01 | MVP jugable: paleta, pelota, bloques, 3 vidas | implementado |
| 02 | Animación de explosión al destruir bloques | implementado |
| 03 | Sonidos de rebote y ruptura | implementado |
| 04 | Niveles infinitos, bloques resistentes, pelota más rápida | implementado |
| 05 | Modularización de `game.js` en ES modules (`src/`) | implementado |

Al leer una spec antigua ten en cuenta que su código vive hoy en `src/`: las specs 01–04 hablan de `game.js`, que ya no existe (ver spec 05).

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
