# Juego de Arkanoid

Juego de Arkanoid hecho con HTML, CSS y JavaScript vanilla, cero dependencias. Ya está implementado y es jugable.

## Jugar

Los ES modules no cargan desde `file://`, así que sirve la raíz con un servidor estático:

    python3 -m http.server 8000

Luego abre http://localhost:8000.

Controles: ←/→ o A/D (o el ratón) mueven la paleta; Espacio o clic lanzan la pelota.

## Desarrollo

Cada funcionalidad tiene su spec en `specs/`. Consulta `CLAUDE.md` para la arquitectura y el flujo spec-driven.
