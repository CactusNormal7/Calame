import {
  unitByTag,
  buildingByTag,
  locationByTag,
  nextTag,
  createBuilding,
  findBuildSpot,
  isBuildableTile,
  buildings,
  UNIT_KINDS,
  BUILDING_KINDS,
  type UnitKind,
  type BuildingKind,
} from './entities.ts';
import { fontaineAt } from '../world/map.ts';
import { state, log, spendInk } from './state.ts';

type Canonical = 'move' | 'harvest' | 'stop' | 'skip' | 'build' | 'produce';
export type VerbCategory = 'movement' | 'economy' | 'construction' | 'production' | 'utility';

export interface VerbDef {
  canonical: Canonical;
  tier: 'simple' | 'avance';
  category: VerbCategory;
  /** Description courte en anglais, utilisée par le panneau d'aide. */
  desc: string;
  /** Coût en encre à l'exécution réussie. Nul pour tout sauf la
   * construction/production : seule la création consomme de l'encre. */
  cost: number;
  waste: number;
  rateMul?: number;
}

export const BASE_HARVEST_RATE = 1.4;
const FAIL_WASTE_UNKNOWN = 2;
/** Distance max (Manhattan) entre l'unité et des coordonnées de construction
 * choisies explicitement — un chantier ne se lance pas à l'autre bout de la
 * carte depuis un seul ouvrier. */
export const BUILD_RANGE = 10;

export const VERBS: Record<string, VerbDef> = {
  go: {
    canonical: 'move',
    tier: 'simple',
    category: 'movement',
    desc: 'Move to a target (spring, building, or unit tag).',
    cost: 0,
    waste: 2,
  },
  mine: {
    canonical: 'harvest',
    tier: 'simple',
    category: 'economy',
    desc: 'Start harvesting ink at the spring under the unit.',
    cost: 0,
    waste: 5,
    rateMul: 1,
  },
  harvest: {
    canonical: 'harvest',
    tier: 'avance',
    category: 'economy',
    desc: 'Advanced harvest — higher yield, wastes more on mistakes.',
    cost: 0,
    waste: 8,
    rateMul: 1.7,
  },
  stop: {
    canonical: 'stop',
    tier: 'simple',
    category: 'utility',
    desc: 'Cancel the current move, harvest, or pending construction.',
    cost: 0,
    waste: 0,
  },
  skip: {
    canonical: 'skip',
    tier: 'simple',
    category: 'utility',
    desc: 'Run the obvious default action without typing the exact word.',
    cost: 0,
    waste: 0,
  },
  build: {
    canonical: 'build',
    tier: 'simple',
    category: 'construction',
    desc: 'Walk to the target if needed, then build. Optional exact tile: "<type> <gx> <gy>".',
    cost: 0,
    waste: 4,
  },
  train: {
    canonical: 'produce',
    tier: 'simple',
    category: 'production',
    desc: 'Queue a unit for training at this building.',
    cost: 0,
    waste: 4,
  },
};

export const VERBS_BY_UNIT: Record<UnitKind, string[]> = {
  worker: ['go <target>', 'mine', 'harvest', 'build <type> [gx gy]', 'stop', 'skip'],
  scout: ['go <target>', 'build <type> [gx gy]', 'stop', 'skip'],
  hauler: ['go <target>', 'mine', 'harvest', 'build <type> [gx gy]', 'stop', 'skip'],
};

export const VERBS_BY_BUILDING: Record<BuildingKind, string[]> = {
  hq: [],
  barracks: ['train <type>'],
};

const HELP_WORDS = new Set(['help', '?', '--help', '-h']);

let helpHandler: (() => void) | null = null;

/** Enregistre le composant d'UI responsable d'afficher l'aide (voir game/panels.ts).
 * Évite un import circulaire : ce module reste indépendant du DOM. */
export function setHelpHandler(fn: () => void): void {
  helpHandler = fn;
}

function fail(message: string, waste: number): void {
  spendInk(waste);
  log(`${message}${waste > 0 ? ` (-${waste} ink wasted)` : ''}`, 'error');
}

export function submitCommand(raw: string): void {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return;

  const tag = tokens[0].toLowerCase();
  const verbWord = tokens[1]?.toLowerCase();
  const argTag = tokens[2]?.toLowerCase();
  const argGx = tokens[3];
  const argGy = tokens[4];

  if (HELP_WORDS.has(tag)) {
    helpHandler?.();
    return;
  }

  const unit = unitByTag(tag);
  const building = !unit ? buildingByTag(tag) : undefined;

  if (!unit && !building) {
    if (VERBS[tag]) {
      fail(`"${tag}" is an action word, not a tag — add the unit first, e.g. "w1 ${tag}"`, FAIL_WASTE_UNKNOWN);
    } else {
      fail(`unknown tag: "${tag}" (type "help" for the list)`, FAIL_WASTE_UNKNOWN);
    }
    return;
  }
  if (!verbWord) {
    fail(`${tag}: incomplete command`, FAIL_WASTE_UNKNOWN);
    return;
  }

  const verb = VERBS[verbWord];
  if (!verb) {
    fail(`${tag}: unknown word "${verbWord}"`, FAIL_WASTE_UNKNOWN);
    return;
  }

  if (unit) {
    switch (verb.canonical) {
      case 'move': {
        if (!argTag) {
          fail(`${tag} go: missing destination`, verb.waste);
          return;
        }
        const dest = locationByTag(argTag);
        if (!dest) {
          fail(`${tag} go: unknown target "${argTag}"`, verb.waste);
          return;
        }
        spendInk(verb.cost);
        unit.targetGx = dest.gx;
        unit.targetGy = dest.gy;
        unit.moving = true;
        unit.harvesting = false;
        if (unit.pendingBuild) unit.pendingBuild = null;
        log(`${tag} heads to ${argTag}`, 'ok');
        break;
      }
      case 'harvest': {
        const kindDef = UNIT_KINDS[unit.kind];
        if (kindDef.harvestMul === 0) {
          fail(`${tag}: ${kindDef.label} cannot harvest`, verb.waste);
          return;
        }
        const here = fontaineAt(unit.gx, unit.gy);
        if (!here) {
          fail(`${tag}: no spring here`, verb.waste);
          return;
        }
        spendInk(verb.cost);
        unit.moving = false;
        unit.harvesting = true;
        unit.harvestRate = BASE_HARVEST_RATE * (verb.rateMul ?? 1) * kindDef.harvestMul;
        log(`${tag} ${verb.tier === 'avance' ? 'harvests intensely' : 'harvests'} at ${here.tag}`, 'ok');
        break;
      }
      case 'stop': {
        unit.moving = false;
        unit.harvesting = false;
        if (unit.pendingBuild) unit.pendingBuild = null;
        log(`${tag} stops`, 'ok');
        break;
      }
      case 'skip': {
        const here = fontaineAt(unit.gx, unit.gy);
        if (here && UNIT_KINDS[unit.kind].harvestMul > 0 && !unit.harvesting) {
          unit.harvesting = true;
          unit.harvestRate = BASE_HARVEST_RATE * UNIT_KINDS[unit.kind].harvestMul;
          log(`${tag}: simplified action -> harvesting at ${here.tag}`, 'ok');
        } else if (unit.moving || unit.harvesting) {
          unit.moving = false;
          unit.harvesting = false;
          log(`${tag}: simplified action -> stop`, 'ok');
        } else {
          log(`${tag}: nothing to simplify`, 'info');
        }
        break;
      }
      case 'build': {
        const buildingType = argTag as BuildingKind | undefined;
        const def = buildingType ? BUILDING_KINDS[buildingType] : undefined;
        if (!buildingType || !def || def.buildTime === 0) {
          fail(`${tag} build: unknown building type "${argTag ?? ''}"`, verb.waste);
          return;
        }
        if (unit.pendingBuild) {
          fail(`${tag}: already has a pending construction order`, verb.waste);
          return;
        }

        let spot: { gx: number; gy: number } | undefined;
        if (argGx !== undefined || argGy !== undefined) {
          const gx = Number(argGx);
          const gy = Number(argGy);
          if (!Number.isInteger(gx) || !Number.isInteger(gy)) {
            fail(`${tag} build: invalid coordinates "${argGx ?? ''} ${argGy ?? ''}"`, verb.waste);
            return;
          }
          const dist = Math.abs(gx - Math.round(unit.gx)) + Math.abs(gy - Math.round(unit.gy));
          if (dist > BUILD_RANGE) {
            fail(`${tag} build: too far (max ${BUILD_RANGE} tiles)`, verb.waste);
            return;
          }
          if (!isBuildableTile(gx, gy, tag)) {
            fail(`${tag} build: tile (${gx}, ${gy}) unreachable or occupied`, verb.waste);
            return;
          }
          spot = { gx, gy };
        } else {
          spot = findBuildSpot(Math.round(unit.gx), Math.round(unit.gy), tag);
          if (!spot) {
            fail(`${tag} build: no free tile nearby`, verb.waste);
            return;
          }
        }

        if (state.ink < def.buildCost) {
          fail(`${tag}: not enough ink to build`, 0);
          return;
        }
        spendInk(def.buildCost);

        const atSpot = Math.round(unit.gx) === spot.gx && Math.round(unit.gy) === spot.gy;
        if (atSpot) {
          const newTag = nextTag(buildingType);
          buildings.push(createBuilding(newTag, buildingType, spot.gx, spot.gy, false));
          log(`${tag} starts building ${newTag} (${def.label}) here`, 'ok');
        } else {
          unit.targetGx = spot.gx;
          unit.targetGy = spot.gy;
          unit.moving = true;
          unit.harvesting = false;
          unit.pendingBuild = { kind: buildingType, gx: spot.gx, gy: spot.gy };
          log(`${tag} heads to (${spot.gx}, ${spot.gy}) to build a ${def.label}`, 'ok');
        }
        break;
      }
      case 'produce':
        fail(`${tag}: a unit cannot "train"`, verb.waste);
        break;
    }
    return;
  }

  if (building) {
    switch (verb.canonical) {
      case 'produce': {
        const unitType = argTag as UnitKind | undefined;
        const def = unitType ? UNIT_KINDS[unitType] : undefined;
        if (!unitType || !def || !BUILDING_KINDS[building.kind].produces.includes(unitType)) {
          fail(`${tag} train: invalid unit type "${argTag ?? ''}"`, verb.waste);
          return;
        }
        if (building.constructing) {
          fail(`${tag}: building still under construction`, 0);
          return;
        }
        if (building.producing) {
          fail(`${tag}: training already in progress`, 0);
          return;
        }
        if (state.ink < def.buildCost) {
          fail(`${tag}: not enough ink`, 0);
          return;
        }
        spendInk(def.buildCost);
        building.producing = { kind: unitType, elapsed: 0, total: def.buildTime };
        log(`${tag}: training ${def.label} started`, 'ok');
        break;
      }
      default:
        fail(`${tag}: a building doesn't understand "${verbWord}"`, verb.waste);
        break;
    }
  }
}
