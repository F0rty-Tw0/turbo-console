import { atomPackages, carrierTaskName, fileTaskName } from './plan-atom-groups.util.ts';
import { taskNamesFor } from './plan-tasks.util.ts';
import { dependsOnFor } from './render-turbo-json.util.ts';
import { ATOM_AGGREGATE_TASK, ATOM_TASK, BASE_TASKS } from '../common/fixture.const.ts';
import type {
  AtomGroupPlan,
  FixturePlan,
  Manifest,
  ManifestPackage,
  ManifestTask,
  PackagePlan,
  TaskKind
} from '../common/fixture.type.ts';

type TaskDraft = {
  readonly taskName: string;
  readonly kind: TaskKind;
  readonly dependsOn: string[];
};

const CONFIGURED_DEPENDS_ON = ['^build'];

const resolveEntry = (pkg: ManifestPackage, entry: string): string[] => {
  const isDependencyEntry = entry.startsWith('^');

  if (!isDependencyEntry) return [`${pkg.name}#${entry}`];

  const task = entry.slice(1);

  return pkg.dependencies.map((dependency) => `${dependency}#${task}`);
};

const toTask = (pkg: ManifestPackage, draft: TaskDraft): ManifestTask => {
  const resolved = draft.dependsOn.flatMap((entry) => resolveEntry(pkg, entry));
  const dependencies = resolved.toSorted();
  const hidden = pkg.role === 'atom-definitions' || draft.kind === 'phantom' || draft.kind === 'carrier';
  const task: ManifestTask = {
    fullName: `${pkg.name}#${draft.taskName}`,
    packageName: pkg.name,
    taskName: draft.taskName,
    kind: draft.kind,
    dependencies,
    visible: !hidden
  };

  return task;
};

const rootTasks = (pkg: ManifestPackage, taskNames: string[], phantoms: string[]): ManifestTask[] => {
  const rootTask = (taskName: string): ManifestTask => {
    const kind = phantoms.includes(taskName) ? 'phantom' : 'task';
    const dependsOn = dependsOnFor(taskName) ?? [];

    return toTask(pkg, { taskName, kind, dependsOn });
  };

  return taskNames.map(rootTask);
};

const atomTasks = (pkg: ManifestPackage, group: AtomGroupPlan): ManifestTask[] => {
  const paths = group.specFiles.map((file) => file.path).toSorted();
  const fileTaskNames = paths.map(fileTaskName);

  const fileTask = (path: string): TaskDraft => {
    const dependsOn = [...CONFIGURED_DEPENDS_ON, carrierTaskName(path)];
    const draft: TaskDraft = { taskName: fileTaskName(path), kind: 'atom-file', dependsOn };

    return draft;
  };

  const carrier = (path: string): TaskDraft => {
    const draft: TaskDraft = { taskName: carrierTaskName(path), kind: 'carrier', dependsOn: [] };

    return draft;
  };

  const aggregate: TaskDraft = { taskName: ATOM_AGGREGATE_TASK, kind: 'aggregate', dependsOn: fileTaskNames };
  const fileTasks = paths.map(fileTask);
  const carriers = paths.map(carrier);
  const drafts = [...fileTasks, ...carriers, aggregate];

  return drafts.map((draft) => toTask(pkg, draft));
};

const plannedPackage = (pkg: PackagePlan): ManifestPackage => {
  const manifestPackage: ManifestPackage = {
    name: pkg.name,
    path: pkg.path,
    role: pkg.role,
    tags: pkg.tags,
    dependencies: pkg.dependencies
  };

  return manifestPackage;
};

/**
 * The ground truth contract tests compare turbo output against. Every package lists every root task;
 * one without a script is a phantom. Atom tasks are recorded once per package turbo lists them under:
 * the definitions package (all hidden, its root tasks all phantoms) and the test package (plus its `e2e-ci` umbrella).
 */
export const buildManifest = (plan: FixturePlan, groups: AtomGroupPlan[]): Manifest => {
  const rootTaskNames = taskNamesFor(plan.spec.tasksPerPackage);
  const testPhantoms = rootTaskNames.filter((task) => !BASE_TASKS.includes(task));
  const planned = plan.packages.map(plannedPackage);
  const plannedTasks = plan.packages.flatMap((pkg) => rootTasks(plannedPackage(pkg), pkg.tasks, pkg.phantoms));

  const groupTasks = (group: AtomGroupPlan): ManifestTask[] => {
    const [test, definitions] = atomPackages(group);
    const testRootTasks = rootTasks(test, rootTaskNames, testPhantoms);
    const testAtomTasks = atomTasks(test, group);
    const umbrella = toTask(test, { taskName: ATOM_TASK, kind: 'umbrella', dependsOn: [ATOM_AGGREGATE_TASK] });
    const definitionsRootTasks = rootTasks(definitions, rootTaskNames, rootTaskNames);
    const definitionsAtomTasks = atomTasks(definitions, group);

    return [...testRootTasks, ...testAtomTasks, umbrella, ...definitionsRootTasks, ...definitionsAtomTasks];
  };

  const atomGroupPackages = groups.flatMap(atomPackages);
  const atomGroupTasks = groups.flatMap(groupTasks);
  const packages = [...planned, ...atomGroupPackages];
  const tasks = [...plannedTasks, ...atomGroupTasks];
  const manifest: Manifest = { packages, tasks };

  return manifest;
};
