import type { GraphHostMessage, GraphState, GraphStateMessage, Position, Positions } from '@turbo-console/webview-ui';
import { vi } from 'vitest';

import type { GraphLayoutCacheEntry } from '../../common/graph-cache.type.ts';
import type { GraphPorts } from '../../common/graph.type.ts';
import { cacheKeyOf } from '../../utils/graph-cache.util.ts';
import { packageNamesOf } from '../../utils/graph-package.util.ts';
import type { PostedGraph } from '../common/graph.type.ts';
import { graphPortsMock } from '../mocks/graph-ports.mock.ts';

/** The spy ports of a session on `/ws`; `flat` and `folders` seed the two layout caches of `/ws`. */
export const portsWith = (flat: GraphLayoutCacheEntry | null, folders: GraphLayoutCacheEntry | null = null): GraphPorts => {
  const seed = new Map<string, GraphLayoutCacheEntry>();

  if (flat !== null) seed.set(cacheKeyOf('/ws', 'flat'), flat);

  if (folders !== null) seed.set(cacheKeyOf('/ws', 'folders'), folders);

  return graphPortsMock(seed);
};

const isState = (message: GraphHostMessage): message is GraphStateMessage => message.type === 'state';

/** Every message posted so far, in order. */
export const postedOf = (ports: GraphPorts): GraphHostMessage[] => vi.mocked(ports.post).mock.calls.map(([message]) => message);

/** The states of every state message posted so far, in order. */
export const postedStatesOf = (ports: GraphPorts): GraphState[] => {
  const states = postedOf(ports).filter(isState);

  return states.map((message) => message.state);
};

/** The last posted state, which must be a `graph` state. */
export const lastStateOf = (ports: GraphPorts): PostedGraph => {
  const state = postedStatesOf(ports).at(-1);

  if (state?.kind !== 'graph') throw new Error(`last posted state is ${state?.kind ?? 'missing'}, not graph`);

  const posted: PostedGraph = {
    hash: state.hash,
    packages: packageNamesOf(state.packages),
    positions: state.positions,
    folderPositions: state.folderPositions
  };

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
