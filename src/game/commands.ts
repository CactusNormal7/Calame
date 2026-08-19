import {
  unitByTag,
  buildingByTag,
  locationByTag,
  nextTag,
  createBuilding,
  findBuildSpot,
  buildings,
  UNIT_KINDS,
  BUILDING_KINDS,
  type UnitKind,
  type BuildingKind,
} from './entities.ts';
import { fontaineAt } from '../world/map.ts';
import { state, log, spendInk } from './state.ts';

type Canonical = 'move' | 'harvest' | 'stop' | 'skip' | 'build' | 'produce';

export interface VerbDef {
  canonical: Canonical;
  tier: 'simple' | 'avance';
  cost: number;
  waste: number;
  rateMul?: number;
}

export const BASE_HARVEST_RATE = 1.4;
const FAIL_WASTE_UNKNOWN = 2;

export const VERBS: Record<string, VerbDef> = {
  va: { canonical: 'move', tier: 'simple', cost: 1, waste: 2 },
  mine: { canonical: 'harvest', tier: 'simple', cost: 3, waste: 5, rateMul: 1 },
  recolter: { canonical: 'harvest', tier: 'avance', cost: 5, waste: 8, rateMul: 1.7 },
  stop: { canonical: 'stop', tier: 'simple', cost: 0, waste: 0 },
  passer: { canonical: 'skip', tier: 'simple', cost: 2, waste: 0 },
  construire: { canonical: 'build', tier: 'simple', cost: 0, waste: 4 },
  creer: { canonical: 'produce', tier: 'simple', cost: 0, waste: 4 },
};

export const VERBS_BY_UNIT: Record<UnitKind, string[]> = {
  worker: ['va <cible>', 'mine', 'recolter', 'construire <type>', 'stop', 'passer'],
  eclaireur: ['va <cible>', 'construire <type>', 'stop', 'passer'],
  porteur: ['va <cible>', 'mine', 'recolter', 'construire <type>', 'stop', 'passer'],
};

export const VERBS_BY_BUILDING: Record<BuildingKind, string[]> = {
  qg: [],
  caserne: ['creer <type>'],
};

const HELP_WORDS = new Set(['aide', 'help', '?', '--help', '-h']);

let helpHandler: (() => void) | null = null;

/** Enregistre le composant d'UI responsable d'afficher l'aide (voir game/panels.ts).
 * Évite un import circulaire : ce module reste indépendant du DOM. */
export function setHelpHandler(fn: () => void): void {
  helpHandler = fn;
}

function fail(message: string, waste: number): void {
  spendInk(waste);
  log(`${message}${waste > 0 ? ` (-${waste} encre gaspillée)` : ''}`, 'error');
}

export function submitCommand(raw: string): void {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return;

  const tag = tokens[0].toLowerCase();
  const verbWord = tokens[1]?.toLowerCase();
  const argTag = tokens[2]?.toLowerCase();

  if (HELP_WORDS.has(tag)) {
    helpHandler?.();
    return;
  }

  const unit = unitByTag(tag);
  const building = !unit ? buildingByTag(tag) : undefined;

  if (!unit && !building) {
    if (VERBS[tag]) {
      fail(`"${tag}" est un mot d'action, pas un tag — ajoute d'abord l'unité, ex. "w1 ${tag}"`, FAIL_WASTE_UNKNOWN);
    } else {
      fail(`tag inconnu : "${tag}" (tape "aide" pour la liste)`, FAIL_WASTE_UNKNOWN);
    }
    return;
  }
  if (!verbWord) {
    fail(`${tag} : commande incomplète`, FAIL_WASTE_UNKNOWN);
    return;
  }

  const verb = VERBS[verbWord];
  if (!verb) {
    fail(`${tag} : mot inconnu "${verbWord}"`, FAIL_WASTE_UNKNOWN);
    return;
  }

  if (unit) {
    switch (verb.canonical) {
      case 'move': {
        if (!argTag) {
          fail(`${tag} va : destination manquante`, verb.waste);
          return;
        }
        const dest = locationByTag(argTag);
        if (!dest) {
          fail(`${tag} va : cible inconnue "${argTag}"`, verb.waste);
          return;
        }
        if (state.ink < verb.cost) {
          fail(`${tag} : pas assez d'encre`, 0);
          return;
        }
        spendInk(verb.cost);
        unit.targetGx = dest.gx;
        unit.targetGy = dest.gy;
        unit.moving = true;
        unit.harvesting = false;
        log(`${tag} se dirige vers ${argTag}`, 'ok');
        break;
      }
      case 'harvest': {
        const kindDef = UNIT_KINDS[unit.kind];
        if (kindDef.harvestMul === 0) {
          fail(`${tag} : ${kindDef.label} ne peut pas récolter`, verb.waste);
          return;
        }
        const here = fontaineAt(unit.gx, unit.gy);
        if (!here) {
          fail(`${tag} : aucune fontaine ici`, verb.waste);
          return;
        }
        if (state.ink < verb.cost) {
          fail(`${tag} : pas assez d'encre`, 0);
          return;
        }
        spendInk(verb.cost);
        unit.moving = false;
        unit.harvesting = true;
        unit.harvestRate = BASE_HARVEST_RATE * (verb.rateMul ?? 1) * kindDef.harvestMul;
        log(`${tag} ${verb.tier === 'avance' ? 'récolte intensément' : 'récolte'} à ${here.tag}`, 'ok');
        break;
      }
      case 'stop': {
        unit.moving = false;
        unit.harvesting = false;
        log(`${tag} s'arrête`, 'ok');
        break;
      }
      case 'skip': {
        if (state.ink < verb.cost) {
          fail(`${tag} : pas assez d'encre pour passer`, 0);
          return;
        }
        spendInk(verb.cost);
        const here = fontaineAt(unit.gx, unit.gy);
        if (here && UNIT_KINDS[unit.kind].harvestMul > 0 && !unit.harvesting) {
          unit.harvesting = true;
          unit.harvestRate = BASE_HARVEST_RATE * UNIT_KINDS[unit.kind].harvestMul;
          log(`${tag} : action simplifiée -> récolte à ${here.tag}`, 'ok');
        } else if (unit.moving || unit.harvesting) {
          unit.moving = false;
          unit.harvesting = false;
          log(`${tag} : action simplifiée -> arrêt`, 'ok');
        } else {
          log(`${tag} : rien à simplifier`, 'info');
        }
        break;
      }
      case 'build': {
        const buildingType = argTag as BuildingKind | undefined;
        const def = buildingType ? BUILDING_KINDS[buildingType] : undefined;
        if (!buildingType || !def || def.buildTime === 0) {
          fail(`${tag} construire : type de bâtiment inconnu "${argTag ?? ''}"`, verb.waste);
          return;
        }
        const spot = findBuildSpot(Math.round(unit.gx), Math.round(unit.gy));
        if (!spot) {
          fail(`${tag} construire : aucune case libre à proximité`, verb.waste);
          return;
        }
        if (state.ink < def.buildCost) {
          fail(`${tag} : pas assez d'encre pour construire`, 0);
          return;
        }
        spendInk(def.buildCost);
        const newTag = nextTag(buildingType);
        buildings.push(createBuilding(newTag, buildingType, spot.gx, spot.gy, false));
        log(`${tag} commence la construction de ${newTag} (${def.label})`, 'ok');
        break;
      }
      case 'produce':
        fail(`${tag} : une unité ne peut pas "creer"`, verb.waste);
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
          fail(`${tag} creer : type d'unité invalide "${argTag ?? ''}"`, verb.waste);
          return;
        }
        if (building.constructing) {
          fail(`${tag} : bâtiment encore en construction`, 0);
          return;
        }
        if (building.producing) {
          fail(`${tag} : production déjà en cours`, 0);
          return;
        }
        if (state.ink < def.buildCost) {
          fail(`${tag} : pas assez d'encre`, 0);
          return;
        }
        spendInk(def.buildCost);
        building.producing = { kind: unitType, elapsed: 0, total: def.buildTime };
        log(`${tag} : production de ${def.label} lancée`, 'ok');
        break;
      }
      default:
        fail(`${tag} : un bâtiment ne comprend pas "${verbWord}"`, verb.waste);
        break;
    }
  }
}
