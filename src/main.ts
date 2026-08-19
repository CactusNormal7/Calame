import './style.css';
import { render } from './engine/render.ts';
import { units, UNIT_SPEED } from './game/entities.ts';
import { state, gainInk, log } from './game/state.ts';
import { initConsole } from './game/console.ts';

const inkValueEl = document.querySelector<HTMLSpanElement>('#ink-value')!;
const feedEl = document.querySelector<HTMLDivElement>('#feed')!;

function updateUnits(dt: number): void {
  for (const u of units) {
    if (u.moving) {
      const dx = u.targetGx - u.gx;
      const dy = u.targetGy - u.gy;
      const dist = Math.hypot(dx, dy);
      const step = UNIT_SPEED * dt;
      if (dist <= step) {
        u.gx = u.targetGx;
        u.gy = u.targetGy;
        u.moving = false;
      } else {
        u.gx += (dx / dist) * step;
        u.gy += (dy / dist) * step;
      }
    }
    if (u.harvesting) {
      gainInk(u.harvestRate * dt);
    }
  }
}

function updateHud(): void {
  inkValueEl.textContent = Math.floor(state.ink).toString();
  feedEl.innerHTML = state.feed
    .map((entry) => `<div class="feed-entry feed-${entry.kind}">${entry.text}</div>`)
    .join('');
}

let last = performance.now();
function loop(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  updateUnits(dt);
  render(dt);
  updateHud();

  requestAnimationFrame(loop);
}

log('bienvenue — tape un tag puis un mot, ex. "w1 va f1"', 'info');
initConsole();
requestAnimationFrame(loop);
