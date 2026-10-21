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

/** `names` without `excluded`, in order. */
export const without = (names: string[], excluded: string[]): string[] => {
  const isKept = (name: string): boolean => !excluded.includes(name);

  return names.filter(isKept);
};
