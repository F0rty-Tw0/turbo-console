import { ELK_OPTIONS, ELK_THOROUGH_MAX_LEAVES, LAYERING_DEFAULT, LAYERING_GROUPED_TASKS } from '../common/graph-layout.const.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import { FOLDER_PADDING_PX } from '../common/graph.const.ts';
import type { ElkLayering, ElkOptions } from '../common/layout.type.ts';

const PADDING = `[top=${FOLDER_PADDING_PX},left=${FOLDER_PADDING_PX},bottom=${FOLDER_PADDING_PX},right=${FOLDER_PADDING_PX}]`;

/** ELK's layering thoroughness for a graph of `leafCount` leaves: 7 up to `ELK_THOROUGH_MAX_LEAVES`, else 1. */
export const thoroughnessOf = (leafCount: number): string => {
  if (leafCount <= ELK_THOROUGH_MAX_LEAVES) return '7';

  return '1';
};

/** The layered options of a view of `leafCount` leaves, every leaf of the whole graph counted once, in `layering`. */
export const layeredOptionsOf = (leafCount: number, layering: ElkLayering): ElkOptions => {
  const thoroughness = thoroughnessOf(leafCount);
  const options = { ...ELK_OPTIONS, 'elk.layered.layering.strategy': layering, 'elk.layered.thoroughness': thoroughness };

  return options;
};

/** A padded compound: the layered options plus room for its frame. */
export const paddedOptionsOf = (leafCount: number, layering: ElkLayering): ElkOptions => {
  const layered = layeredOptionsOf(leafCount, layering);
  const options = { ...layered, 'elk.padding': PADDING };

  return options;
};

/** The grouped root: the layered options, with edges between packages of different folders laid out together. */
export const groupedRootOptionsOf = (leafCount: number, layering: ElkLayering): ElkOptions => {
  const layered = layeredOptionsOf(leafCount, layering);
  const options = { ...layered, 'elk.hierarchyHandling': 'INCLUDE_CHILDREN' };

  return options;
};

/** The grouped task view keeps its pre-U6c layering; every other view uses the default. */
export const taskLayeringOf = (naming: TaskNaming): ElkLayering => {
  if (naming.grouped) return LAYERING_GROUPED_TASKS;

  return LAYERING_DEFAULT;
};
