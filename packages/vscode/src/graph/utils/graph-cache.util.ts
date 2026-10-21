import type { GraphState, Position, Positions } from '@turbo-console/webview-ui';

import { isRecord } from './record.util.ts';
import type { GraphLayoutCacheEntry } from '../common/graph-cache.type.ts';
import { COORDINATE_MAX, PACKAGE_NAME_MAX } from '../common/graph.const.ts';

type PositionsMessage = {
  readonly hash: string;
  readonly positions: Positions;
};

const isCoordinate = (value: number): boolean => Number.isFinite(value) && Math.abs(value) <= COORDINATE_MAX;

const pointOf = (value: unknown): Position | null => {
  if (!isRecord(value)) return null;

  if (!('x' in value) || !('y' in value)) return null;

  const { x, y } = value;

  if (typeof x !== 'number' || typeof y !== 'number') return null;

  const xValid = isCoordinate(x);
  const yValid = isCoordinate(y);

  if (!xValid || !yValid) return null;

  const point: Position = { x, y };

  return point;
};

const isPlainRecord = (value: unknown): value is object => {
  if (!isRecord(value)) return false;

  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

/**
 * Fresh `Positions` (only `x` and `y` kept) when `raw` is a plain object whose every key is a package-length name and
 * every value a point within `COORDINATE_MAX`, else `null`. It walks own keys only, so an own `__proto__` key counts
 * like any other, and `Object.fromEntries` defines each key as an own property, so it never sets the prototype.
 */
export const parsePositions = (raw: unknown): Positions | null => {
  if (!isPlainRecord(raw)) return null;

  const entries: [string, Position][] = [];

  for (const [name, value] of Object.entries(raw)) {
    const point = pointOf(value);
    const isNameTooLong = name.length > PACKAGE_NAME_MAX;

    if (point === null || isNameTooLong) return null;

    entries.push([name, point]);
  }

  return Object.fromEntries(entries);
};

/** Whether `positions` has a key for every package and no other key. */
export const coversExactly = (positions: Positions, packages: string[]): boolean => {
  const keys = new Set(Object.keys(positions));
  const coversAll = packages.every((name) => keys.has(name));

  return keys.size === packages.length && coversAll;
};

/** What a parsed `positions` post may store: only the current graph's hash, with a point for every package and no other key. */
export const acceptedPositions = (state: GraphState, message: PositionsMessage): Positions | null => {
  if (state.kind !== 'graph' || message.hash !== state.hash) return null;

  return coversExactly(message.positions, state.packages) ? message.positions : null;
};

/** Reads what `workspaceState` hands back; anything that is not a hash with points within `COORDINATE_MAX` is `null`. */
export const layoutEntryOf = (raw: unknown): GraphLayoutCacheEntry | null => {
  if (!isRecord(raw) || !('hash' in raw) || !('positions' in raw)) return null;

  if (typeof raw.hash !== 'string') return null;

  const positions = parsePositions(raw.positions);

  if (positions === null) return null;

  const entry: GraphLayoutCacheEntry = { hash: raw.hash, positions };

  return entry;
};
