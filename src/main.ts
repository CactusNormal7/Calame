import './style.css';
import { render } from './engine/render.ts';
import { updateCamera } from './engine/camera.ts';
import { units, buildings, createUnit, createBuilding, nextTag, findSpawnSpot, UNIT_KINDS, BUILDING_KINDS } from './game/entities.ts';
import { state, gainInk, log } from './game/state.ts';
import { initConsole, tickConsole } from './game/console.ts';
import { setHelpHandler } from './game/commands.ts';
import { openHelpPanel, tickInfoPanel } from './game/panels.ts';

const inkValueEl = document.querySelector<HTMLSpanElement>('#ink-value')!;
const feedEl = document.querySelector<HTMLDivElement>('#feed')!;

function updateUnits(dt: number): void {
  for (const u of units) {
    if (u.moving) {
      const dx = u.targetGx - u.gx;
      const dy = u.targetGy - u.gy;
      const dist = Math.hypot(dx, dy);
      const step = UNIT_KINDS[u.kind].speed * dt;
      if (dist <= step) {
        u.gx = u.targetGx;
        u.gy = u.targetGy;
        u.moving = false;

        if (u.pendingBuild) {
          const { kind, gx, gy } = u.pendingBuild;
          u.pendingBuild = null;
          const newTag = nextTag(kind);
          buildings.push(createBuilding(newTag, kind, gx, gy, false));
          log(`${u.tag} starts building ${newTag} (${BUILDING_KINDS[kind].label})`, 'ok');
        }
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

function updateBuildings(dt: number): void {
  for (const b of buildings) {
    if (b.constructing) {
      b.buildProgress = Math.min(1, b.buildProgress + dt / b.buildTime);
      if (b.buildProgress >= 1) {
        b.constructing = false;
        log(`${b.tag} is complete`, 'ok');
      }
    }
    if (b.producing) {
      b.producing.elapsed += dt;
      if (b.producing.elapsed >= b.producing.total) {
        const kind = b.producing.kind;
        const newTag = nextTag(kind);
        const spot = findSpawnSpot(b.gx, b.gy);
        units.push(createUnit(newTag, kind, spot.gx, spot.gy));
        log(`${b.tag} trains ${newTag} (${UNIT_KINDS[kind].label})`, 'ok');
        b.producing = null;
      }
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
  updateBuildings(dt);
  updateCamera(dt);
  render(dt);
  updateHud();
  tickInfoPanel();
  tickConsole();

  requestAnimationFrame(loop);
}

log('welcome — type a tag then a word, e.g. "w1 go f1"', 'info');
setHelpHandler(openHelpPanel);
initConsole();
requestAnimationFrame(loop);
