import type { Position, Positions } from '../../../src/bridge/common/graph-state.type.ts';
import type { PositionRow } from '../../common/graph.type.ts';

const entryOf = (row: PositionRow): [string, Position] => {
  const [name, x, y] = row;
  const centre: Position = { x, y };

  return [name, centre];
};

/** A position table from `[name, x, y]` rows; an own key even for `__proto__`. */
export const positionsOf = (rows: PositionRow[]): Positions => Object.fromEntries(rows.map(entryOf));
