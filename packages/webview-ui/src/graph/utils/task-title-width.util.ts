import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { NodeSizer } from '../common/graph-page.type.ts';
import { TITLE_WHOLE_SLACK_PX } from '../common/graph-task.const.ts';
import { NODE_PADDING_X } from '../common/graph.const.ts';

const packageNameOf = (task: GraphTask): string => task.packageName;

/**
 * The width each task's package title needs to draw whole, measured once: the plain-text `sizeOf` width less the node
 * padding, rounded up, plus `TITLE_WHOLE_SLACK_PX`.
 */
export const titleWidthsOf = (tasks: GraphTask[], sizeOf: NodeSizer): Map<string, number> => {
  const packageNames = new Set(tasks.map(packageNameOf));
  const widths = new Map<string, number>();

  for (const packageName of packageNames) {
    const { width } = sizeOf(packageName);
    const textWidth = Math.ceil(width - NODE_PADDING_X);

    widths.set(packageName, textWidth + TITLE_WHOLE_SLACK_PX);
  }

  return widths;
};
