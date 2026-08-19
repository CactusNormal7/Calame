import { VERBS, VERBS_BY_UNIT } from './commands.ts';
import { units, buildings, unitByTag, type Unit } from './entities.ts';
import { fontaines } from '../world/map.ts';
import { select, selectionState } from './selection.ts';

const unitPanelEl = document.querySelector<HTMLDivElement>('#unit-panel')!;
const unitPanelBox = unitPanelEl.querySelector<HTMLDivElement>('.panel-box')!;
const helpPanelEl = document.querySelector<HTMLDivElement>('#help-panel')!;
const helpPanelBox = helpPanelEl.querySelector<HTMLDivElement>('.panel-box')!;

function stateLabel(u: Unit): string {
  if (u.harvesting) return `récolte (+${u.harvestRate.toFixed(1)} encre/s)`;
  if (u.moving) return `en déplacement vers (${Math.round(u.targetGx)}, ${Math.round(u.targetGy)})`;
  return 'en attente';
}

function renderUnitPanelContent(): void {
  const tag = selectionState.tag;
  const unit = tag ? unitByTag(tag) : undefined;
  if (!tag || !unit) return;
  unitPanelBox.innerHTML = `
    <div class="panel-title">${tag}</div>
    <div class="panel-row">unité · ${unit.kind}</div>
    <div class="panel-row">état : ${stateLabel(unit)}</div>
    <div class="panel-row">position : ${Math.round(unit.gx)}, ${Math.round(unit.gy)}</div>
    <div class="panel-hint">${(VERBS_BY_UNIT[unit.kind] ?? []).join('  ·  ')}</div>
  `;
}

export function openUnitPanel(tag: string, clientX: number, clientY: number): void {
  if (!unitByTag(tag)) return;
  select(tag);
  const x = Math.min(clientX + 14, window.innerWidth - 240);
  const y = Math.min(clientY + 14, window.innerHeight - 140);
  unitPanelEl.style.left = `${x}px`;
  unitPanelEl.style.top = `${y}px`;
  renderUnitPanelContent();
  unitPanelEl.classList.add('open');
  closeHelpPanel();
}

export function closeUnitPanel(): void {
  unitPanelEl.classList.remove('open');
  select(null);
}

/** Rafraîchit le contenu du panneau d'info tant qu'une unité est sélectionnée
 * et le panneau ouvert — appelé depuis la boucle de jeu. */
export function tickUnitPanel(): void {
  if (unitPanelEl.classList.contains('open')) renderUnitPanelContent();
}

function renderHelpContent(): void {
  const verbRows = Object.entries(VERBS)
    .map(
      ([word, v]) =>
        `<div class="panel-row"><span class="k">${word}</span><span class="tier">${v.tier}</span><span>coût ${v.cost}${v.waste > 0 ? ` · perte ${v.waste}` : ''}</span></div>`,
    )
    .join('');
  helpPanelBox.innerHTML = `
    <div class="panel-title">aide</div>
    <div class="panel-section">unités : ${units.map((u) => u.tag).join(' ')}</div>
    <div class="panel-section">lieux : ${[...buildings, ...fontaines].map((e) => e.tag).join(' ')}</div>
    <div class="panel-section">mots</div>
    ${verbRows}
    <div class="panel-section">caméra : molette = zoom · glisser ou flèches = déplacement</div>
  `;
}

export function openHelpPanel(): void {
  renderHelpContent();
  helpPanelEl.classList.add('open');
  closeUnitPanel();
}

export function closeHelpPanel(): void {
  helpPanelEl.classList.remove('open');
}

export function toggleHelpPanel(): void {
  if (helpPanelEl.classList.contains('open')) closeHelpPanel();
  else openHelpPanel();
}

export function anyPanelOpen(): boolean {
  return unitPanelEl.classList.contains('open') || helpPanelEl.classList.contains('open');
}

export function closeAllPanels(): void {
  closeUnitPanel();
  closeHelpPanel();
}
