// Dibujo. drawSprite, drawFrame y EXPLOSION_FRAMES son globales de assets/spritesheet.js
import {
  WIDTH,
  HEIGHT,
  HUD_HEIGHT,
  PADDLE_W,
  PADDLE_H,
  PADDLE_Y,
  BALL_SIZE,
  SPECIAL_COLOR,
  DAMAGED_ALPHA,
  BRICK_W,
  BRICK_H,
  EXPLOSION_FRAME_TIME,
} from './constants.js';

function drawHud(ctx, state) {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(`PUNTOS ${state.score}`, 12, HUD_HEIGHT / 2);
  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${state.level}`, WIDTH / 2, HUD_HEIGHT / 2);

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

// subtitle es opcional; sin él solo se dibuja el título
function drawMessage(ctx, title, subtitle) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 56px monospace';
  ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 20);
  if (!subtitle) return;
  ctx.font = '20px monospace';
  ctx.fillText(subtitle, WIDTH / 2, HEIGHT / 2 + 30);
}

export function render(ctx, state) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  for (const brick of state.bricks) {
    if (!brick.alive) continue;
    // El especial dañado se atenúa; globalAlpha se restaura para no afectar al resto del frame
    if (brick.color === SPECIAL_COLOR && brick.hits === 1) ctx.globalAlpha = DAMAGED_ALPHA;
    drawSprite(ctx, `block_${brick.color}`, brick.x, brick.y, BRICK_W, BRICK_H);
    ctx.globalAlpha = 1;
  }
  for (const explosion of state.explosions) {
    const frame = Math.floor(explosion.elapsed / EXPLOSION_FRAME_TIME);
    drawFrame(ctx, EXPLOSION_FRAMES[explosion.color][frame], explosion.x, explosion.y, BRICK_W, BRICK_H);
  }
  drawSprite(ctx, 'paddle', state.paddle.x, PADDLE_Y, PADDLE_W, PADDLE_H);
  drawSprite(ctx, 'ball', state.ball.x, state.ball.y, BALL_SIZE, BALL_SIZE);
  drawHud(ctx, state);
  if (state.status === 'gameover') drawMessage(ctx, 'GAME OVER', 'Recarga la página para jugar de nuevo');
  // El overlay de nivel espera a que termine la explosión del último bloque
  if (state.status === 'levelup' && state.explosions.length === 0) drawMessage(ctx, `NIVEL ${state.level + 1}`);
}
