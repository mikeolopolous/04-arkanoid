import { MAX_DT } from './constants.js';
import { createState } from './state.js';
import { update, launchBall } from './update.js';
import { render } from './render.js';

// Estado: única instancia de la partida
const state = createState();

// Solo para depurar en consola: ningún módulo lo lee
window.state = state;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Entrada
const LEFT_KEYS = ['ArrowLeft', 'a', 'A'];
const RIGHT_KEYS = ['ArrowRight', 'd', 'D'];

function setKey(e, pressed) {
  if (LEFT_KEYS.includes(e.key)) state.input.left = pressed;
  else if (RIGHT_KEYS.includes(e.key)) state.input.right = pressed;
  else return;
  e.preventDefault();
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    launchBall(state);
    return;
  }
  setKey(e, true);
});
window.addEventListener('keyup', (e) => setKey(e, false));

canvas.addEventListener('mousemove', (e) => {
  state.input.mouseX = e.clientX - canvas.getBoundingClientRect().left;
});
canvas.addEventListener('click', () => launchBall(state));

let lastTime = null;

function loop(time) {
  const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_DT);
  lastTime = time;
  update(state, dt);
  render(ctx, state);
  requestAnimationFrame(loop);
}

loadSpritesheet(() => requestAnimationFrame(loop));
