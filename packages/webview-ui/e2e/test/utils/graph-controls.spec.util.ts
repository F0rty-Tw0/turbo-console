import type { Position, Positions } from '../../../src/bridge/common/graph-state.type.ts';

const COLUMNS = 4;

const COLUMN_PITCH = 150;

const ROW_PITCH = 100;

const gridEntry = (name: string, index: number): [string, Position] => {
  const centre: Position = { x: (index % COLUMNS) * COLUMN_PITCH, y: Math.floor(index / COLUMNS) * ROW_PITCH };

  return [name, centre];
};

/** One centre per name on a fixed grid, four to a row; an own key even for `__proto__`. */
export const gridPositionsOf = (names: string[]): Positions => Object.fromEntries(names.map(gridEntry));

/** The opacity `element` is drawn at: its own times every ancestor's, as nested opacities multiply. Runs in the page. */
export const effectiveOpacityOf = (element: Element): number => {
  let opacity = 1;

  for (let node: Element | null = element; node !== null; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);

  return opacity;
};

/** `names` without `excluded`, in order. */
export const without = (names: string[], excluded: string[]): string[] => {
  const isKept = (name: string): boolean => !excluded.includes(name);

  return names.filter(isKept);
};
