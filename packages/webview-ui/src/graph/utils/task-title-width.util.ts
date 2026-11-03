import { folderTitleOf } from './controls-text.util.ts';
import { folderIdOf } from './folder-id.util.ts';
import { ownerTextOf } from './owner-text.util.ts';
import { scriptPackagesOf, scriptsBoxIdOf, taskFoldersOf, taskPackagesOf } from './task-compound.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { NodeSizer } from '../common/graph-page.type.ts';
import { SCRIPTS_BOX_TITLE, TITLE_WHOLE_SLACK_PX } from '../common/graph-task.const.ts';
import type { TaskLayoutRequest, TaskNaming } from '../common/graph-task.type.ts';
import { NODE_PADDING_X } from '../common/graph.const.ts';

/** The plain-text `sizeOf` width of `title` less the node padding, rounded up, plus `TITLE_WHOLE_SLACK_PX`. */
const titleWidthOf = (title: string, sizeOf: NodeSizer): number => {
  const { width } = sizeOf(title);
  const textWidth = Math.ceil(width - NODE_PADDING_X);

  return textWidth + TITLE_WHOLE_SLACK_PX;
};

/** While grouped, the `folderTitleOf` width of each folder holding one of `packageNames`, keyed by its folder box id. */
const setFolderWidths = (
  widths: Map<string, number>,
  packageNames: ReadonlySet<string>,
  naming: TaskNaming,
  sizeOf: NodeSizer
): void => {
  const folders = taskFoldersOf(packageNames, naming);

  for (const folder of folders) widths.set(folderIdOf(folder), titleWidthOf(folderTitleOf(folder), sizeOf));
};

/**
 * The width each box title of the shown tasks needs to draw whole, each text measured once: the printed owner text of
 * each package with a shown task, keyed by package name; while grouped, `folderTitleOf` of each folder of those
 * packages, keyed by its folder box id; then `SCRIPTS_BOX_TITLE` for each package with a shown script, keyed by its
 * Scripts box id. Box ids keep a folder `apps` and a package `apps` apart.
 */
export const titleWidthsOf = (
  request: Pick<TaskLayoutRequest, 'tasks' | 'shown' | 'naming'>,
  sizeOf: NodeSizer,
  rootLabel: string | null
): Map<string, number> => {
  const { tasks, shown, naming } = request;
  const isShown = (task: GraphTask): boolean => shown.has(task.id);
  const drawn = tasks.filter(isShown);
  const packageNames = taskPackagesOf(drawn);
  const scriptPackages = scriptPackagesOf(drawn);
  const widths = new Map<string, number>();

  for (const packageName of packageNames)
    widths.set(packageName, titleWidthOf(ownerTextOf(packageName, rootLabel, naming.labels), sizeOf));

  setFolderWidths(widths, packageNames, naming, sizeOf);

  if (scriptPackages.size === 0) return widths;

  const scriptsWidth = titleWidthOf(SCRIPTS_BOX_TITLE, sizeOf);

  for (const packageName of scriptPackages) widths.set(scriptsBoxIdOf(packageName), scriptsWidth);

  return widths;
};
