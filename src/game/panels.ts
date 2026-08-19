import { VERBS, VERBS_BY_UNIT, VERBS_BY_BUILDING, type VerbCategory } from './commands.ts';
import { units, buildings, unitByTag, buildingByTag, UNIT_KINDS, BUILDING_KINDS, type Unit, type Building } from './entities.ts';
import { fontaines } from '../world/map.ts';
import { select, selectionState } from './selection.ts';

const infoPanelEl = document.querySelector<HTMLDivElement>('#info-panel')!;
const infoPanelBox = infoPanelEl.querySelector<HTMLDivElement>('.panel-box')!;
const helpPanelEl = document.querySelector<HTMLDivElement>('#help-panel')!;
const helpPanelBox = helpPanelEl.querySelector<HTMLDivElement>('.panel-box')!;

function unitStateLabel(u: Unit): string {
  if (u.harvesting) return `récolte (+${u.harvestRate.toFixed(1)} encre/s)`;
  if (u.moving) return `en déplacement vers (${Math.round(u.targetGx)}, ${Math.round(u.targetGy)})`;
  return 'en attente';
}

function buildingStateLabel(b: Building): string {
  if (b.constructing) return `construction (${Math.round(b.buildProgress * 100)}%)`;
  if (b.producing) {
    const pct = Math.round((b.producing.elapsed / b.producing.total) * 100);
    return `production de ${UNIT_KINDS[b.producing.kind].label} (${pct}%)`;
  }
  return 'en attente';
}

function renderUnitInfo(u: Unit): void {
  infoPanelBox.innerHTML = `
    <div class="panel-title">${u.tag}</div>
    <div class="panel-row">unité · ${u.kind}</div>
    <div class="panel-row">état : ${unitStateLabel(u)}</div>
    <div class="panel-row">position : ${Math.round(u.gx)}, ${Math.round(u.gy)}</div>
    <div class="panel-hint">${(VERBS_BY_UNIT[u.kind] ?? []).join('  ·  ')}</div>
  `;
}

function renderBuildingInfo(b: Building): void {
  const verbs = VERBS_BY_BUILDING[b.kind];
  infoPanelBox.innerHTML = `
    <div class="panel-title">${b.tag}</div>
    <div class="panel-row">bâtiment · ${BUILDING_KINDS[b.kind].label}</div>
    <div class="panel-row">PV : ${b.hp}/${b.maxHp}</div>
    <div class="panel-row">état : ${buildingStateLabel(b)}</div>
    <div class="panel-row">position : ${b.gx}, ${b.gy}</div>
    <div class="panel-hint">${verbs.length > 0 ? verbs.join('  ·  ') : 'aucune commande'}</div>
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

const VARIABLE_COST_VERBS = new Set(['construire', 'creer']);
const CATEGORIES: { key: VerbCategory; label: string }[] = [
  { key: 'movement', label: 'Movement' },
  { key: 'economy', label: 'Economy' },
  { key: 'construction', label: 'Construction' },
  { key: 'production', label: 'Production' },
  { key: 'utility', label: 'Utility' },
];

function renderHelpContent(): void {
  const unitRows = Object.entries(UNIT_KINDS)
    .map(([kind, def]) => `<div class="panel-row"><span class="k">${kind}</span></div><div class="panel-desc">${def.description}</div>`)
    .join('');

  const buildingRows = Object.entries(BUILDING_KINDS)
    .map(([kind, def]) => `<div class="panel-row"><span class="k">${kind}</span></div><div class="panel-desc">${def.description}</div>`)
    .join('');

  const commandBlocks = CATEGORIES.map(({ key, label }) => {
    const rows = Object.entries(VERBS)
      .filter(([, v]) => v.category === key)
      .map(([word, v]) => {
        const cost = VARIABLE_COST_VERBS.has(word) ? 'variable cost' : `cost ${v.cost}${v.waste > 0 ? ` · waste ${v.waste}` : ''}`;
        return `<div class="panel-row"><span class="k">${word}</span><span class="tier">${v.tier}</span><span>${cost}</span></div><div class="panel-desc">${v.desc}</div>`;
      })
      .join('');
    return rows ? `<div class="panel-section">${label}</div>${rows}` : '';
  }).join('');

  helpPanelBox.innerHTML = `
    <div class="panel-title">help</div>
    <div class="panel-section">Units — tags : ${units.map((u) => u.tag).join(' ') || '—'}</div>
    ${unitRows}
    <div class="panel-section">Buildings — tags : ${buildings.map((b) => b.tag).join(' ') || '—'} · fontaines : ${fontaines.map((f) => f.tag).join(' ')}</div>
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
