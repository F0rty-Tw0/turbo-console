import { dependenciesThroughOf } from './phantom-dependencies.util.ts';
import { descriptionOf } from './task-description.util.ts';
import { ROOT_NAME } from './turbo-task-lookup.util.ts';
import { turboTasksOf } from './turbo-task.util.ts';
import { compareText } from '../../shared/text/utils/compare-text.util.ts';
import { toPosixPath } from '../../shared/turbo/utils/posix-path.util.ts';
import type { TurboTaskFacts } from '../common/turbo-config.type.ts';
import type { ClassifiedPackage, ClassifiedTask, PackageContext, PackageNode, TaskNode } from '../common/workspace-model.type.ts';

const UNKNOWN_FACTS: TurboTaskFacts = { persistent: false };

const byId = (left: TaskNode, right: TaskNode): number => compareText(left.id, right.id);

/**
 * `null` tasks mean the configs cannot tell: every task then counts as a turbo task, and none as persistent. A script
 * no config keys is no turbo task, in a single-package repo too: turbo 2.11.7 runs one there (`turbo run` of its name
 * exits 0, uncached), but it shows as a script like a monorepo package's own unkeyed script.
 */
const factsOf = (turboTasks: ReadonlyMap<string, TurboTaskFacts> | null, name: string): TurboTaskFacts | undefined => {
  if (turboTasks === null) return UNKNOWN_FACTS;

  return turboTasks.get(name);
};

/** `dependencies` are already resolved (rule 4). `toSorted` only: `task.tags` is the parsed graph's own array. */
const toTaskNode = (
  task: ClassifiedTask,
  dependencies: string[],
  description: string | null,
  facts: TurboTaskFacts | undefined
): TaskNode => {
  const isTurboTask = facts !== undefined;
  const persistent = facts?.persistent ?? false;
  const tags = task.tags.toSorted();
  const { id, name, command, kind, atom } = task;
  const node: TaskNode = { id, name, command, description, tags, dependencies, kind, atom, isTurboTask, persistent };

  return node;
};

/** When the configs cannot tell which tasks turbo defines, every task counts as one, as before the check existed. */
export const toPackageNode = (pkg: ClassifiedPackage, context: PackageContext): PackageNode => {
  const path = toPosixPath(pkg.path);
  const turboTasks = turboTasksOf(context.lookup, pkg);

  const toNode = (task: ClassifiedTask): TaskNode => {
    const description = descriptionOf(context.configs, path, task.id, task.name);
    const facts = factsOf(turboTasks, task.name);
    const isOther = (id: string): boolean => id !== task.id;
    const through = dependenciesThroughOf(task.rawDependencies, context.phantoms, context.visibleIds);
    const dependencies = through.filter(isOther);

    return toTaskNode(task, dependencies, description, facts);
  };

  const tasks = pkg.tasks.map(toNode).toSorted(byId);
  const tags = pkg.tags.toSorted();
  const isLabelled = context.lookup.singlePackage && pkg.name === ROOT_NAME;
  const label = isLabelled ? context.rootLabel : null;
  const node: PackageNode = { name: pkg.name, path, label, tags, tasks };

  return node;
};
