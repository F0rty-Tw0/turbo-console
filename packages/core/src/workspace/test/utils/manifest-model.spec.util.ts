import type { Manifest, ManifestPackage, ManifestTask, TaskKind } from '@turbo-console/repo-gen';

import { compareText } from '../../../shared/text/utils/compare-text.util.ts';
import { manifestDependencyPairs } from '../../../shared/turbo/test/utils/manifest.spec.util.ts';
import type { PackageEdge, PackageNode, TaskNode, TaskNodeKind, WorkspaceModel } from '../../common/workspace-model.type.ts';
import type { ModelProjection, ProjectedPackage, ProjectedTask } from '../common/manifest-model.type.ts';

/** Spec §8 mapping; `phantom` and `carrier` have no model kind, so they never reach the model. */
const MODEL_KINDS: Partial<Record<TaskKind, TaskNodeKind>> = {
  task: 'task',
  'atom-file': 'atom-file',
  aggregate: 'atom-aggregate',
  umbrella: 'atom-umbrella'
};

const byId = (left: ProjectedTask, right: ProjectedTask): number => compareText(left.id, right.id);

const byName = (left: ProjectedPackage, right: ProjectedPackage): number => compareText(left.name, right.name);

const edgePair = (edge: PackageEdge): string => `${edge.source}->${edge.target}`;

const modelPackage = (pkg: PackageNode): ProjectedPackage => {
  const projected: ProjectedPackage = { name: pkg.name, path: pkg.path, tags: pkg.tags };

  return projected;
};

const modelTask = (task: TaskNode): ProjectedTask => {
  const projected: ProjectedTask = { id: task.id, kind: task.kind, atom: task.atom, dependencies: task.dependencies };

  return projected;
};

/**
 * The manifest-comparable parts of a model. Packages keep the model's order; tasks are listed across packages by id and
 * edges by `source->target` text, the orders `expectedModelOf` uses.
 */
export const projectModel = (model: WorkspaceModel): ModelProjection => {
  const packages = model.packages.map(modelPackage);
  const allTasks = model.packages.flatMap((pkg) => pkg.tasks);
  const tasks = allTasks.map(modelTask).toSorted(byId);
  const edges = model.edges.map(edgePair).toSorted();
  const projection: ModelProjection = { packages, tasks, edges };

  return projection;
};

/** Ids of tasks whose `pkg#` prefix is not the name of the package holding them; the projection flattens that away. */
export const misplacedTaskIds = (model: WorkspaceModel): string[] => {
  const misplacedIn = (pkg: PackageNode): string[] => {
    const isElsewhere = (task: TaskNode): boolean => !task.id.startsWith(`${pkg.name}#`);

    return pkg.tasks.filter(isElsewhere).map((task) => task.id);
  };

  return model.packages.flatMap(misplacedIn);
};

const isShownPackage = (pkg: ManifestPackage): boolean => pkg.role !== 'atom-definitions';

const manifestPackage = (pkg: ManifestPackage): ProjectedPackage => {
  const tags = pkg.tags.toSorted();
  const projected: ProjectedPackage = { name: pkg.name, path: pkg.path, tags };

  return projected;
};

const isModelTask = (task: ManifestTask): boolean => task.visible && MODEL_KINDS[task.kind] !== undefined;

const isShownPhantom = (task: ManifestTask, shownNames: Set<string>): boolean => {
  const isPhantom = task.kind === 'phantom';
  const isShown = shownNames.has(task.packageName);

  return isPhantom && isShown;
};

/** Ids reached from `start` by walking phantom dependencies; a phantom is walked once, the first non-phantom ends a path. */
const reachedThrough = (start: string[], phantoms: Map<string, string[]>): string[] => {
  const walked = new Set<string>();
  const reached: string[] = [];
  const pending = [...start];

  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    const through = phantoms.get(id);

    if (through === undefined) {
      reached.push(id);
      continue;
    }

    const isWalked = walked.has(id);

    if (isWalked) continue;

    walked.add(id);
    pending.push(...through);
  }

  return reached;
};

/** `[]` for a task the model must not hold; otherwise its projection, dependencies passed through phantoms and cut to `visibleIds`. */
const manifestTask = (task: ManifestTask, visibleIds: Set<string>, phantoms: Map<string, string[]>): ProjectedTask[] => {
  const kind = MODEL_KINDS[task.kind];

  if (kind === undefined || !task.visible) return [];

  const isVisible = (id: string): boolean => visibleIds.has(id);
  const reached = reachedThrough(task.dependencies, phantoms).filter(isVisible);
  const unique = new Set(reached);
  const dependencies = Array.from(unique).toSorted();
  const projected: ProjectedTask = { id: task.fullName, kind, atom: task.atom, dependencies };

  return [projected];
};

/** What the model of a fixture must hold: definitions packages, carriers and phantoms left out, phantom dependencies passed on to their dependents. */
export const expectedModelOf = (manifest: Manifest): ModelProjection => {
  const shown = manifest.packages.filter(isShownPackage);
  const shownNames = new Set(shown.map((pkg) => pkg.name));
  const visibleIds = new Set(manifest.tasks.filter(isModelTask).map((task) => task.fullName));
  const isPhantom = (task: ManifestTask): boolean => isShownPhantom(task, shownNames);
  const toEntry = (task: ManifestTask): [string, string[]] => [task.fullName, task.dependencies];
  const phantoms = new Map(manifest.tasks.filter(isPhantom).map(toEntry));
  const toTask = (task: ManifestTask): ProjectedTask[] => manifestTask(task, visibleIds, phantoms);

  const isShownPair = (pair: string): boolean => {
    const [source = '', target = ''] = pair.split('->');

    return shownNames.has(source) && shownNames.has(target);
  };

  const packages = shown.map(manifestPackage).toSorted(byName);
  const tasks = manifest.tasks.flatMap(toTask).toSorted(byId);
  const edges = manifestDependencyPairs(manifest).filter(isShownPair);
  const projection: ModelProjection = { packages, tasks, edges };

  return projection;
};
