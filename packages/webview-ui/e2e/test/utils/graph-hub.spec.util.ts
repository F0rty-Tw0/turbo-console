import { indexesOf, largeEntryOf, nameOf } from './graph-large.spec.util.ts';
import { packageOf } from './graph-package.spec.util.ts';
import type { GraphEdge, GraphPackage, GraphReady, Positions } from '../../../src/bridge/common/graph-state.type.ts';
import { LARGE_PACKAGE_COUNT } from '../../common/graph.const.ts';

const TASK_COUNT_CYCLE = 7;

const HUB = nameOf(0);

const hubPackageOf = (index: number): GraphPackage => {
  const name = nameOf(index);

  return packageOf(name, `packages/${name}`, [], index % TASK_COUNT_CYCLE);
};

const dependentEdgeOf = (index: number): GraphEdge => {
  const edge: GraphEdge = { source: nameOf(index), target: HUB };

  return edge;
};

const hashOf = (count: number): string => `h0b${count.toString(16)}`;

/** `count` packages `pkg-000` on, 300 by default, with every package but `pkg-000` depending on it, cached on a 20-column grid. */
export const hubGraphState = (count = LARGE_PACKAGE_COUNT): GraphReady => {
  const indexes = indexesOf(count);
  const packages = indexes.map(hubPackageOf);
  const edges = indexes.slice(1).map(dependentEdgeOf);
  const positions: Positions = Object.fromEntries(indexes.map(largeEntryOf));
  const state: GraphReady = { kind: 'graph', hash: hashOf(count), packages, edges, positions, folderPositions: null };

  return state;
};
