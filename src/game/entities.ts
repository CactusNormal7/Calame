import { fontaines, terrain, Terrain, inBounds } from '../world/map.ts';

export type UnitKind = 'worker' | 'scout' | 'hauler';
export type BuildingKind = 'hq' | 'barracks';
export type UnitShape = 'circle' | 'triangle' | 'square';

export interface UnitKindDef {
  label: string;
  description: string;
  shape: UnitShape;
  speed: number;
  /** Harvest rate multiplier; 0 = cannot harvest. */
  harvestMul: number;
  buildCost: number;
  buildTime: number;
}

export interface BuildingKindDef {
  label: string;
  description: string;
  buildCost: number;
  buildTime: number;
  maxHp: number;
  produces: UnitKind[];
}

export const UNIT_KINDS: Record<UnitKind, UnitKindDef> = {
  worker: {
    label: 'worker',
    description: 'All-round unit. Moves, harvests ink, and can start construction.',
    shape: 'circle',
    speed: 2.2,
    harvestMul: 1,
    buildCost: 4,
    buildTime: 4,
  },
  scout: {
    label: 'scout',
    description: 'Fast scout. Cannot harvest, but reaches distant springs quickly.',
    shape: 'triangle',
    speed: 3.6,
    harvestMul: 0,
    buildCost: 3,
    buildTime: 3,
  },
  hauler: {
    label: 'hauler',
    description: 'Slow hauler. Harvests ink at a much higher rate than a worker.',
    shape: 'square',
    speed: 1.4,
    harvestMul: 1.8,
    buildCost: 6,
    buildTime: 6,
  },
};

export const BUILDING_KINDS: Record<BuildingKind, BuildingKindDef> = {
  hq: {
    label: 'hq',
    description: 'Home base. Cannot be commanded yet.',
    buildCost: 0,
    buildTime: 0,
    maxHp: 120,
    produces: [],
  },
  barracks: {
    label: 'barracks',
    description: 'Production building. Trains worker, scout and hauler units.',
    buildCost: 8,
    buildTime: 8,
    maxHp: 60,
    produces: ['worker', 'scout', 'hauler'],
  },
};

export interface PendingBuild {
  kind: BuildingKind;
  gx: number;
  gy: number;
}

export interface Unit {
  tag: string;
  kind: UnitKind;
  gx: number;
  gy: number;
  targetGx: number;
  targetGy: number;
  moving: boolean;
  harvesting: boolean;
  harvestRate: number;
  /** Construction en attente : l'unité doit d'abord arriver sur place
   * (elle est déjà en déplacement vers gx,gy) avant que le chantier ne
   * démarre réellement — voir main.ts. */
  pendingBuild: PendingBuild | null;
}

export interface BuildingProduction {
  kind: UnitKind;
  elapsed: number;
  total: number;
}

export interface Building {
  tag: string;
  kind: BuildingKind;
  gx: number;
  gy: number;
  constructing: boolean;
  buildProgress: number;
  buildTime: number;
  producing: BuildingProduction | null;
  hp: number;
  maxHp: number;
}

export interface Location {
  tag: string;
  gx: number;
  gy: number;
}

export function createUnit(tag: string, kind: UnitKind, gx: number, gy: number): Unit {
  return {
    tag,
    kind,
    gx,
    gy,
    targetGx: gx,
    targetGy: gy,
    moving: false,
    harvesting: false,
    harvestRate: 0,
    pendingBuild: null,
  };
}

export function createBuilding(tag: string, kind: BuildingKind, gx: number, gy: number, alreadyBuilt = true): Building {
  const def = BUILDING_KINDS[kind];
  return {
    tag,
    kind,
    gx,
    gy,
    constructing: !alreadyBuilt,
    buildProgress: alreadyBuilt ? 1 : 0,
    buildTime: def.buildTime,
    producing: null,
    hp: def.maxHp,
    maxHp: def.maxHp,
  };
}

export const buildings: Building[] = [createBuilding('hq', 'hq', 12, 10)];

export const units: Unit[] = [createUnit('w1', 'worker', 11, 10), createUnit('w2', 'worker', 13, 10)];

const tagCounters: Record<string, number> = { worker: 2, scout: 0, hauler: 0, barracks: 0 };
const TAG_PREFIX: Record<string, string> = { worker: 'w', scout: 's', hauler: 'h', barracks: 'b' };

export function nextTag(kind: UnitKind | BuildingKind): string {
  tagCounters[kind] = (tagCounters[kind] ?? 0) + 1;
  return `${TAG_PREFIX[kind]}${tagCounters[kind]}`;
}

export function unitByTag(tag: string): Unit | undefined {
  return units.find((u) => u.tag === tag);
}

export function buildingByTag(tag: string): Building | undefined {
  return buildings.find((b) => b.tag === tag);
}

export function buildingAt(gx: number, gy: number): Building | undefined {
  const rgx = Math.round(gx);
  const rgy = Math.round(gy);
  return buildings.find((b) => b.gx === rgx && b.gy === rgy);
}

function tileFree(gx: number, gy: number, ignoreUnitTag?: string): boolean {
  if (!inBounds(gx, gy)) return false;
  if (terrain[gy][gx] === Terrain.Water) return false;
  if (fontaines.some((f) => f.gx === gx && f.gy === gy)) return false;
  if (buildings.some((b) => b.gx === gx && b.gy === gy)) return false;
  if (units.some((u) => u.tag !== ignoreUnitTag && Math.round(u.gx) === gx && Math.round(u.gy) === gy)) return false;
  return true;
}

/** Case constructible : dans les limites, hors eau, et libre de tout
 * bâtiment/fontaine/unité (l'unité qui construit elle-même ne compte pas
 * comme un obstacle : elle est censée se tenir sur la case cible).
 * Utilisé pour valider une position choisie explicitement par le joueur
 * (commande "build <type> <gx> <gy>"). */
export function isBuildableTile(gx: number, gy: number, actingUnitTag?: string): boolean {
  return tileFree(gx, gy, actingUnitTag);
}

/** Cherche une case libre pour poser un nouveau bâtiment, en partant de
 * (gx,gy) puis en essayant les 4 voisines directes. `undefined` si aucune
 * n'est libre — évite qu'un bâtiment se superpose visuellement à l'unité
 * qui vient de le construire (étiquettes illisibles l'une sur l'autre). */
export function findBuildSpot(gx: number, gy: number, actingUnitTag?: string): { gx: number; gy: number } | undefined {
  const candidates = [
    { gx, gy },
    { gx: gx + 1, gy },
    { gx: gx - 1, gy },
    { gx, gy: gy + 1 },
    { gx, gy: gy - 1 },
  ];
  return candidates.find((c) => tileFree(c.gx, c.gy, actingUnitTag));
}

/** Même logique pour faire apparaître une unité produite près de son
 * bâtiment, sans jamais bloquer la production : retombe sur la position du
 * bâtiment si toutes les cases voisines sont occupées (les unités peuvent
 * se superposer entre elles, contrairement aux bâtiments). */
export function findSpawnSpot(gx: number, gy: number): { gx: number; gy: number } {
  return findBuildSpot(gx, gy) ?? { gx, gy };
}

export function locationByTag(tag: string): Location | undefined {
  const f = fontaines.find((f) => f.tag === tag);
  if (f) return { tag: f.tag, gx: f.gx, gy: f.gy };
  const b = buildings.find((b) => b.tag === tag);
  if (b) return { tag: b.tag, gx: b.gx, gy: b.gy };
  const u = units.find((u) => u.tag === tag);
  if (u) return { tag: u.tag, gx: u.gx, gy: u.gy };
  return undefined;
}
