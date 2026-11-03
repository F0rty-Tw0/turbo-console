import type { ElementDefinition } from 'cytoscape';

import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { SCRIPTS_BOX_CLASS, SCRIPTS_BOX_TITLE, TASK_BOX_CLASS } from '../common/graph-task.const.ts';
import type { TaskDrawing } from '../common/task-canvas.type.ts';
import { ownerTextOf } from '../utils/owner-text.util.ts';
import { scriptsBoxIdOf, taskBoxIdOf } from '../utils/task-compound.util.ts';

const packageNameOf = (task: GraphTask): string => task.packageName;

const isScript = (task: GraphTask): boolean => !task.isTurboTask;

/** A package box; its `minWidth` is its title width (0 when unknown), so the box is never narrower than its title. */
const packageBoxOf = (packageName: string, drawing: TaskDrawing): ElementDefinition => {
  const minWidth = drawing.titleWidths.get(packageName) ?? 0;
  const data = { id: taskBoxIdOf(packageName), title: ownerTextOf(packageName, drawing.rootLabel), minWidth };
  const definition: ElementDefinition = { data, classes: TASK_BOX_CLASS };

  return definition;
};

/** A package's Scripts box inside its package box, at least as wide as its title width (0 when unknown). */
const scriptsBoxOf = (packageName: string, drawing: TaskDrawing): ElementDefinition => {
  const id = scriptsBoxIdOf(packageName);
  const minWidth = drawing.titleWidths.get(id) ?? 0;
  const data = { id, parent: taskBoxIdOf(packageName), title: SCRIPTS_BOX_TITLE, minWidth };
  const definition: ElementDefinition = { data, classes: SCRIPTS_BOX_CLASS };

  return definition;
};

/**
 * The compounds of the drawn tasks, parents first so each child's parent exists as it is added: a package box per
 * package with a task, then a Scripts box per package with a script task.
 */
export const boxesOf = (drawing: TaskDrawing): ElementDefinition[] => {
  const { tasks } = drawing;
  const packageNames = new Set(tasks.map(packageNameOf));
  const scriptPackages = new Set(tasks.filter(isScript).map(packageNameOf));
  const packageList = [...packageNames];
  const scriptList = [...scriptPackages];
  const packageBoxes = packageList.map((name) => packageBoxOf(name, drawing));
  const scriptsBoxes = scriptList.map((name) => scriptsBoxOf(name, drawing));

  return [...packageBoxes, ...scriptsBoxes];
};
