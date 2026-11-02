import { descriptionOf, rootDescriptionOf } from './task-description.util.ts';
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

/** A task depends on itself only through a phantom cycle, so the copy is made only then. */
const withoutSelf = (ids: string[], self: string): string[] => {
  const hasSelf = ids.includes(self);

  if (!hasSelf) return ids;

  const isOther = (id: string): boolean => id !== self;

  return ids.filter(isOther);
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

/** Rule 5 for one task; a monorepo root's task reads the root's `//#<task>` key only. */
const descriptionIn = (task: ClassifiedTask, path: string, context: PackageContext, isMonorepoRoot: boolean): string | null => {
  if (isMonorepoRoot) return rootDescriptionOf(context.configs, task.id);

  return descriptionOf(context.configs, path, task.id, task.name);
};

/** When the configs cannot tell which tasks turbo defines, every task counts as one, as before the check existed. */
export const toPackageNode = (pkg: ClassifiedPackage, context: PackageContext): PackageNode => {
  const path = toPosixPath(pkg.path);
  const turboTasks = turboTasksOf(context.lookup, pkg);
  const isRoot = pkg.name === ROOT_NAME;
  const isMonorepoRoot = isRoot && !context.lookup.singlePackage;
  const toNode = (task: ClassifiedTask): TaskNode => {
    const description = descriptionIn(task, path, context, isMonorepoRoot);
    const facts = factsOf(turboTasks, task.name);
    const through = context.dependenciesThrough(task.rawDependencies);
    const dependencies = withoutSelf(through, task.id);

    return toTaskNode(task, dependencies, description, facts);
  };

  const tasks = pkg.tasks.map(toNode).toSorted(byId);
  const tags = pkg.tags.toSorted();
  const isLabelled = isRoot && context.lookup.singlePackage;
  const label = isLabelled ? context.rootLabel : null;
  const node: PackageNode = { name: pkg.name, path, label, tags, tasks };

  return node;
};
