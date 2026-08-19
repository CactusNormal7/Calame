import { submitCommand, VERBS_BY_UNIT } from './commands.ts';
import { unitByTag } from './entities.ts';

const inputEl = document.querySelector<HTMLSpanElement>('#console-input')!;
const hintEl = document.querySelector<HTMLDivElement>('#hint-panel')!;

let buffer = '';

function render(): void {
  inputEl.textContent = buffer;
  updateHint();
}

function updateHint(): void {
  const firstToken = buffer.trim().split(/\s+/)[0];
  const unit = firstToken ? unitByTag(firstToken.toLowerCase()) : undefined;
  if (unit) {
    hintEl.textContent = VERBS_BY_UNIT[unit.kind]?.join('  ·  ') ?? '';
    hintEl.classList.remove('hidden');
  } else {
    hintEl.classList.add('hidden');
  }
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
      buffer = '';
      render();
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
