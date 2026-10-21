import type { GraphState, Position, Positions } from '@turbo-console/webview-ui';

import type { GraphLayoutCacheEntry } from '../common/graph-cache.type.ts';

type PositionsMessage = {
  readonly hash: string;
  readonly positions: unknown;
};

const isRecord = (value: unknown): value is object => typeof value === 'object' && value !== null && !Array.isArray(value);

const pointOf = (value: unknown): Position | null => {
  if (!isRecord(value)) return null;

  if (!('x' in value) || !('y' in value)) return null;

  const { x, y } = value;

  if (typeof x !== 'number' || typeof y !== 'number') return null;

  const xFinite = Number.isFinite(x);
  const yFinite = Number.isFinite(y);

  if (!xFinite || !yFinite) return null;

  const point: Position = { x, y };

  return point;
};

/** Fresh `Positions` (only `x` and `y` kept) when every value is a finite point, else `null`. */
const finitePositionsOf = (raw: unknown): Positions | null => {
  if (!isRecord(raw)) return null;

  const positions: Record<string, Position> = {};

  for (const [name, value] of Object.entries(raw)) {
    const point = pointOf(value);

    if (point === null) return null;

    Object.defineProperty(positions, name, { value: point, enumerable: true });
  }

  return positions;
};

const coversExactly = (positions: Positions, packages: string[]): boolean => {
  const keys = new Set(Object.keys(positions));
  const coversAll = packages.every((name) => keys.has(name));

  return keys.size === packages.length && coversAll;
};

/** What a `positions` post may store: only the current graph's hash, with a point for every package and no other key. */
export const acceptedPositions = (state: GraphState, message: PositionsMessage): Positions | null => {
  if (state.kind !== 'graph' || message.hash !== state.hash) return null;

  const positions = finitePositionsOf(message.positions);

  if (positions === null) return null;

  return coversExactly(positions, state.packages) ? positions : null;
};

/** Reads what `workspaceState` hands back; anything that is not a hash with finite points is `null`. */
export const layoutEntryOf = (raw: unknown): GraphLayoutCacheEntry | null => {
  if (!isRecord(raw) || !('hash' in raw) || !('positions' in raw)) return null;

  if (typeof raw.hash !== 'string') return null;

  const positions = finitePositionsOf(raw.positions);

  if (positions === null) return null;

  const entry: GraphLayoutCacheEntry = { hash: raw.hash, positions };

  return entry;
};
