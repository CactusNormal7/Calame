export const selectionState = { tag: null as string | null };

export function select(tag: string | null): void {
  selectionState.tag = tag;
}

export function isSelected(tag: string): boolean {
  return selectionState.tag === tag;
}
