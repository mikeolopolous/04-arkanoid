import {
  WIDTH,
  HEIGHT,
  HUD_HEIGHT,
  PADDLE_W,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_Y,
  BALL_SIZE,
  LEVEL_MESSAGE_TIME,
  BRICK_W,
  BRICK_H,
  POINTS_PER_BRICK,
  MAX_DT,
  EXPLOSION_FRAME_TIME,
} from './constants.js';
import { playSound } from './audio.js';
import { levelMultiplier, ballSpeed, buildBricks } from './levels.js';
import { createState } from './state.js';
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
  const speed = ballSpeed(state.level);
  state.ball.vx = side * speed * Math.cos(Math.PI / 4);
  state.ball.vy = -speed * Math.sin(Math.PI / 4);
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

    if (brick.hits > 1) {
      // Especial sin romper: rebota y suena como una pared, sin puntos ni explosión
      brick.hits -= 1;
      playSound('bounce');
    } else {
      brick.alive = false;
      playSound('break'); // solo ruptura: el rebote contra el bloque no suena
      state.explosions.push({ x: brick.x, y: brick.y, color: brick.color, elapsed: 0 });
      state.score += POINTS_PER_BRICK * levelMultiplier(state.level);
    }

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

  // Nivel completado: no quedan bloques vivos
  if (!state.bricks.some((brick) => brick.alive)) {
    ball.vx = 0;
    ball.vy = 0;
    state.status = 'levelup';
    state.levelTimer = LEVEL_MESSAGE_TIME;
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

// El overlay "NIVEL N" solo descuenta tras la última explosión; luego se carga el nivel siguiente
function updateLevelUp(dt) {
  if (state.explosions.length > 0) return;
  state.levelTimer -= dt;
  if (state.levelTimer > 0) return;
  state.level += 1;
  state.bricks = buildBricks(state.level);
  state.status = 'serve';
}

function update(dt) {
  // Antes del corte por estado: las explosiones se animan también en 'gameover' y 'levelup'
  updateExplosions(dt);
  if (state.status === 'levelup') updateLevelUp(dt);
  if (state.status === 'gameover' || state.status === 'levelup') return;
  updatePaddle(dt);
  updateBall(dt);
}

let lastTime = null;

function loop(time) {
  const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_DT);
  lastTime = time;
  update(dt);
  render(ctx, state);
  requestAnimationFrame(loop);
}

loadSpritesheet(() => requestAnimationFrame(loop));
