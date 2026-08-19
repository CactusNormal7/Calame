import { submitCommand, VERBS_BY_UNIT, VERBS_BY_BUILDING } from './commands.ts';
import { unitByTag, buildingByTag, units, buildings } from './entities.ts';
import { fontaines } from '../world/map.ts';
import { anyPanelOpen, closeAllPanels } from './panels.ts';

const inputEl = document.querySelector<HTMLSpanElement>('#console-input')!;
const hintEl = document.querySelector<HTMLDivElement>('#hint-panel')!;

let buffer = '';

/** Recalculée à chaque frappe plutôt que figée au chargement : de nouveaux
 * bâtiments/unités apparaissent en cours de partie et doivent être listés. */
function legendText(): string {
  return `units: ${units.map((u) => u.tag).join(' ')}  ·  places: ${[...buildings, ...fontaines]
    .map((e) => e.tag)
    .join(' ')}  ·  type "help" for help`;
}

function render(): void {
  inputEl.textContent = buffer;
  updateHint();
}

function updateHint(): void {
  const firstToken = buffer.trim().split(/\s+/)[0];
  const tag = firstToken?.toLowerCase();
  const unit = tag ? unitByTag(tag) : undefined;
  const building = !unit && tag ? buildingByTag(tag) : undefined;

  if (unit) {
    hintEl.textContent = VERBS_BY_UNIT[unit.kind]?.join('  ·  ') ?? '';
  } else if (building) {
    const verbs = VERBS_BY_BUILDING[building.kind];
    hintEl.textContent = verbs.length > 0 ? verbs.join('  ·  ') : `${building.tag}: no commands`;
  } else {
    hintEl.textContent = legendText();
  }
  hintEl.classList.remove('hidden');
}

/** Rafraîchit le hint/légende en continu (appelé depuis la boucle de jeu) :
 * la liste des tags peut changer sans frappe (construction, production
 * terminée), le hint-panel ne doit pas rester figé sur son dernier état. */
export function tickConsole(): void {
  updateHint();
}

export function initConsole(): void {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Backspace') {
      buffer = buffer.slice(0, -1);
      render();
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter') {
      submitCommand(buffer);
      buffer = '';
      render();
      e.preventDefault();
      return;
    }

    if (e.key === 'Escape') {
      if (anyPanelOpen()) {
        closeAllPanels();
      } else {
        buffer = '';
        render();
      }
      e.preventDefault();
      return;
    }

    if (e.key.length === 1) {
      buffer += e.key;
      render();
      e.preventDefault();
    }
  });

  render();
}
