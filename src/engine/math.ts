export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Décale de façon déterministe la phase d'une animation à partir d'un texte
 * (ex. le tag d'une unité), pour que plusieurs éléments du même type ne
 * pulsent jamais en même temps. */
export function hashPhase(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}
