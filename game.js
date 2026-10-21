// Constantes
const WIDTH = 600;
const HEIGHT = 800;
const PADDLE_W = 100,
  PADDLE_H = 16,
  PADDLE_SPEED = 500; // px/s
const PADDLE_Y = HEIGHT - 60; // borde superior de la paleta
const MAX_DT = 1 / 30; // s; evita saltos tras cambiar de pestaña

// Estado
const state = {
  paddle: { x: (WIDTH - PADDLE_W) / 2 }, // y fija en PADDLE_Y
  input: { left: false, right: false },
};

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

window.addEventListener('keydown', (e) => setKey(e, true));
window.addEventListener('keyup', (e) => setKey(e, false));

function updatePaddle(dt) {
  const dir = (state.input.right ? 1 : 0) - (state.input.left ? 1 : 0);
  state.paddle.x += dir * PADDLE_SPEED * dt;
  state.paddle.x = Math.max(0, Math.min(WIDTH - PADDLE_W, state.paddle.x));
}

function update(dt) {
  updatePaddle(dt);
}

function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawSprite(ctx, 'paddle', state.paddle.x, PADDLE_Y, PADDLE_W, PADDLE_H);
}

let lastTime = null;

function loop(time) {
  const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_DT);
  lastTime = time;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

loadSpritesheet(() => requestAnimationFrame(loop));
