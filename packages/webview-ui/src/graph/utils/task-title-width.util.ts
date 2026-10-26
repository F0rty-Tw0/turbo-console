import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { NodeSizer } from '../common/graph-page.type.ts';
import { NODE_PADDING_X } from '../common/graph.const.ts';

/** The title text width of each task's package, rounded up: the plain-text `sizeOf` width less the node padding. */
export const titleWidthsOf = (tasks: GraphTask[], sizeOf: NodeSizer): Map<string, number> => {
  const widths = new Map<string, number>();

  for (const { packageName } of tasks) {
    const { width } = sizeOf(packageName);

    widths.set(packageName, Math.ceil(width - NODE_PADDING_X));
  }

  return widths;
};
