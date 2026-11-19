import { WIDTH, PADDLE_W, START_LIVES } from './constants.js';
import { buildBricks } from './levels.js';

// Devuelve un estado nuevo en el nivel 1; solo main.js lo llama
export function createState() {
  return {
    status: 'serve', // 'serve' | 'playing' | 'gameover' | 'levelup'
    score: 0,
    lives: START_LIVES,
    level: 1,
    levelTimer: 0, // s restantes del overlay "NIVEL N"; solo se usa en 'levelup'
    paddle: { x: (WIDTH - PADDLE_W) / 2 }, // y fija en PADDLE_Y
    ball: { x: 0, y: 0, vx: 0, vy: 0 }, // esquina superior izquierda; px/s
    bricks: buildBricks(1), // { x, y, color, hits, alive }
    explosions: [], // { x, y, color, elapsed }; elapsed en s
    input: { left: false, right: false, mouseX: null },
  };
}
