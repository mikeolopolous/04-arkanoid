import { MAX_DT } from './constants.js';
import { createState } from './state.js';
import { update } from './update.js';
import { initInput } from './input.js';
import { render } from './render.js';

// Estado: única instancia de la partida
const state = createState();

// Solo para depurar en consola: ningún módulo lo lee
window.state = state;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

initInput(canvas, state);

let lastTime = null;

function loop(time) {
  const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_DT);
  lastTime = time;
  update(state, dt);
  render(ctx, state);
  requestAnimationFrame(loop);
}

loadSpritesheet(() => requestAnimationFrame(loop));
