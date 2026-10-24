# SPEC 03 — Sonidos de rebote y ruptura

> **Status:** implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-24
> **Objective:** La pelota reproduce `ball-bounce.mp3` al rebotar en paredes laterales, techo y paleta, y `break-sound.mp3` (nunca el de rebote) al romper un bloque.

## Alcance

**Dentro:**

- Sonido de rebote (`assets/sounds/ball-bounce.mp3`) al rebotar en la pared izquierda, la pared derecha, el techo (bajo el HUD) y la paleta.
- Sonido de ruptura (`assets/sounds/break-sound.mp3`) al romper un bloque.
- Al romper un bloque suena solo el de ruptura, aunque la pelota también rebote en él.
- El sonido de ruptura solo suena cuando un bloque pasa de `alive: true` a `alive: false`. Ningún otro evento lo dispara.
- Un sonido por evento: si en el mismo frame hay un rebote en pared y una ruptura, suenan ambos.
- Sonidos iguales que coinciden se solapan: cada reproducción usa un clon del `Audio` precargado, así ninguno corta al anterior.
- El último bloque también suena al romperse, antes de pasar a `'win'`.
- Los `.mp3` se cargan desde `assets/sounds/` con `Audio` nativo; no se mueven ni se renombran.
- Si `play()` falla (autoplay bloqueado o archivo no cargado), se ignora en silencio y el juego sigue.

**Fuera de alcance (para specs futuras):**

- Sonido al caer la pelota por el borde inferior o al perder una vida.
- Sonidos de saque, "GAME OVER" o "¡VICTORIA!".
- Música de fondo.
- Control de volumen, tecla de silencio o cualquier persistencia de preferencias de audio.
- Web Audio API, efectos o variaciones de tono.
- Sonidos distintos por color de bloque.

## Modelo de datos

```js
// game.js — constante nueva
const SOUNDS = {
  bounce: new Audio('assets/sounds/ball-bounce.mp3'),
  break: new Audio('assets/sounds/break-sound.mp3'),
};
```

Convenciones:

- Las rutas son relativas a `index.html`, que vive en la raíz del repo.
- `SOUNDS` solo guarda los originales precargados; nunca se reproducen directamente.
- `playSound(name)` recibe `'bounce'` o `'break'`, reproduce `SOUNDS[name].cloneNode()` y captura la promesa de `play()` con un `.catch` vacío.
- No se añade ningún campo a `state`: el audio no forma parte del estado del juego.

## Plan de implementación

1. Añadir `SOUNDS` y la función `playSound(name)` en `game.js`, junto a las constantes. Prueba manual: en consola, `playSound('bounce')` y `playSound('break')` suenan; llamarlas varias veces seguidas solapa los sonidos sin errores.
2. En `updateBall`, llamar a `playSound('bounce')` dentro de cada rama de rebote: pared izquierda, pared derecha, techo y paleta. Prueba: cada rebote en esos cuatro sitios suena una vez; en `'serve'` (pelota pegada a la paleta) no suena nada.
3. En `hitBrick`, llamar a `playSound('break')` justo después de marcar `brick.alive = false`. No llamar a `playSound('bounce')` en el rebote contra el bloque. Prueba: cada bloque roto suena con el sonido de ruptura y nunca con el de rebote.

## Criterios de aceptación

- [x] Rebotar en la pared izquierda, la derecha o el techo reproduce `ball-bounce.mp3` una vez por rebote.
- [x] Rebotar en la paleta reproduce `ball-bounce.mp3` una vez por rebote.
- [x] Romper un bloque reproduce `break-sound.mp3` y no reproduce `ball-bounce.mp3`.
- [x] `break-sound.mp3` no suena en ningún otro momento que al romper un bloque.
- [ ] Romper el último bloque reproduce `break-sound.mp3`.
- [x] Con la pelota en `'serve'` no suena nada aunque se mueva la paleta.
- [x] Al caer la pelota por el borde inferior no suena nada.
- [ ] Romper bloques en frames seguidos reproduce todos los sonidos solapados, sin que uno corte al anterior.
- [x] Un rebote en pared y una ruptura en el mismo frame reproducen ambos sonidos.
- [ ] Si se bloquea el audio en el navegador, el juego funciona igual y no hay errores en consola.
- [x] El proyecto sigue sin dependencias externas; `index.html` y `assets/` no se modifican.

## Decisiones

- **Sí:** rebote en paredes laterales, techo y paleta. Elegido por el usuario.
- **No:** sonido al caer por el borde inferior. No es un rebote; un sonido de vida perdida iría en otra spec.
- **Sí:** solo sonido de ruptura al golpear un bloque. Elegido por el usuario: el bloque siempre se rompe al primer golpe, así que golpear y romper son el mismo evento.
- **Sí:** clonar el `Audio` precargado en cada reproducción. Elegido por el usuario; permite solapar sonidos en rachas rápidas.
- **No:** reiniciar el mismo `Audio` con `currentTime = 0`. Corta el sonido anterior y suena entrecortado.
- **Sí:** un sonido por evento, aunque coincidan en el mismo frame. Elegido por el usuario; no requiere lógica de prioridad.
- **No:** limitar a un sonido por frame con prioridad break > bounce.
- **Sí:** volumen fijo, sin silencio. Elegido por el usuario; el control de volumen irá en su propia spec.
- **Sí:** código de audio dentro de `game.js`. Elegido por el usuario; son pocas líneas y no obliga a tocar `index.html`.
- **No:** un archivo `sounds.js` aparte.
- **Sí:** ignorar en silencio los fallos de `play()`. Elegido por el usuario; el sonido es accesorio y no debe romper el juego.
- **Sí:** `Audio` nativo, como indica `CLAUDE.md`. **No:** Web Audio API, más compleja sin beneficio para dos efectos cortos.

## Riesgos

| Riesgo                                                                                       | Mitigación                                                                                                   |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| El navegador bloquea el audio antes de la primera interacción (política de autoplay).         | El primer sonido llega tras lanzar la pelota con Espacio o clic, que ya es una interacción. Si aun así falla, el `.catch` lo ignora. |
| Un rebote suena varias veces si la pelota sigue fuera del límite en el frame siguiente.       | Las ramas de rebote ya recolocan la pelota dentro del canvas; la paleta solo rebota con `vy > 0`. Cada rebote ocurre en un solo frame. |
| Muchos clones simultáneos en rachas largas acumulan elementos `Audio`.                         | Como máximo un bloque por frame y unos pocos rebotes; los clones sin referencia los libera el recolector al terminar. |

## Qué **no** entra en esta spec

- Sonidos de caída, vida perdida, saque, "GAME OVER" o "¡VICTORIA!".
- Música de fondo.
- Volumen, silencio y persistencia de preferencias.
- Web Audio API y sonidos por color de bloque.

Cada uno de estos, si llega, va en su propia spec.
