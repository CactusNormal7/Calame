import { gridToScreen, TILE_W, TILE_H } from './iso.ts';
import { camera, initCamera } from './camera.ts';
import { hashPhase } from './math.ts';
import { terrain, fontaines, Terrain, MAP_W, MAP_H } from '../world/map.ts';
import { units, buildings, type Unit } from '../game/entities.ts';
import { isSelected } from '../game/selection.ts';
import { openUnitPanel, closeUnitPanel } from '../game/panels.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const ctx = canvas.getContext('2d')!;

const TAG_FONT = "11px 'Courier New', Menlo, monospace";

// périodes distinctes par type d'anim pour éviter tout effet stroboscopique synchronisé
const WATER_PERIOD = 2.6;
const FONTAINE_PERIOD = 3.4;
const UNIT_PERIOD = 1.7;
const SELECTION_PERIOD = 1.1;
const UNIT_HIT_RADIUS = 14;

const COLOR_BG = '#050505';
const COLOR_GRASS = '#141414';
const COLOR_GRASS_LINE = '#1f1f1f';
const COLOR_SAND = '#232320';
const COLOR_WATER_LOW = '#3a3a3a';
const COLOR_WATER_HIGH = '#e8e8e8';
const COLOR_BORDER = '#f4f4f4';
const COLOR_UNIT = '#ffffff';
const COLOR_UNIT_BUSY = '#ffd76a';
const COLOR_TAG = '#9a9a9a';
const COLOR_BUILDING = '#ffffff';

let clock = 0;

function tileColor(t: Terrain): { fill: string; stroke: string } {
  if (t === Terrain.Water) return { fill: COLOR_WATER_LOW, stroke: COLOR_WATER_LOW };
  if (t === Terrain.Sand) return { fill: COLOR_SAND, stroke: COLOR_GRASS_LINE };
  return { fill: COLOR_GRASS, stroke: COLOR_GRASS_LINE };
}

function resize(): void {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

window.addEventListener('resize', resize);
resize();

function fitZoom(): number {
  const mapPxW = (MAP_W + MAP_H) * (TILE_W / 2);
  const mapPxH = (MAP_W + MAP_H) * (TILE_H / 2);
  return Math.min((window.innerWidth * 0.82) / mapPxW, (window.innerHeight * 0.82) / mapPxH);
}

initCamera(canvas, fitZoom(), handleCanvasClick);

function unitAtScreen(sx: number, sy: number): Unit | undefined {
  const radius = UNIT_HIT_RADIUS * camera.zoom;
  let closest: Unit | undefined;
  let closestD = radius;
  for (const u of units) {
    const { x, y } = project(u.gx, u.gy);
    const d = Math.hypot(sx - x, sy - y);
    if (d <= closestD) {
      closest = u;
      closestD = d;
    }
  }
  return closest;
}

function handleCanvasClick(sx: number, sy: number): void {
  const hit = unitAtScreen(sx, sy);
  if (hit) {
    openUnitPanel(hit.tag, sx, sy);
  } else {
    closeUnitPanel();
  }
}

function origin(): { x: number; y: number } {
  return {
    x: window.innerWidth / 2 + camera.panX,
    y: window.innerHeight / 2 - ((MAP_H * TILE_H) / 4) * camera.zoom + camera.panY,
  };
}

function project(gx: number, gy: number): { x: number; y: number } {
  const o = origin();
  return gridToScreen(gx, gy, o.x, o.y, camera.zoom);
}

function diamondPath(cx: number, cy: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
}

function drawTile(gx: number, gy: number, t: Terrain): void {
  const { x, y } = project(gx, gy);
  const tw = TILE_W * camera.zoom;
  const th = TILE_H * camera.zoom;
  const { fill, stroke } = tileColor(t);

  if (t === Terrain.Water) {
    const phase = hashPhase(`w${gx}:${gy}`);
    const wave = 0.5 + 0.5 * Math.sin((clock / WATER_PERIOD + phase) * Math.PI * 2);
    diamondPath(x, y, tw, th);
    ctx.fillStyle = mix(COLOR_WATER_LOW, COLOR_WATER_HIGH, wave * 0.35);
    ctx.fill();
    return;
  }

  diamondPath(x, y, tw, th);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function mix(hexA: string, hexB: string, t: number): string {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const ar = (a >> 16) & 0xff,
    ag = (a >> 8) & 0xff,
    ab = a & 0xff;
  const br = (b >> 16) & 0xff,
    bg = (b >> 8) & 0xff,
    bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

function drawTag(text: string, gx: number, gy: number, offsetPx: number): void {
  const { x, y } = project(gx, gy);
  ctx.font = TAG_FONT;
  ctx.fillStyle = COLOR_TAG;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y - offsetPx - 6);
}

function drawBorder(): void {
  const corners = [
    project(-0.5, -0.5),
    project(MAP_W - 0.5, -0.5),
    project(MAP_W - 0.5, MAP_H - 0.5),
    project(-0.5, MAP_H - 0.5),
  ];
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (const c of corners.slice(1)) ctx.lineTo(c.x, c.y);
  ctx.closePath();
  ctx.strokeStyle = COLOR_BORDER;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawFontaine(tag: string, gx: number, gy: number): void {
  const { x, y } = project(gx, gy);
  const phase = hashPhase(tag);
  const pulse = 0.5 + 0.5 * Math.sin((clock / FONTAINE_PERIOD + phase) * Math.PI * 2);
  const r = (5 + pulse * 2) * camera.zoom;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(244, 244, 244, ${0.35 + pulse * 0.4})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 2.5 * camera.zoom, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_BORDER;
  ctx.fill();
  drawTag(tag, gx, gy, 10 * camera.zoom);
}

function drawBuilding(tag: string, gx: number, gy: number): void {
  const { x, y } = project(gx, gy);
  const s = 9 * camera.zoom;
  ctx.fillStyle = COLOR_BUILDING;
  ctx.fillRect(x - s / 2, y - s / 2, s, s);
  drawTag(tag, gx, gy, s / 2);
}

function drawUnit(tag: string, gx: number, gy: number, busy: boolean): void {
  const phase = hashPhase(tag);
  const bob = Math.sin((clock / UNIT_PERIOD + phase) * Math.PI * 2) * 2 * camera.zoom;
  const { x, y } = project(gx, gy);
  const r = 4.5 * camera.zoom;

  if (isSelected(tag)) {
    const selPhase = hashPhase(`${tag}:sel`);
    const pulse = 0.5 + 0.5 * Math.sin((clock / SELECTION_PERIOD + selPhase) * Math.PI * 2);
    ctx.beginPath();
    ctx.arc(x, y + bob, r + 5 * camera.zoom, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + pulse * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(x, y + bob, r, 0, Math.PI * 2);
  ctx.fillStyle = busy ? COLOR_UNIT_BUSY : COLOR_UNIT;
  ctx.fill();
  drawTag(tag, gx, gy, r + Math.abs(bob));
}

export function render(dt: number): void {
  clock += dt;
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let gy = 0; gy < MAP_H; gy++) {
    for (let gx = 0; gx < MAP_W; gx++) {
      drawTile(gx, gy, terrain[gy][gx]);
    }
  }

  drawBorder();

  for (const f of fontaines) drawFontaine(f.tag, f.gx, f.gy);
  for (const b of buildings) drawBuilding(b.tag, b.gx, b.gy);
  for (const u of units) drawUnit(u.tag, u.gx, u.gy, u.harvesting || u.moving);
}
