import { GRAPH_TASK_STUB } from './graph-task.stub.ts';
import type { GraphTask } from '../../../bridge/common/graph-state.type.ts';
import type { TaskNaming } from '../../common/graph-task.type.ts';
import type { TaskGridFacts } from '../../common/task-grid.type.ts';

const taskOf = (packageName: string, name: string): GraphTask => {
  const task: GraphTask = { ...GRAPH_TASK_STUB, id: `${packageName}#${name}`, packageName, name };

  return task;
};

/** Eight pool tasks over six packages: `//`, `core`, `root-lib`, `-tools`, `ui` (two) and `web` (two). */
export const GRID_TASKS_STUB: GraphTask[] = [
  taskOf('//', 'gen'),
  taskOf('core', 'build'),
  taskOf('root-lib', 'build'),
  taskOf('-tools', 'build'),
  taskOf('ui', 'build'),
  taskOf('ui', 'test'),
  taskOf('web', 'build'),
  taskOf('web', 'dev')
];

const FOLDERS = new Map([
  ['core', 'packages'],
  ['ui', 'packages'],
  ['-tools', 'packages'],
  ['web', 'apps'],
  ['root-lib', '']
]);
const NAMES = ['core', 'root-lib', '-tools', 'ui', 'web'];
const LABELS = new Map(NAMES.map((name) => [name, name]));

/** Naming with every package labelled by its name, not grouped. */
export const GRID_FLAT_NAMING_STUB: TaskNaming = { grouped: false, scopeShown: true, labels: LABELS, folders: FOLDERS };

/** `GRID_FLAT_NAMING_STUB` grouped by folder: `packages` (`-tools`, `core`, `ui`), `apps` (`web`), the root (`root-lib`). */
export const GRID_GROUPED_NAMING_STUB: TaskNaming = { ...GRID_FLAT_NAMING_STUB, grouped: true };

/** The flat grid: `ui#build` chosen, `ui#build` and `core#build` drawn. */
export const TASK_GRID_FACTS_STUB: TaskGridFacts = {
  tasks: GRID_TASKS_STUB,
  chosen: new Set(['ui#build']),
  shown: new Set(['ui#build', 'core#build']),
  naming: GRID_FLAT_NAMING_STUB,
  rootLabel: null
};
