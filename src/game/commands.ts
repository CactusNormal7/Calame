import { unitByTag, locationByTag } from './entities.ts';
import { fontaineAt } from '../world/map.ts';
import { state, log, spendInk } from './state.ts';

type Canonical = 'move' | 'harvest' | 'stop' | 'skip';

interface VerbDef {
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
};

export const VERBS_BY_UNIT: Record<string, string[]> = {
  worker: ['va <cible>', 'mine', 'recolter', 'stop', 'passer'],
};

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

  const unit = unitByTag(tag);
  if (!unit) {
    fail(`tag inconnu : "${tag}"`, FAIL_WASTE_UNKNOWN);
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
      unit.harvestRate = BASE_HARVEST_RATE * (verb.rateMul ?? 1);
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
      if (here && !unit.harvesting) {
        unit.harvesting = true;
        unit.harvestRate = BASE_HARVEST_RATE;
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
  }
}
