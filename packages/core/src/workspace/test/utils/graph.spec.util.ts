import type { GraphPackage, GraphTask } from '../../../shared/turbo/common/turbo.type.ts';

type GraphTaskRef = GraphTask['directDependencies']['items'][number];

const taskRef = (fullName: string): GraphTaskRef => {
  const ref: GraphTaskRef = { fullName };

  return ref;
};

/** A `packageGraph` task; `script` mirrors `command`, since classification never reads it. */
export const graphTask = (fullName: string, command: string | null, tags: string[], deps: string[]): GraphTask => {
  const items = deps.map(taskRef);
  const directDependencies = { items };
  const task: GraphTask = { fullName, command, script: command, tags, directDependencies };

  return task;
};

/** A `packageGraph` package with no package dependencies. */
export const graphPackage = (name: string, path: string, tags: string[], tasks: GraphTask[]): GraphPackage => {
  const directDependencies = { items: [] };
  const taskList = { items: tasks };
  const pkg: GraphPackage = { name, path, tags, directDependencies, tasks: taskList };

  return pkg;
};
