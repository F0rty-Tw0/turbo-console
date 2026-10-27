import { ownerTextOf } from './owner-text.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { NodeSizer } from '../common/graph-page.type.ts';
import { TITLE_WHOLE_SLACK_PX } from '../common/graph-task.const.ts';
import type { TaskLayoutRequest } from '../common/graph-task.type.ts';
import { NODE_PADDING_X } from '../common/graph.const.ts';

const packageNameOf = (task: GraphTask): string => task.packageName;

/**
 * The width the title of each package with a shown task needs to draw whole, measured once: the plain-text `sizeOf`
 * width of its printed owner text less the node padding, rounded up, plus `TITLE_WHOLE_SLACK_PX`; keyed by package name.
 */
export const titleWidthsOf = (
  request: Pick<TaskLayoutRequest, 'tasks' | 'shown'>,
  sizeOf: NodeSizer,
  rootLabel: string | null
): Map<string, number> => {
  const { tasks, shown } = request;
  const isShown = (task: GraphTask): boolean => shown.has(task.id);
  const drawn = tasks.filter(isShown);
  const packageNames = new Set(drawn.map(packageNameOf));
  const widths = new Map<string, number>();

  for (const packageName of packageNames) {
    const { width } = sizeOf(ownerTextOf(packageName, rootLabel));
    const textWidth = Math.ceil(width - NODE_PADDING_X);

    widths.set(packageName, textWidth + TITLE_WHOLE_SLACK_PX);
  }

  return widths;
};
