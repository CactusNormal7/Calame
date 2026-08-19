export interface FeedEntry {
  text: string;
  kind: 'ok' | 'error' | 'info';
}

export const state = {
  ink: 20,
  feed: [] as FeedEntry[],
};

const FEED_MAX = 8;

export function log(text: string, kind: FeedEntry['kind'] = 'info'): void {
  state.feed.push({ text, kind });
  if (state.feed.length > FEED_MAX) state.feed.shift();
}

export function spendInk(amount: number): void {
  state.ink = Math.max(0, state.ink - amount);
}

export function gainInk(amount: number): void {
  state.ink += amount;
}
