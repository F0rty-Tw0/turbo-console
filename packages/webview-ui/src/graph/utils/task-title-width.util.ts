import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { NodeSizer } from '../common/graph-page.type.ts';
import { NODE_PADDING_X } from '../common/graph.const.ts';

const packageNameOf = (task: GraphTask): string => task.packageName;

/** The title text width of each task's package, measured once and rounded up: the plain-text `sizeOf` width less the node padding. */
export const titleWidthsOf = (tasks: GraphTask[], sizeOf: NodeSizer): Map<string, number> => {
  const packageNames = new Set(tasks.map(packageNameOf));
  const widths = new Map<string, number>();

  for (const packageName of packageNames) {
    const { width } = sizeOf(packageName);

    widths.set(packageName, Math.ceil(width - NODE_PADDING_X));
  }

  return widths;
};
