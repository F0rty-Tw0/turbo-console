import { COMPOUND_OPTIONS } from './elk-grouped-graph.util.ts';
import { folderIdOf } from './folder-id.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { SCRIPTS_BOX_PREFIX, TASK_BOX_PREFIX } from '../common/graph-task.const.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import { FOLDER_PADDING_PX } from '../common/graph.const.ts';

/** The compound id of a task's package; the root package `//` gives `pkg://`. */
export const taskBoxIdOf = (packageName: string): string => `${TASK_BOX_PREFIX}${packageName}`;

/** The id of the compound that holds a package's script tasks inside its package box; the root `//` gives `scripts://`. */
export const scriptsBoxIdOf = (packageName: string): string => `${SCRIPTS_BOX_PREFIX}${packageName}`;

/** The compound a task is drawn in: its package box for a turbo task, the package's Scripts box for a script. */
export const parentIdOf = (task: GraphTask): string => {
  const { packageName, isTurboTask } = task;
  const packageBox = taskBoxIdOf(packageName);
  const scriptsBox = scriptsBoxIdOf(packageName);
  const parent = isTurboTask ? packageBox : scriptsBox;

  return parent;
};

/** The folder of a package's path; the root `//` and a package the folders map lacks are in the root folder `''`. */
export const taskFolderOf = (packageName: string, naming: TaskNaming): string => naming.folders.get(packageName) ?? '';

/**
 * The id of the folder box a package box sits in while grouped, `null` while ungrouped; the root `//` sits in the root
 * folder's box, beside the packages of the repo root.
 */
export const folderBoxIdOf = (packageName: string, naming: TaskNaming): string | null => {
  if (!naming.grouped) return null;

  const folder = taskFolderOf(packageName, naming);

  return folderIdOf(folder);
};

/**
 * A task compound's options: with a title width, at least that wide plus both paddings, so its title draws whole.
 * Under `elk.direction: DOWN` ELK reads the minimum as (height, width); the 0 height is no minimum.
 */
export const compoundOptionsOf = (titleWidth: number | undefined): Readonly<Record<string, string>> => {
  if (titleWidth === undefined) return COMPOUND_OPTIONS;

  const minimum = `(0, ${titleWidth + 2 * FOLDER_PADDING_PX})`;
  const options = { ...COMPOUND_OPTIONS, 'elk.nodeSize.constraints': 'MINIMUM_SIZE', 'elk.nodeSize.minimum': minimum };

  return options;
};
