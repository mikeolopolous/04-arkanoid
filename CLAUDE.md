# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Juego Arkanoid en HTML, CSS y JavaScript vanilla, **cero dependencias** (sin npm, bundler ni frameworks). El juego aún no está implementado: solo existen los assets.

## Ejecutar

No hay build, lint ni tests. Sirve la raíz con un servidor estático (cargar imágenes en un canvas desde `file://` puede fallar):

    python3 -m http.server 8000   # luego abrir http://localhost:8000

## Assets existentes

- `assets/spritesheet.js` — script clásico (no módulo ES) que define globales: `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` (ms), `loadSpritesheet(cb)`, `drawSprite(ctx, name, x, y, w, h)` y `drawFrame(ctx, frame, x, y, w, h)`. Cárgalo con `<script>` antes del código del juego e inicia el loop dentro del callback de `loadSpritesheet`.
  - `drawSprite` acepta `'paddle'`, `'ball'` o `'block_<color>'` (colores: gray, red, yellow, cyan, magenta, hotpink, green).
  - `EXPLOSION_FRAMES[color]` es un array de 4 frames para animar la destrucción de un bloque con `drawFrame`.
  - La ruta `'assets/spritesheet-breakout.png'` es relativa a la página, así que el HTML principal (`index.html`) debe vivir en la raíz del repo.
  - Nota: `EXPLOSION_FRAMES.gray` reutiliza las coordenadas de `red` (sy: 176).
- `assets/sounds/ball-bounce.mp3` y `assets/sounds/break-sound.mp3` — rebote y ruptura de bloque (usar `Audio` nativo).
