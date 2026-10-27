import { packageOf } from './graph-package.spec.util.ts';
import type { GraphEdge, GraphPackage, GraphReady, Position, Positions } from '../../../src/bridge/common/graph-state.type.ts';
import { LARGE_PACKAGE_COUNT } from '../../common/graph.const.ts';

const GROUP_COUNT = 30;

const TAG_COUNT = 10;

const GRID_COLUMNS = 20;

const GRID_SPACING = 120;

/** `0` to `count - 1`, in order. */
export const indexesOf = (count: number): number[] => {
  const slots = Array.from({ length: count });

  return Array.from(slots.keys());
};

export const nameOf = (index: number): string => `pkg-${String(index).padStart(3, '0')}`;

const largePackageOf = (index: number): GraphPackage => {
  const name = nameOf(index);
  const tags = [`tag-${index % TAG_COUNT}`, `tag-${(index + 3) % TAG_COUNT}`];

  return packageOf(name, `group-${index % GROUP_COUNT}/${name}`, tags);
};

/** `pkg-i` needs its neighbour `pkg-(i-1)`, and from `pkg-2` on the earlier `pkg-floor(i / 3)`; targets have the lower index. */
const largeEdgesFrom = (index: number): GraphEdge[] => {
  if (index === 0) return [];

  const source = nameOf(index);
  const neighbour: GraphEdge = { source, target: nameOf(index - 1) };

  if (index === 1) return [neighbour];

  const earlier: GraphEdge = { source, target: nameOf(Math.floor(index / 3)) };

  return [neighbour, earlier];
};

export const largeEntryOf = (index: number): [string, Position] => {
  const centre: Position = { x: (index % GRID_COLUMNS) * GRID_SPACING, y: Math.floor(index / GRID_COLUMNS) * GRID_SPACING };

  return [nameOf(index), centre];
};

const hashOf = (count: number): string => `b16b${count.toString(16).padStart(4, '0')}`;

/** `count` packages `pkg-000` on, 300 by default, in 30 folders and 10 tags, two edges each, cached on a 20-column grid; the hash follows `count`. */
export const largeState = (count = LARGE_PACKAGE_COUNT): GraphReady => {
  const indexes = indexesOf(count);
  const packages = indexes.map(largePackageOf);
  const edges = indexes.flatMap(largeEdgesFrom);
  const positions: Positions = Object.fromEntries(indexes.map(largeEntryOf));
  const state: GraphReady = {
    kind: 'graph',
    singlePackage: false,
    rootLabel: null,
    hash: hashOf(count),
    packages,
    edges,
    positions,
    folderPositions: null,
    tasks: [],
    atomGroups: []
  };

  return state;
};
