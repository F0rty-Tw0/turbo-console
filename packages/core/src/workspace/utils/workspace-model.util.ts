import { classifyPackages } from './classify-tasks.util.ts';
import { affectedModeOf, descriptionOf, okConfigsByDir } from './task-description.util.ts';
import { ROOT_NAME } from './turbo-task-lookup.util.ts';
import { turboTaskLookupOf, turboTasksOf } from './turbo-task.util.ts';
import { plainLine } from '../../shared/errors/utils/plain-text.util.ts';
import { compareText } from '../../shared/text/utils/compare-text.util.ts';
import type { PackageGraph } from '../../shared/turbo/common/turbo.type.ts';
import { toPosixPath } from '../../shared/turbo/utils/posix-path.util.ts';
import type { TurboConfigFile, TurboConfigOk, TurboTaskFacts, TurboTaskLookup } from '../common/turbo-config.type.ts';
import type {
  ClassifiedPackage,
  ClassifiedTask,
  ModelSource,
  PackageEdge,
  PackageNode,
  TaskNode,
  WorkspaceModel
} from '../common/workspace-model.type.ts';

type GraphEdge = PackageGraph['data']['packageGraph']['edges']['items'][number];

/** Spec §4.4: at most this many warnings, then one `warnings: <n> more not shown` line. */
const MAX_WARNINGS = 100;

/** A warning quotes file paths and tags, which may be any length; each is cut to this many characters. */
const MAX_WARNING_LENGTH = 1024;

const ROOT_CONFIG_PATHS = ['turbo.json', 'turbo.jsonc'];

const UNKNOWN_FACTS: TurboTaskFacts = { persistent: false };

const byId = (left: TaskNode, right: TaskNode): number => compareText(left.id, right.id);

const byName = (left: PackageNode, right: PackageNode): number => compareText(left.name, right.name);

/** `\0` sorts below every other character, so the joined key orders by source, then target, then kind. */
const edgeKey = (edge: PackageEdge): string => `${edge.source}\0${edge.target}\0${edge.kind}`;

const byEdge = (left: PackageEdge, right: PackageEdge): number => compareText(edgeKey(left), edgeKey(right));

const taskIdsOf = (pkg: ClassifiedPackage): string[] => pkg.tasks.map((task) => task.id);

const isRootConfig = (config: TurboConfigFile): boolean => ROOT_CONFIG_PATHS.includes(config.path);

const isText = (warning: string | null): warning is string => warning !== null;

/**
 * `null` tasks mean the configs cannot tell: every task then counts as a turbo task, and none as persistent. In a
 * single-package repo a script no config keys is a turbo task all the same (`turbo run` of its name runs it), and not
 * persistent; a monorepo package's own unkeyed script is not one.
 */
const factsOf = (
  turboTasks: ReadonlyMap<string, TurboTaskFacts> | null,
  name: string,
  singlePackage: boolean
): TurboTaskFacts | undefined => {
  if (turboTasks === null) return UNKNOWN_FACTS;

  const facts = turboTasks.get(name);

  if (facts === undefined && singlePackage) return UNKNOWN_FACTS;

  return facts;
};

/** Cut before `plainLine` walks it; a cut through a surrogate pair leaves U+FFFD, never half a character. */
const shortLine = (warning: string): string => plainLine(warning.slice(0, MAX_WARNING_LENGTH).toWellFormed());

/** Rule 4 cuts dependencies on tasks rules 1–3 dropped. `toSorted` only: `task.tags` is the parsed graph's own array. */
const toTaskNode = (
  task: ClassifiedTask,
  visibleIds: Set<string>,
  description: string | null,
  facts: TurboTaskFacts | undefined
): TaskNode => {
  const isTurboTask = facts !== undefined;
  const persistent = facts?.persistent ?? false;
  const isVisible = (id: string): boolean => visibleIds.has(id);
  const dependencies = task.rawDependencies.filter(isVisible).toSorted();
  const tags = task.tags.toSorted();
  const { id, name, command, kind, atom } = task;
  const node: TaskNode = { id, name, command, description, tags, dependencies, kind, atom, isTurboTask, persistent };

  return node;
};

/** What every package node reads besides its own package. */
type PackageContext = {
  readonly visibleIds: Set<string>;
  readonly configs: Map<string, TurboConfigOk>;
  readonly lookup: TurboTaskLookup;
  readonly rootLabel: string | null;
};

/** When the configs cannot tell which tasks turbo defines, every task counts as one, as before the check existed. */
const toPackageNode = (pkg: ClassifiedPackage, context: PackageContext): PackageNode => {
  const path = toPosixPath(pkg.path);
  const turboTasks = turboTasksOf(context.lookup, pkg);

  const toNode = (task: ClassifiedTask): TaskNode => {
    const description = descriptionOf(context.configs, path, task.id, task.name);
    const facts = factsOf(turboTasks, task.name, context.lookup.singlePackage);

    return toTaskNode(task, context.visibleIds, description, facts);
  };

  const tasks = pkg.tasks.map(toNode).toSorted(byId);
  const tags = pkg.tags.toSorted();
  const isLabelled = context.lookup.singlePackage && pkg.name === ROOT_NAME;
  const label = isLabelled ? context.rootLabel : null;
  const node: PackageNode = { name: pkg.name, path, label, tags, tasks };

  return node;
};

const toEdge = (edge: GraphEdge): PackageEdge => {
  const packageEdge: PackageEdge = { source: edge.source, target: edge.target, kind: edge.kind.kind };

  return packageEdge;
};

const configWarning = (config: TurboConfigFile): string | null => {
  if ('error' in config) return `${config.path}: ${config.error}`;

  if (config.warning === undefined) return null;

  return `${config.path}: ${config.warning}`;
};

/**
 * Each warning cut to `MAX_WARNING_LENGTH` and made one plain line, then sorted, then cut to `MAX_WARNINGS` plus a
 * count of the rest.
 */
const shownWarnings = (warnings: string[]): string[] => {
  const sorted = warnings.map(shortLine).toSorted();
  const hidden = sorted.length - MAX_WARNINGS;

  if (hidden <= 0) return sorted;

  const shown = sorted.slice(0, MAX_WARNINGS);

  return [...shown, `warnings: ${hidden} more not shown`];
};

/** The two-group warnings of rule 2.2 and the config warnings, before the cut, sort and cap. */
const listedWarnings = (classifiedWarnings: string[], configs: TurboConfigFile[]): string[] => {
  const fileWarnings = configs.map(configWarning).filter(isText);

  return [...classifiedWarnings, ...fileWarnings];
};

/** Spec §4.4 rules 1–6: one deterministic model from one `packageGraph` and the configs read for it. */
export const buildWorkspaceModel = (graph: PackageGraph, configs: TurboConfigFile[], source: ModelSource): WorkspaceModel => {
  const { root, turboVersion, packageManager, singlePackage, rootLabel } = source;
  const { nodes, edges: graphEdges } = graph.data.packageGraph;
  const classified = classifyPackages(nodes.items);
  const visibleIds = new Set(classified.packages.flatMap(taskIdsOf));
  const visibleNames = new Set(classified.packages.map((pkg) => pkg.name));
  const byDir = okConfigsByDir(configs);
  const lookup = turboTaskLookupOf(configs, nodes.items, singlePackage);
  const context: PackageContext = { visibleIds, configs: byDir, lookup, rootLabel };
  const toNode = (pkg: ClassifiedPackage): PackageNode => toPackageNode(pkg, context);
  const packages = classified.packages.map(toNode).toSorted(byName);
  const isVisibleEdge = (edge: GraphEdge): boolean => visibleNames.has(edge.source) && visibleNames.has(edge.target);
  const edges = graphEdges.items.filter(isVisibleEdge).map(toEdge).toSorted(byEdge);
  const listed = listedWarnings(classified.warnings, configs);
  const warnings = shownWarnings(listed);
  const rootConfig = configs.find(isRootConfig) ?? null;
  const affectedMode = affectedModeOf(rootConfig);
  const model: WorkspaceModel = {
    root,
    turboVersion,
    packageManager,
    affectedMode,
    singlePackage,
    packages,
    edges,
    warnings
  };

  return model;
};

/**
 * `model`, as built from `graph` and `configs`, with `warning` (the `cache:` one) added under the same cut, sort and
 * cap. Its own list may already be capped, so the warnings are listed again from `graph` and `configs`.
 */
export const withWarning = (
  model: WorkspaceModel,
  graph: PackageGraph,
  configs: TurboConfigFile[],
  warning: string
): WorkspaceModel => {
  const classified = classifyPackages(graph.data.packageGraph.nodes.items);
  const listed = listedWarnings(classified.warnings, configs);
  const warnings = shownWarnings([...listed, warning]);
  const warned: WorkspaceModel = { ...model, warnings };

  return warned;
};
