import { launchBall } from './update.js';

const LEFT_KEYS = ['ArrowLeft', 'a', 'A'];
const RIGHT_KEYS = ['ArrowRight', 'd', 'D'];

function setKey(state, e, pressed) {
  if (LEFT_KEYS.includes(e.key)) state.input.left = pressed;
  else if (RIGHT_KEYS.includes(e.key)) state.input.right = pressed;
  else return;
  e.preventDefault();
}

// Registra teclado y ratón; solo escribe en state.input o llama a launchBall
export function initInput(canvas, state) {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      launchBall(state);
      return;
    }
    setKey(state, e, true);
  });
  window.addEventListener('keyup', (e) => setKey(state, e, false));

  canvas.addEventListener('mousemove', (e) => {
    state.input.mouseX = e.clientX - canvas.getBoundingClientRect().left;
  });
  canvas.addEventListener('click', () => launchBall(state));
}
