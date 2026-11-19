import {
  BALL_SPEED,
  BALL_SPEED_STEP,
  MAX_BALL_SPEED,
  BRICK_COLS,
  BRICK_ROWS,
  MAX_ROWS,
  SPECIAL_COLS,
  SPECIAL_COLOR,
  SPECIAL_HITS,
  BRICK_W,
  BRICK_H,
  BRICK_OFFSET_X,
  BRICK_OFFSET_Y,
  ROW_COLORS,
} from './constants.js';

// ×1 en el nivel 1; ×2, ×4, ×6… a partir del nivel 2
export function levelMultiplier(level) {
  return level === 1 ? 1 : 2 * (level - 1);
}

// +20 px/s por nivel hasta MAX_BALL_SPEED
export function ballSpeed(level) {
  return Math.min(BALL_SPEED + BALL_SPEED_STEP * (level - 1), MAX_BALL_SPEED);
}

// Una fila más por nivel hasta MAX_ROWS; los colores de fila ciclan ROW_COLORS.
// Las primeras level − 1 filas llevan especiales en SPECIAL_COLS.
export function buildBricks(level) {
  const rows = Math.min(BRICK_ROWS + level - 1, MAX_ROWS);
  const specialRows = Math.min(level - 1, rows);
  const bricks = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      const special = row < specialRows && SPECIAL_COLS.includes(col);
      bricks.push({
        x: BRICK_OFFSET_X + col * BRICK_W,
        y: BRICK_OFFSET_Y + row * BRICK_H,
        color: special ? SPECIAL_COLOR : ROW_COLORS[row % ROW_COLORS.length],
        hits: special ? SPECIAL_HITS : 1, // golpes que faltan para romperlo
        alive: true,
      });
    }
  }
  return bricks;
}
