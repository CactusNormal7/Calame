import { clamp } from './math.ts';
import { TILE_H } from './iso.ts';
import { MAP_H } from '../world/map.ts';

export const camera = {
  panX: 0,
  panY: 0,
  zoom: 1,
};

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.2;
const KEY_PAN_SPEED = 420; // px/s à zoom 1
const CLICK_MOVE_THRESHOLD = 6; // px : au-delà, un mousedown+mouseup est un glissé, pas un clic

export type ClickHandler = (screenX: number, screenY: number) => void;
export type MoveHandler = (screenX: number, screenY: number) => void;

const heldKeys = new Set<string>();
let dragging = false;
let dragStartX = 0;
let dragStartY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let moved = 0;

/** Origine écran de la carte — seule source de vérité pour la projection
 * (utilisée à la fois par le rendu et par le calcul de zoom sur le
 * curseur, pour qu'ils ne divergent jamais). */
export function getOrigin(): { x: number; y: number } {
  return {
    x: window.innerWidth / 2 + camera.panX,
    y: window.innerHeight / 2 - ((MAP_H * TILE_H) / 4) * camera.zoom + camera.panY,
  };
}

function zoomAt(mx: number, my: number, factor: number): void {
  const nextZoom = clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  if (nextZoom === camera.zoom) return;

  // Décalage du curseur par rapport à l'origine actuelle : ce vecteur
  // représente le même point du monde et doit rester sous le curseur une
  // fois le zoom appliqué, quelle que soit la formule de l'origine (celle-ci
  // contient un terme de recentrage qui dépend lui-même du zoom, donc un
  // simple ratio sur panX/panY ne suffit pas).
  const originBefore = getOrigin();
  const dx = mx - originBefore.x;
  const dy = my - originBefore.y;
  const ratio = nextZoom / camera.zoom;

  camera.zoom = nextZoom;
  const originAfter = getOrigin(); // même pan, nouveau zoom
  camera.panX += mx - dx * ratio - originAfter.x;
  camera.panY += my - dy * ratio - originAfter.y;
}

export function initCamera(
  canvas: HTMLCanvasElement,
  initialZoom: number,
  onClick?: ClickHandler,
  onZoom?: () => void,
  onMove?: MoveHandler,
): void {
  camera.zoom = clamp(initialZoom, MIN_ZOOM, MAX_ZOOM);

  window.addEventListener('keydown', (e) => {
    if (e.key.startsWith('Arrow')) {
      heldKeys.add(e.key);
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    heldKeys.delete(e.key);
  });
  window.addEventListener('blur', () => heldKeys.clear());

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
      onZoom?.();
    },
    { passive: false },
  );

  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    moved = 0;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mouseup', (e) => {
    if (dragging && e.button === 0 && moved < CLICK_MOVE_THRESHOLD) {
      onClick?.(e.clientX, e.clientY);
    }
    dragging = false;
    canvas.style.cursor = 'grab';
  });
  window.addEventListener('mousemove', (e) => {
    onMove?.(e.clientX, e.clientY);
    if (!dragging) return;
    camera.panX += e.clientX - lastMouseX;
    camera.panY += e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    moved = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.style.cursor = 'grab';
}

export function updateCamera(dt: number): void {
  const step = (KEY_PAN_SPEED / camera.zoom) * dt;
  if (heldKeys.has('ArrowUp')) camera.panY += step;
  if (heldKeys.has('ArrowDown')) camera.panY -= step;
  if (heldKeys.has('ArrowLeft')) camera.panX += step;
  if (heldKeys.has('ArrowRight')) camera.panX -= step;
}
