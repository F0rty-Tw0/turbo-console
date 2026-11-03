import type { ElementDefinition } from 'cytoscape';

import { SCRIPTS_BOX_CLASS, SCRIPTS_BOX_TITLE, TASK_BOX_CLASS, TASK_FOLDER_CLASS } from '../common/graph-task.const.ts';
import type { TaskDrawing } from '../common/task-canvas.type.ts';
import { folderTitleOf } from '../utils/controls-text.util.ts';
import { folderIdOf } from '../utils/folder-id.util.ts';
import { ownerTextOf } from '../utils/owner-text.util.ts';
import {
  folderBoxIdOf,
  scriptPackagesOf,
  scriptsBoxIdOf,
  taskBoxIdOf,
  taskFoldersOf,
  taskPackagesOf
} from '../utils/task-compound.util.ts';

/** The title width `titleWidths` holds for the box `id`, 0 when unknown, so a box is never narrower than its title. */
const minWidthOf = (id: string, drawing: TaskDrawing): number => drawing.titleWidths.get(id) ?? 0;

/** A folder box titled `folderTitleOf`, at least as wide as its title width (0 when unknown). */
const folderBoxOf = (folder: string, drawing: TaskDrawing): ElementDefinition => {
  const id = folderIdOf(folder);
  const minWidth = minWidthOf(id, drawing);
  const data = { id, title: folderTitleOf(folder), minWidth };
  const definition: ElementDefinition = { data, classes: TASK_FOLDER_CLASS };

  return definition;
};

/**
 * A package box, inside its folder box while grouped; its `minWidth` is its title width (0 when unknown), so the box is
 * never narrower than its title.
 */
const packageBoxOf = (packageName: string, drawing: TaskDrawing): ElementDefinition => {
  const minWidth = minWidthOf(packageName, drawing);
  const parent = folderBoxIdOf(packageName, drawing.naming);
  const box = { id: taskBoxIdOf(packageName), title: ownerTextOf(packageName, drawing.rootLabel, drawing.naming.labels), minWidth };
  const nested = { ...box, parent };
  const data = parent === null ? box : nested;
  const definition: ElementDefinition = { data, classes: TASK_BOX_CLASS };

  return definition;
};

/** A package's Scripts box inside its package box, at least as wide as its title width (0 when unknown). */
const scriptsBoxOf = (packageName: string, drawing: TaskDrawing): ElementDefinition => {
  const id = scriptsBoxIdOf(packageName);
  const minWidth = minWidthOf(id, drawing);
  const data = { id, parent: taskBoxIdOf(packageName), title: SCRIPTS_BOX_TITLE, minWidth };
  const definition: ElementDefinition = { data, classes: SCRIPTS_BOX_CLASS };

  return definition;
};

/**
 * The compounds of the drawn tasks, parents first so each child's parent exists as it is added: while grouped a folder
 * box per folder with a package, then a package box per package with a task, then a Scripts box per package with a
 * script task.
 */
export const boxesOf = (drawing: TaskDrawing): ElementDefinition[] => {
  const { tasks } = drawing;
  const packageNames = taskPackagesOf(tasks);
  const scriptPackages = scriptPackagesOf(tasks);
  const packageList = [...packageNames];
  const scriptList = [...scriptPackages];
  const folders = taskFoldersOf(packageList, drawing.naming);
  const folderBoxes = folders.map((folder) => folderBoxOf(folder, drawing));
  const packageBoxes = packageList.map((name) => packageBoxOf(name, drawing));
  const scriptsBoxes = scriptList.map((name) => scriptsBoxOf(name, drawing));

  return [...folderBoxes, ...packageBoxes, ...scriptsBoxes];
};
