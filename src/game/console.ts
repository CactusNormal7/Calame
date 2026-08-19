import { submitCommand, VERBS_BY_UNIT } from './commands.ts';
import { unitByTag, units, buildings } from './entities.ts';
import { fontaines } from '../world/map.ts';
import { anyPanelOpen, closeAllPanels } from './panels.ts';

const inputEl = document.querySelector<HTMLSpanElement>('#console-input')!;
const hintEl = document.querySelector<HTMLDivElement>('#hint-panel')!;

let buffer = '';

const legendText = `unités : ${units.map((u) => u.tag).join(' ')}  ·  lieux : ${[...buildings, ...fontaines]
  .map((e) => e.tag)
  .join(' ')}  ·  tape "aide" pour l'aide`;

function render(): void {
  inputEl.textContent = buffer;
  updateHint();
}

function updateHint(): void {
  const firstToken = buffer.trim().split(/\s+/)[0];
  const unit = firstToken ? unitByTag(firstToken.toLowerCase()) : undefined;
  hintEl.textContent = unit ? VERBS_BY_UNIT[unit.kind]?.join('  ·  ') ?? '' : legendText;
  hintEl.classList.remove('hidden');
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
