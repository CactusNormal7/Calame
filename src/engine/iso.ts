export const TILE_W = 64;
export const TILE_H = 32;

export interface ScreenPoint {
  x: number;
  y: number;
}

export function gridToScreen(gx: number, gy: number, originX: number, originY: number): ScreenPoint {
  return {
    x: originX + (gx - gy) * (TILE_W / 2),
    y: originY + (gx + gy) * (TILE_H / 2),
  };
}

export function screenToGrid(sx: number, sy: number, originX: number, originY: number): { gx: number; gy: number } {
  const x = sx - originX;
  const y = sy - originY;
  const gx = (x / (TILE_W / 2) + y / (TILE_H / 2)) / 2;
  const gy = (y / (TILE_H / 2) - x / (TILE_W / 2)) / 2;
  return { gx: Math.round(gx), gy: Math.round(gy) };
}
