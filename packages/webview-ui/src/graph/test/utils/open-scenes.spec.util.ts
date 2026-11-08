import type { ElementDefinition } from 'cytoscape';

import type { Position } from '../../../bridge/common/graph-state.type.ts';
import { edgeIdOf } from '../../utils/edge-id.util.ts';
import { folderIdOf } from '../../utils/folder-id.util.ts';

const GRID_COLUMNS = 20;

const GRID_SPACING = 120;

const LARGE_GROUP_COUNT = 30;

const indexesOf = (count: number): number[] => {
  const slots = Array.from({ length: count });

  return Array.from(slots.keys());
};

const packageNameOf = (index: number): string => `pkg-${String(index).padStart(3, '0')}`;

const gridOf = (index: number): Position => {
  const position: Position = { x: (index % GRID_COLUMNS) * GRID_SPACING, y: Math.floor(index / GRID_COLUMNS) * GRID_SPACING };

  return position;
};

const linkOf = (source: string, target: string): ElementDefinition => {
  const data = { id: edgeIdOf({ source, target }), source, target };
  const definition: ElementDefinition = { data };

  return definition;
};

/** `pkg-i` needs `pkg-(i-1)` and, from `pkg-2` on, `pkg-floor(i / 3)`, as `largeState` draws them. */
const largeLinksFrom = (index: number): ElementDefinition[] => {
  if (index === 0) return [];

  const source = packageNameOf(index);
  const neighbour = linkOf(source, packageNameOf(index - 1));

  if (index === 1) return [neighbour];

  const earlier = linkOf(source, packageNameOf(Math.floor(index / 3)));

  return [neighbour, earlier];
};

const largeBoxOf = (group: number): ElementDefinition => {
  const data = { id: folderIdOf(`group-${group}`), title: `group-${group}` };
  const definition: ElementDefinition = { data };

  return definition;
};

const largePackageOf = (index: number): ElementDefinition => {
  const data = { id: packageNameOf(index), width: 96, height: 32, parent: folderIdOf(`group-${index % LARGE_GROUP_COUNT}`) };
  const definition: ElementDefinition = { data, position: gridOf(index) };

  return definition;
};

/** `largeState`'s packages grouped into their folder boxes on its 20-column grid, with its two links each. */
export const largeGroupedElementsOf = (count: number): ElementDefinition[] => {
  const indexes = indexesOf(count);
  const groupCount = Math.min(count, LARGE_GROUP_COUNT);
  const boxes = indexesOf(groupCount).map(largeBoxOf);
  const packages = indexes.map(largePackageOf);
  const links = indexes.flatMap(largeLinksFrom);

  return [...boxes, ...packages, ...links];
};
