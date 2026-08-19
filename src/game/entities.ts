import { fontaines, terrain, Terrain, inBounds } from '../world/map.ts';

export type UnitKind = 'worker' | 'eclaireur' | 'porteur';
export type BuildingKind = 'qg' | 'caserne';
export type UnitShape = 'circle' | 'triangle' | 'square';

export interface UnitKindDef {
  label: string;
  /** Description courte en anglais, utilisée par le panneau d'aide. */
  description: string;
  shape: UnitShape;
  speed: number;
  /** Multiplicateur de rendement de récolte ; 0 = ne peut pas récolter. */
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
    label: 'ouvrier',
    description: 'All-round unit. Moves, harvests ink, and can start construction.',
    shape: 'circle',
    speed: 2.2,
    harvestMul: 1,
    buildCost: 4,
    buildTime: 4,
  },
  eclaireur: {
    label: 'éclaireur',
    description: 'Fast scout. Cannot harvest, but reaches distant fontaines quickly.',
    shape: 'triangle',
    speed: 3.6,
    harvestMul: 0,
    buildCost: 3,
    buildTime: 3,
  },
  porteur: {
    label: 'porteur',
    description: 'Slow hauler. Harvests ink at a much higher rate than a worker.',
    shape: 'square',
    speed: 1.4,
    harvestMul: 1.8,
    buildCost: 6,
    buildTime: 6,
  },
};

export const BUILDING_KINDS: Record<BuildingKind, BuildingKindDef> = {
  qg: {
    label: 'qg',
    description: 'Home base. Cannot be commanded yet.',
    buildCost: 0,
    buildTime: 0,
    maxHp: 120,
    produces: [],
  },
  caserne: {
    label: 'caserne',
    description: 'Production building. Trains worker, eclaireur and porteur units.',
    buildCost: 8,
    buildTime: 8,
    maxHp: 60,
    produces: ['worker', 'eclaireur', 'porteur'],
  },
};

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

export const buildings: Building[] = [createBuilding('qg', 'qg', 12, 10)];

export const units: Unit[] = [createUnit('w1', 'worker', 11, 10), createUnit('w2', 'worker', 13, 10)];

const tagCounters: Record<string, number> = { worker: 2, eclaireur: 0, porteur: 0, caserne: 0 };
const TAG_PREFIX: Record<string, string> = { worker: 'w', eclaireur: 'e', porteur: 'p', caserne: 'b' };

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

function tileFree(gx: number, gy: number): boolean {
  if (!inBounds(gx, gy)) return false;
  if (terrain[gy][gx] === Terrain.Water) return false;
  if (fontaines.some((f) => f.gx === gx && f.gy === gy)) return false;
  if (buildings.some((b) => b.gx === gx && b.gy === gy)) return false;
  if (units.some((u) => Math.round(u.gx) === gx && Math.round(u.gy) === gy)) return false;
  return true;
}

/** Case constructible : dans les limites, hors eau, et libre de tout
 * bâtiment/fontaine/unité. Utilisé pour valider une position choisie
 * explicitement par le joueur (commande "construire <type> <gx> <gy>"). */
export function isBuildableTile(gx: number, gy: number): boolean {
  return tileFree(gx, gy);
}

/** Cherche une case libre pour poser un nouveau bâtiment, en partant de
 * (gx,gy) puis en essayant les 4 voisines directes. `undefined` si aucune
 * n'est libre — évite qu'un bâtiment se superpose visuellement à l'unité
 * qui vient de le construire (étiquettes illisibles l'une sur l'autre). */
export function findBuildSpot(gx: number, gy: number): { gx: number; gy: number } | undefined {
  const candidates = [
    { gx, gy },
    { gx: gx + 1, gy },
    { gx: gx - 1, gy },
    { gx, gy: gy + 1 },
    { gx, gy: gy - 1 },
  ];
  return candidates.find((c) => tileFree(c.gx, c.gy));
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
