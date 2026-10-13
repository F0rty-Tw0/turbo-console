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

/** `[]` for a task the model must not hold; otherwise its projection, dependencies cut to `visibleIds` (rule 4). */
const manifestTask = (task: ManifestTask, visibleIds: Set<string>): ProjectedTask[] => {
  const kind = MODEL_KINDS[task.kind];

  if (kind === undefined || !task.visible) return [];

  const isVisible = (id: string): boolean => visibleIds.has(id);
  const dependencies = task.dependencies.filter(isVisible).toSorted();
  const projected: ProjectedTask = { id: task.fullName, kind, atom: task.atom, dependencies };

  return [projected];
};

/** What the model of a fixture must hold: definitions packages, carriers and phantoms left out. */
export const expectedModelOf = (manifest: Manifest): ModelProjection => {
  const shown = manifest.packages.filter(isShownPackage);
  const shownNames = new Set(shown.map((pkg) => pkg.name));
  const visibleIds = new Set(manifest.tasks.filter(isModelTask).map((task) => task.fullName));
  const toTask = (task: ManifestTask): ProjectedTask[] => manifestTask(task, visibleIds);

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
