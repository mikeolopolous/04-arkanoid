// Constantes
const WIDTH = 600;
const HEIGHT = 800;
const HUD_HEIGHT = 40; // franja superior para puntos y vidas
const PADDLE_W = 100,
  PADDLE_H = 16,
  PADDLE_SPEED = 500; // px/s
const PADDLE_Y = HEIGHT - 60; // borde superior de la paleta
const BALL_SIZE = 12,
  BALL_SPEED = 400; // px/s (módulo de la velocidad)
const BRICK_COLS = 12,
  BRICK_ROWS = 6; // filas del nivel 1
const MAX_ROWS = 12; // tope de filas: 100 + 12×24 = 388 px, lejos de la paleta (740)
const BRICK_W = 48,
  BRICK_H = 24; // sprite 32×16 escalado ×1.5
const BRICK_OFFSET_X = 12; // (600 - 12×48) / 2
const BRICK_OFFSET_Y = 100;
const ROW_COLORS = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green'];
const START_LIVES = 3;
const POINTS_PER_BRICK = 10;
const MAX_DT = 1 / 30; // s; evita saltos tras cambiar de pestaña
const EXPLOSION_FRAME_TIME = EXPLOSION_DURATION / 1000; // s por frame (0,15)

// Sonidos: originales precargados; nunca se reproducen directamente
const SOUNDS = {
  bounce: new Audio('assets/sounds/ball-bounce.mp3'),
  break: new Audio('assets/sounds/break-sound.mp3'),
};

// Reproduce un clon para que sonidos iguales se solapen; los fallos de play() se ignoran
function playSound(name) {
  SOUNDS[name]
    .cloneNode()
    .play()
    .catch(() => {});
}

// Estado
// ×1 en el nivel 1; ×2, ×4, ×6… a partir del nivel 2
function levelMultiplier(level) {
  return level === 1 ? 1 : 2 * (level - 1);
}

// Una fila más por nivel hasta MAX_ROWS; los colores de fila ciclan ROW_COLORS
function buildBricks(level) {
  const rows = Math.min(BRICK_ROWS + level - 1, MAX_ROWS);
  const bricks = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: BRICK_OFFSET_X + col * BRICK_W,
        y: BRICK_OFFSET_Y + row * BRICK_H,
        color: ROW_COLORS[row % ROW_COLORS.length],
        hits: 1, // golpes que faltan para romperlo
        alive: true,
      });
    }
  }
  return bricks;
}

const state = {
  status: 'serve', // 'serve' | 'playing' | 'gameover' | 'win'
  score: 0,
  lives: START_LIVES,
  level: 1,
  paddle: { x: (WIDTH - PADDLE_W) / 2 }, // y fija en PADDLE_Y
  ball: { x: 0, y: 0, vx: 0, vy: 0 }, // esquina superior izquierda; px/s
  bricks: buildBricks(1), // { x, y, color, hits, alive }
  explosions: [], // { x, y, color, elapsed }; elapsed en s
  input: { left: false, right: false, mouseX: null },
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

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    launchBall();
    return;
  }
  setKey(e, true);
});
window.addEventListener('keyup', (e) => setKey(e, false));

canvas.addEventListener('mousemove', (e) => {
  state.input.mouseX = e.clientX - canvas.getBoundingClientRect().left;
});
canvas.addEventListener('click', launchBall);

function launchBall() {
  if (state.status !== 'serve') return;
  const side = Math.random() < 0.5 ? -1 : 1;
  state.ball.vx = side * BALL_SPEED * Math.cos(Math.PI / 4);
  state.ball.vy = -BALL_SPEED * Math.sin(Math.PI / 4);
  state.status = 'playing';
}

function updatePaddle(dt) {
  // El ratón tiene prioridad si se movió en este frame; mouseX se consume aquí
  if (state.input.mouseX !== null) {
    state.paddle.x = state.input.mouseX - PADDLE_W / 2;
    state.input.mouseX = null;
  } else {
    const dir = (state.input.right ? 1 : 0) - (state.input.left ? 1 : 0);
    state.paddle.x += dir * PADDLE_SPEED * dt;
  }
  state.paddle.x = Math.max(0, Math.min(WIDTH - PADDLE_W, state.paddle.x));
}

// Rompe como máximo un bloque por frame y rebota por el eje de menor penetración
function hitBrick(ball) {
  for (const brick of state.bricks) {
    if (!brick.alive) continue;

    const overlapX = Math.min(ball.x + BALL_SIZE - brick.x, brick.x + BRICK_W - ball.x);
    const overlapY = Math.min(ball.y + BALL_SIZE - brick.y, brick.y + BRICK_H - ball.y);
    if (overlapX <= 0 || overlapY <= 0) continue;

    brick.alive = false;
    playSound('break'); // solo ruptura: el rebote contra el bloque no suena
    state.explosions.push({ x: brick.x, y: brick.y, color: brick.color, elapsed: 0 });
    state.score += POINTS_PER_BRICK * levelMultiplier(state.level);

    // El signo se fija según el lado del bloque para no volver a meter la pelota en él
    if (overlapX < overlapY) {
      const fromLeft = ball.x + BALL_SIZE / 2 < brick.x + BRICK_W / 2;
      ball.vx = fromLeft ? -Math.abs(ball.vx) : Math.abs(ball.vx);
    } else {
      const fromAbove = ball.y + BALL_SIZE / 2 < brick.y + BRICK_H / 2;
      ball.vy = fromAbove ? -Math.abs(ball.vy) : Math.abs(ball.vy);
    }
    return;
  }
}

function updateBall(dt) {
  const ball = state.ball;

  if (state.status === 'serve') {
    ball.x = state.paddle.x + (PADDLE_W - BALL_SIZE) / 2;
    ball.y = PADDLE_Y - BALL_SIZE;
    return;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Paredes laterales
  if (ball.x < 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx);
    playSound('bounce');
  } else if (ball.x > WIDTH - BALL_SIZE) {
    ball.x = WIDTH - BALL_SIZE;
    ball.vx = -Math.abs(ball.vx);
    playSound('bounce');
  }

  // Techo, justo bajo el HUD
  if (ball.y < HUD_HEIGHT) {
    ball.y = HUD_HEIGHT;
    ball.vy = Math.abs(ball.vy);
    playSound('bounce');
  }

  // Paleta: solo si la pelota baja, para no quedar atrapada en ella
  if (
    ball.vy > 0 &&
    ball.x + BALL_SIZE > state.paddle.x &&
    ball.x < state.paddle.x + PADDLE_W &&
    ball.y + BALL_SIZE > PADDLE_Y &&
    ball.y < PADDLE_Y + PADDLE_H
  ) {
    ball.y = PADDLE_Y - BALL_SIZE;
    ball.vy = -ball.vy;
    playSound('bounce');
  }

  hitBrick(ball);

  // Victoria: no quedan bloques vivos
  if (!state.bricks.some((brick) => brick.alive)) {
    ball.vx = 0;
    ball.vy = 0;
    state.status = 'win';
    return;
  }

  // Caída por debajo del canvas: se pierde una vida
  if (ball.y > HEIGHT) {
    ball.vx = 0;
    ball.vy = 0;
    state.lives -= 1;
    state.status = state.lives === 0 ? 'gameover' : 'serve';
  }
}

// Avanza las explosiones y quita las terminadas, así render() nunca ve un frame fuera de rango
function updateExplosions(dt) {
  for (const explosion of state.explosions) explosion.elapsed += dt;
  state.explosions = state.explosions.filter(
    (explosion) => explosion.elapsed < EXPLOSION_FRAMES[explosion.color].length * EXPLOSION_FRAME_TIME,
  );
}

function update(dt) {
  // Antes del corte por estado final: las explosiones se animan también en 'gameover' y 'win'
  updateExplosions(dt);
  if (state.status === 'gameover' || state.status === 'win') return;
  updatePaddle(dt);
  updateBall(dt);
}

function drawHud() {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`PUNTOS ${state.score}`, 12, HUD_HEIGHT / 2);

  // Vidas: una bola por vida, alineadas a la derecha
  const lifeSize = 16,
    lifeGap = 6;
  const livesX = WIDTH - 12 - state.lives * (lifeSize + lifeGap) + lifeGap;
  for (let i = 0; i < state.lives; i++) {
    drawSprite(ctx, 'ball', livesX + i * (lifeSize + lifeGap), (HUD_HEIGHT - lifeSize) / 2, lifeSize, lifeSize);
  }
  ctx.textAlign = 'right';
  ctx.fillText('VIDAS', livesX - 10, HUD_HEIGHT / 2);

  // Línea que marca el techo
  ctx.fillStyle = '#444';
  ctx.fillRect(0, HUD_HEIGHT - 1, WIDTH, 1);
}

function drawMessage(title) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 56px monospace';
  ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 20);
  ctx.font = '20px monospace';
  ctx.fillText('Recarga la página para jugar de nuevo', WIDTH / 2, HEIGHT / 2 + 30);
}

function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  for (const brick of state.bricks) {
    if (brick.alive) drawSprite(ctx, `block_${brick.color}`, brick.x, brick.y, BRICK_W, BRICK_H);
  }
  for (const explosion of state.explosions) {
    const frame = Math.floor(explosion.elapsed / EXPLOSION_FRAME_TIME);
    drawFrame(ctx, EXPLOSION_FRAMES[explosion.color][frame], explosion.x, explosion.y, BRICK_W, BRICK_H);
  }
  drawSprite(ctx, 'paddle', state.paddle.x, PADDLE_Y, PADDLE_W, PADDLE_H);
  drawSprite(ctx, 'ball', state.ball.x, state.ball.y, BALL_SIZE, BALL_SIZE);
  drawHud();
  if (state.status === 'gameover') drawMessage('GAME OVER');
  // La victoria espera a que termine la explosión del último bloque
  if (state.status === 'win' && state.explosions.length === 0) drawMessage('¡VICTORIA!');
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
