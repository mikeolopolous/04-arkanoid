// Constantes
const WIDTH = 600;
const HEIGHT = 800;
const MAX_DT = 1 / 30; // s; evita saltos tras cambiar de pestaña

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function update(dt) {}

function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
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
