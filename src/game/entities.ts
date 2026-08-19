import { fontaines } from '../world/map.ts';

export type UnitKind = 'worker';
export type BuildingKind = 'qg';

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

export interface Building {
  tag: string;
  kind: BuildingKind;
  gx: number;
  gy: number;
}

export interface Location {
  tag: string;
  gx: number;
  gy: number;
}

export const UNIT_SPEED = 2.2; // cases / seconde

export function createUnit(tag: string, gx: number, gy: number): Unit {
  return {
    tag,
    kind: 'worker',
    gx,
    gy,
    targetGx: gx,
    targetGy: gy,
    moving: false,
    harvesting: false,
    harvestRate: 0,
  };
}

export function createBuilding(tag: string, gx: number, gy: number): Building {
  return { tag, kind: 'qg', gx, gy };
}

export const buildings: Building[] = [createBuilding('qg', 5, 6)];

export const units: Unit[] = [createUnit('w1', 4, 6), createUnit('w2', 6, 6)];

export function unitByTag(tag: string): Unit | undefined {
  return units.find((u) => u.tag === tag);
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
