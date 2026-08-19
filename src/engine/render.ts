import { gridToScreen, TILE_H } from './iso.ts';
import { terrain, fontaines, Terrain, MAP_W, MAP_H } from '../world/map.ts';
import { units, buildings } from '../game/entities.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const ctx = canvas.getContext('2d')!;

const FONT = "16px 'Courier New', Menlo, monospace";
const TAG_FONT = "11px 'Courier New', Menlo, monospace";

let originX = 0;
let originY = 0;
let waterPhase = 0;

function resize(): void {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  originX = window.innerWidth / 2;
  originY = window.innerHeight / 2 - ((MAP_H * TILE_H) / 4);
}

window.addEventListener('resize', resize);
resize();

function terrainGlyph(t: Terrain): { ch: string; color: string } {
  if (t === Terrain.Water) {
    const ch = waterPhase < 0.5 ? '~' : '≈';
    return { ch, color: '#3fa9d6' };
  }
  if (t === Terrain.Sand) return { ch: ',', color: '#8a7d5c' };
  return { ch: '.', color: '#2f4d33' };
}

function drawGlyph(ch: string, gx: number, gy: number, color: string, font = FONT): void {
  const { x, y } = gridToScreen(gx, gy, originX, originY);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, x, y);
}

function drawTag(tag: string, gx: number, gy: number): void {
  const { x, y } = gridToScreen(gx, gy, originX, originY);
  ctx.font = TAG_FONT;
  ctx.fillStyle = '#8f97a8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(tag, x, y - TILE_H / 2 - 4);
}

export function render(dt: number): void {
  waterPhase = (waterPhase + dt) % 1;
  ctx.fillStyle = '#06070a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let gy = 0; gy < MAP_H; gy++) {
    for (let gx = 0; gx < MAP_W; gx++) {
      const { ch, color } = terrainGlyph(terrain[gy][gx]);
      drawGlyph(ch, gx, gy, color);
    }
  }

  for (const f of fontaines) {
    drawGlyph('¤', f.gx, f.gy, '#a76bff');
    drawTag(f.tag, f.gx, f.gy);
  }

  for (const b of buildings) {
    drawGlyph('#', b.gx, b.gy, '#e0e4ee');
    drawTag(b.tag, b.gx, b.gy);
  }

  for (const u of units) {
    const ch = u.harvesting ? '¥' : '@';
    drawGlyph(ch, u.gx, u.gy, '#f2c94c');
    drawTag(u.tag, u.gx, u.gy);
  }
}
