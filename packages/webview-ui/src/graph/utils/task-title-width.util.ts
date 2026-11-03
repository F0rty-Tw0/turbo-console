import { ownerTextOf } from './owner-text.util.ts';
import { scriptsBoxIdOf } from './task-compound.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { NodeSizer } from '../common/graph-page.type.ts';
import { SCRIPTS_BOX_TITLE, TITLE_WHOLE_SLACK_PX } from '../common/graph-task.const.ts';
import type { TaskLayoutRequest } from '../common/graph-task.type.ts';
import { NODE_PADDING_X } from '../common/graph.const.ts';

const packageNameOf = (task: GraphTask): string => task.packageName;

const isScript = (task: GraphTask): boolean => !task.isTurboTask;

/** The plain-text `sizeOf` width of `title` less the node padding, rounded up, plus `TITLE_WHOLE_SLACK_PX`. */
const titleWidthOf = (title: string, sizeOf: NodeSizer): number => {
  const { width } = sizeOf(title);
  const textWidth = Math.ceil(width - NODE_PADDING_X);

  return textWidth + TITLE_WHOLE_SLACK_PX;
};

/**
 * The width each box title of the shown tasks needs to draw whole, each text measured once: the printed owner text of
 * each package with a shown task, keyed by package name, then `SCRIPTS_BOX_TITLE` for each package with a shown script,
 * keyed by its Scripts box id.
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
  const scriptPackages = new Set(drawn.filter(isScript).map(packageNameOf));
  const widths = new Map<string, number>();

  for (const packageName of packageNames) widths.set(packageName, titleWidthOf(ownerTextOf(packageName, rootLabel), sizeOf));

  if (scriptPackages.size === 0) return widths;

  const scriptsWidth = titleWidthOf(SCRIPTS_BOX_TITLE, sizeOf);

  for (const packageName of scriptPackages) widths.set(scriptsBoxIdOf(packageName), scriptsWidth);

  return widths;
};
