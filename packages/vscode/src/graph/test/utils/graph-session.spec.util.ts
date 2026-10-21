import type { GraphHostMessage, GraphState, Position, Positions } from '@turbo-console/webview-ui';
import { vi } from 'vitest';

import type { GraphLayoutCacheEntry } from '../../common/graph-cache.type.ts';
import type { GraphPorts } from '../../common/graph.type.ts';
import type { PostedGraph } from '../common/graph.type.ts';
import { graphPortsMock } from '../mocks/graph-ports.mock.ts';

/** The spy ports of a session on `/ws`; `cached` seeds the layout cache of `/ws`. */
export const portsWith = (cached: GraphLayoutCacheEntry | null): GraphPorts => {
  const seed = new Map<string, GraphLayoutCacheEntry>();

  if (cached !== null) seed.set('/ws', cached);

  return graphPortsMock(seed);
};

const postedOf = (ports: GraphPorts): GraphHostMessage[] => vi.mocked(ports.post).mock.calls.map(([message]) => message);

/** The states of every message posted so far, in order. */
export const postedStatesOf = (ports: GraphPorts): GraphState[] => postedOf(ports).map((message) => message.state);

/** The last posted state, which must be a `graph` state. */
export const lastStateOf = (ports: GraphPorts): PostedGraph => {
  const state = postedStatesOf(ports).at(-1);

  if (state?.kind !== 'graph') throw new Error(`last posted state is ${state?.kind ?? 'missing'}, not graph`);

  const posted: PostedGraph = { hash: state.hash, packages: state.packages, positions: state.positions };

  return posted;
};

const pointAt = (index: number): Position => {
  const point: Position = { x: index * 10, y: index * 5 };

  return point;
};

/** A finite point for every name. */
export const positionsOf = (packages: string[]): Positions => {
  const entries = packages.map((name, index): [string, Position] => [name, pointAt(index)]);

  return Object.fromEntries(entries);
};
