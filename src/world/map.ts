export const MAP_W = 10;
export const MAP_H = 8;

export enum Terrain {
  Grass,
  Water,
  Sand,
}

export interface FontainePoint {
  gx: number;
  gy: number;
  reserve: number;
}

export const terrain: Terrain[][] = [];
export const fontaines: FontainePoint[] = [
  { gx: 2, gy: 5, reserve: 999 },
  { gx: 7, gy: 2, reserve: 999 },
];

function isWater(gx: number, gy: number): boolean {
  // small lake shapes around each fontaine
  for (const f of fontaines) {
    const d = Math.abs(gx - f.gx) + Math.abs(gy - f.gy);
    if (d <= 1) return true;
  }
  return false;
}

for (let gy = 0; gy < MAP_H; gy++) {
  const row: Terrain[] = [];
  for (let gx = 0; gx < MAP_W; gx++) {
    row.push(isWater(gx, gy) ? Terrain.Water : Terrain.Grass);
  }
  terrain.push(row);
}

export function fontaineAt(gx: number, gy: number): FontainePoint | undefined {
  return fontaines.find((f) => f.gx === gx && f.gy === gy);
}

export function nearestFontaine(gx: number, gy: number): FontainePoint {
  let best = fontaines[0];
  let bestD = Infinity;
  for (const f of fontaines) {
    const d = Math.abs(f.gx - gx) + Math.abs(f.gy - gy);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}

export function inBounds(gx: number, gy: number): boolean {
  return gx >= 0 && gx < MAP_W && gy >= 0 && gy < MAP_H;
}
