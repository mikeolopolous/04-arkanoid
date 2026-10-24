# SPEC 02 — Animación de explosión al destruir bloques

> **Status:** borrador
> **Depends on:** SPEC 01
> **Date:** 2026-10-24
> **Objective:** Cada bloque roto reproduce en su hueco la animación de 4 frames de `EXPLOSION_FRAMES` a 150 ms por frame antes de desaparecer del todo.

## Alcance

**Dentro:**

- Al romper un bloque se crea una explosión en su posición, con el color del bloque.
- La explosión recorre los 4 frames de `EXPLOSION_FRAMES[color]`, 150 ms cada uno (600 ms en total), y luego se elimina.
- La animación usa solo los sprites de destrucción ya definidos en `assets/spritesheet.js` (`EXPLOSION_FRAMES[color]`, columnas `sx` 256–352 del spritesheet). No se dibuja nada procedural (ni formas, ni opacidad, ni escalado animado).
- Se dibuja con `drawFrame` al mismo tamaño que el bloque (48×24), exactamente en su hueco.
- El bloque deja de colisionar en el mismo instante en que se rompe; la explosión no colisiona.
- Puede haber varias explosiones simultáneas, cada una con su propio tiempo.
- Las explosiones se animan en cualquier estado del juego (`'serve'`, `'playing'`, `'gameover'`, `'win'`).
- Al romper el último bloque, la pelota y la paleta se detienen al instante, pero el mensaje "¡VICTORIA!" no aparece hasta que termina la última explosión.
- El tiempo de la animación avanza con el `dt` del bucle (limitado a `MAX_DT`), no con el reloj real.

**Fuera de alcance (para specs futuras):**

- Sonido de ruptura (`assets/sounds/break-sound.mp3`) y de rebote. Irán juntos en una spec de sonido.
- Partículas, sacudida de pantalla u otros efectos además de los frames del spritesheet.
- Explosiones mayores que el bloque.
- Bloques grises (su explosión reutiliza las coordenadas de `red`; no se usan en el nivel actual).
- Pausa, pantalla de inicio y el resto de puntos fuera de alcance de SPEC 01.

## Modelo de datos

```js
// game.js — constantes nuevas
const EXPLOSION_FRAME_TIME = EXPLOSION_DURATION / 1000; // s por frame (0,15)

// game.js — estado: campo nuevo
const state = {
  // ...campos de SPEC 01 sin cambios
  explosions: [
    /* { x, y, color, elapsed } */
  ],
};
```

Convenciones:

- `x`/`y` son la esquina superior izquierda del bloque roto; el tamaño es siempre `BRICK_W`×`BRICK_H`.
- `color` es el mismo string que `brick.color` y se usa como clave de `EXPLOSION_FRAMES`.
- `elapsed` son segundos desde que se rompió el bloque; empieza en 0.
- Frame a dibujar: `Math.floor(elapsed / EXPLOSION_FRAME_TIME)`.
- Una explosión termina cuando `elapsed >= EXPLOSION_FRAMES[color].length * EXPLOSION_FRAME_TIME` y se quita del array.
- `brick.alive` sigue siendo la única fuente de verdad para colisiones y para la condición de victoria.

## Plan de implementación

1. Añadir `EXPLOSION_FRAME_TIME` y `state.explosions: []`. En `hitBrick`, tras marcar `alive: false`, empujar `{ x: brick.x, y: brick.y, color: brick.color, elapsed: 0 }`. Prueba manual: en consola, `state.explosions.length` crece al romper bloques; el juego se comporta igual que antes.
2. Añadir `updateExplosions(dt)`: suma `dt` a `elapsed` de cada explosión y elimina las terminadas. Llamarla al principio de `update(dt)`, antes del corte por `'gameover'`/`'win'`. Prueba: `state.explosions` vuelve a 0 unos 600 ms después de romper el último bloque golpeado.
3. Añadir el dibujo en `render()`: tras los bloques vivos y antes de la paleta, dibujar cada explosión con `drawFrame(ctx, EXPLOSION_FRAMES[color][frame], x, y, BRICK_W, BRICK_H)`. Prueba: cada bloque roto estalla en su hueco con los 4 frames y desaparece.
4. Retrasar el mensaje de victoria: en `render()`, dibujar "¡VICTORIA!" solo si `state.status === 'win'` y `state.explosions.length === 0`. La transición a `'win'` en `updateBall` no cambia. Prueba: al romper el último bloque la pelota se detiene, se ve su explosión completa y después aparece el mensaje.

## Criterios de aceptación

- [ ] Al romper un bloque se ven, en su mismo hueco de 48×24, los 4 frames de explosión del color del bloque, en orden.
- [ ] La animación dura 600 ms (±1 frame) y después el hueco queda vacío.
- [ ] La pelota no rebota en un bloque que está explotando.
- [ ] Romper varios bloques seguidos muestra varias explosiones a la vez, cada una en su fase.
- [ ] Una explosión en curso termina su animación aunque se pierda una vida, y también bajo el overlay de "GAME OVER".
- [ ] Al romper el último bloque la pelota y la paleta se detienen al instante y "¡VICTORIA!" aparece solo cuando su explosión termina.
- [ ] La victoria sigue mostrando 720 puntos.
- [ ] La animación dura lo mismo en un monitor de 60 Hz y en uno de 120 Hz.
- [ ] No hay errores en consola y el proyecto sigue sin dependencias externas.
- [ ] `assets/spritesheet.js` no se modifica.

## Decisiones

- **Sí:** 150 ms por frame (600 ms en total). Elegido por el usuario; con 150 ms totales (~37 ms/frame) la animación apenas se percibe.
- **No:** interpretar `EXPLOSION_DURATION` como duración total.
- **Sí:** array separado `state.explosions`. Elegido por el usuario; no mezcla colisión y animación en el objeto bloque.
- **No:** campo de animación dentro de cada bloque. Obligaría a distinguir "roto" de "desaparecido" en colisiones y en la condición de victoria.
- **Sí:** el bloque deja de colisionar al romperse. La pelota no debe rebotar dos veces en el mismo bloque.
- **Sí:** tamaño igual al bloque (48×24). Elegido por el usuario; no solapa a los bloques vecinos.
- **Sí:** las explosiones se animan en todos los estados. Elegido por el usuario; evita un bloque congelado a medio estallar bajo el overlay.
- **Sí:** retrasar el mensaje de victoria hasta que acabe la última explosión. Elegido por el usuario.
- **Sí:** retrasarlo solo en `render()`, manteniendo la transición inmediata a `'win'`. Así la pelota y la paleta se detienen al instante sin añadir un estado nuevo.
- **No:** un estado intermedio (por ejemplo `'clearing'`). Más lógica para el mismo resultado visible.
- **Sí:** tiempo basado en `dt`. Coherente con el resto del juego y con una futura pausa.
- **No:** sonido de ruptura en esta spec. El usuario prefiere agrupar los sonidos en una spec aparte.

## Riesgos

| Riesgo                                                                                       | Mitigación                                                                                          |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| El índice de frame se sale del array en el último tick si `elapsed` supera justo el límite. | Eliminar las explosiones terminadas en `updateExplosions` antes de `render()`, que nunca ve una terminada. |
| Un color sin entrada en `EXPLOSION_FRAMES` rompe el dibujo.                                  | Todos los colores de `ROW_COLORS` tienen entrada. Los grises no se usan en el nivel actual.          |
| Si las explosiones se actualizan tras el corte de `update()`, se congelan en `'win'`/`'gameover'` y la victoria nunca se muestra. | `updateExplosions(dt)` se llama al principio de `update(dt)`, antes del `return` por estado final.   |

## Qué **no** entra en esta spec

- Sonidos de ruptura y de rebote.
- Partículas, sacudida de pantalla u otros efectos extra.
- Explosiones de tamaño distinto al bloque.
- Bloques grises.

Cada uno de estos, si llega, va en su propia spec.
