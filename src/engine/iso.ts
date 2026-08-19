export const TILE_W = 64;
export const TILE_H = 32;

export interface ScreenPoint {
  x: number;
  y: number;
}

export function gridToScreen(
  gx: number,
  gy: number,
  originX: number,
  originY: number,
  scale = 1,
): ScreenPoint {
  return {
    x: originX + (gx - gy) * ((TILE_W * scale) / 2),
    y: originY + (gx + gy) * ((TILE_H * scale) / 2),
  };
}

export function screenToGrid(
  sx: number,
  sy: number,
  originX: number,
  originY: number,
  scale = 1,
): { gx: number; gy: number } {
  const x = sx - originX;
  const y = sy - originY;
  const tw = TILE_W * scale;
  const th = TILE_H * scale;
  const gx = (x / (tw / 2) + y / (th / 2)) / 2;
  const gy = (y / (th / 2) - x / (tw / 2)) / 2;
  return { gx: Math.round(gx), gy: Math.round(gy) };
}
