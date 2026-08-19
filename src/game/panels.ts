import { VERBS, VERBS_BY_UNIT, VERBS_BY_BUILDING, type VerbCategory } from './commands.ts';
import { units, buildings, unitByTag, buildingByTag, UNIT_KINDS, BUILDING_KINDS, type Unit, type Building } from './entities.ts';
import { fontaines } from '../world/map.ts';
import { select, selectionState } from './selection.ts';

const infoPanelEl = document.querySelector<HTMLDivElement>('#info-panel')!;
const infoPanelBox = infoPanelEl.querySelector<HTMLDivElement>('.panel-box')!;
const helpPanelEl = document.querySelector<HTMLDivElement>('#help-panel')!;
const helpPanelBox = helpPanelEl.querySelector<HTMLDivElement>('.panel-box')!;

function unitStateLabel(u: Unit): string {
  if (u.harvesting) return `harvesting (+${u.harvestRate.toFixed(1)} ink/s)`;
  if (u.pendingBuild) return `heading to build site (${u.pendingBuild.gx}, ${u.pendingBuild.gy})`;
  if (u.moving) return `moving to (${Math.round(u.targetGx)}, ${Math.round(u.targetGy)})`;
  return 'idle';
}

function buildingStateLabel(b: Building): string {
  if (b.constructing) return `building (${Math.round(b.buildProgress * 100)}%)`;
  if (b.producing) {
    const pct = Math.round((b.producing.elapsed / b.producing.total) * 100);
    return `training ${UNIT_KINDS[b.producing.kind].label} (${pct}%)`;
  }
  return 'idle';
}

function renderUnitInfo(u: Unit): void {
  infoPanelBox.innerHTML = `
    <div class="panel-title">${u.tag}</div>
    <div class="panel-row">unit · ${u.kind}</div>
    <div class="panel-row">state: ${unitStateLabel(u)}</div>
    <div class="panel-row">position: ${Math.round(u.gx)}, ${Math.round(u.gy)}</div>
    <div class="panel-hint">${(VERBS_BY_UNIT[u.kind] ?? []).join('  ·  ')}</div>
  `;
}

function renderBuildingInfo(b: Building): void {
  const verbs = VERBS_BY_BUILDING[b.kind];
  infoPanelBox.innerHTML = `
    <div class="panel-title">${b.tag}</div>
    <div class="panel-row">building · ${BUILDING_KINDS[b.kind].label}</div>
    <div class="panel-row">HP: ${b.hp}/${b.maxHp}</div>
    <div class="panel-row">state: ${buildingStateLabel(b)}</div>
    <div class="panel-row">position: ${b.gx}, ${b.gy}</div>
    <div class="panel-hint">${verbs.length > 0 ? verbs.join('  ·  ') : 'no commands'}</div>
  `;
}

function renderInfoPanelContent(): void {
  const tag = selectionState.tag;
  if (!tag) return;
  const unit = unitByTag(tag);
  if (unit) {
    renderUnitInfo(unit);
    return;
  }
  const building = buildingByTag(tag);
  if (building) renderBuildingInfo(building);
}

function positionInfoPanel(clientX: number, clientY: number): void {
  const x = Math.min(clientX + 14, window.innerWidth - 240);
  const y = Math.min(clientY + 14, window.innerHeight - 160);
  infoPanelEl.style.left = `${x}px`;
  infoPanelEl.style.top = `${y}px`;
}

export function openUnitInfoPanel(tag: string, clientX: number, clientY: number): void {
  if (!unitByTag(tag)) return;
  select(tag);
  positionInfoPanel(clientX, clientY);
  renderInfoPanelContent();
  infoPanelEl.classList.add('open');
  closeHelpPanel();
}

export function openBuildingInfoPanel(tag: string, clientX: number, clientY: number): void {
  if (!buildingByTag(tag)) return;
  select(tag);
  positionInfoPanel(clientX, clientY);
  renderInfoPanelContent();
  infoPanelEl.classList.add('open');
  closeHelpPanel();
}

export function closeInfoPanel(): void {
  infoPanelEl.classList.remove('open');
  select(null);
}

/** Rafraîchit le contenu du panneau d'info tant qu'une entité est
 * sélectionnée et le panneau ouvert — appelé depuis la boucle de jeu. */
export function tickInfoPanel(): void {
  if (infoPanelEl.classList.contains('open')) renderInfoPanelContent();
}

const CREATION_VERBS = new Set(['build', 'train']);
const CATEGORIES: { key: VerbCategory; label: string }[] = [
  { key: 'movement', label: 'Movement' },
  { key: 'economy', label: 'Economy' },
  { key: 'construction', label: 'Construction' },
  { key: 'production', label: 'Production' },
  { key: 'utility', label: 'Utility' },
];

function renderHelpContent(): void {
  const unitRows = Object.entries(UNIT_KINDS)
    .map(
      ([kind, def]) =>
        `<div class="panel-row"><span class="k">${kind}</span><span>ink ${def.buildCost} · ${def.buildTime}s</span></div><div class="panel-desc">${def.description}</div>`,
    )
    .join('');

  const buildingRows = Object.entries(BUILDING_KINDS)
    .map(
      ([kind, def]) =>
        `<div class="panel-row"><span class="k">${kind}</span><span>ink ${def.buildCost} · ${def.buildTime}s</span></div><div class="panel-desc">${def.description}</div>`,
    )
    .join('');

  const commandBlocks = CATEGORIES.map(({ key, label }) => {
    const rows = Object.entries(VERBS)
      .filter(([, v]) => v.category === key)
      .map(([word, v]) => {
        const cost = CREATION_VERBS.has(word) ? 'ink cost: see unit/building list above' : `ink cost 0 · waste ${v.waste} on mistakes`;
        return `<div class="panel-row"><span class="k">${word}</span><span class="tier">${v.tier}</span></div><div class="panel-desc">${v.desc} (${cost})</div>`;
      })
      .join('');
    return rows ? `<div class="panel-section">${label}</div>${rows}` : '';
  }).join('');

  helpPanelBox.innerHTML = `
    <div class="panel-title">help</div>
    <div class="panel-section">Units — tags: ${units.map((u) => u.tag).join(' ') || '—'}</div>
    ${unitRows}
    <div class="panel-section">Buildings — tags: ${buildings.map((b) => b.tag).join(' ') || '—'} · springs: ${fontaines.map((f) => f.tag).join(' ')}</div>
    ${buildingRows}
    ${commandBlocks}
    <div class="panel-section">Camera</div>
    <div class="panel-row">scroll = zoom on cursor · drag or arrow keys = pan</div>
  `;
}

export function openHelpPanel(): void {
  renderHelpContent();
  helpPanelEl.classList.add('open');
  closeInfoPanel();
}

export function closeHelpPanel(): void {
  helpPanelEl.classList.remove('open');
}

export function toggleHelpPanel(): void {
  if (helpPanelEl.classList.contains('open')) closeHelpPanel();
  else openHelpPanel();
}

export function anyPanelOpen(): boolean {
  return infoPanelEl.classList.contains('open') || helpPanelEl.classList.contains('open');
}

export function closeAllPanels(): void {
  closeInfoPanel();
  closeHelpPanel();
}
