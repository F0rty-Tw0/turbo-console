import { classifyPackages } from './classify-tasks.util.ts';
import { toPackageNode } from './package-node.util.ts';
import { affectedModeOf, okConfigsByDir } from './task-description.util.ts';
import { turboTaskLookupOf, turboTasksOf } from './turbo-task.util.ts';
import { plainLine } from '../../shared/errors/utils/plain-text.util.ts';
import { compareText } from '../../shared/text/utils/compare-text.util.ts';
import type { GraphPackage, PackageGraph } from '../../shared/turbo/common/turbo.type.ts';
import type { TurboConfigFile, TurboTaskLookup } from '../common/turbo-config.type.ts';
import type {
  ClassifiedPackage,
  ClassifiedTask,
  ClassifyResult,
  ModelSource,
  PackageContext,
  PackageEdge,
  PackageNode,
  WorkspaceModel
} from '../common/workspace-model.type.ts';

type GraphEdge = PackageGraph['data']['packageGraph']['edges']['items'][number];

/** Spec §4.4: at most this many warnings, then one `warnings: <n> more not shown` line. */
const MAX_WARNINGS = 100;

/** A warning quotes file paths and tags, which may be any length; each is cut to this many characters. */
const MAX_WARNING_LENGTH = 1024;

const ROOT_CONFIG_PATHS = ['turbo.json', 'turbo.jsonc'];

const byName = (left: PackageNode, right: PackageNode): number => compareText(left.name, right.name);

/** `\0` sorts below every other character, so the joined key orders by source, then target, then kind. */
const edgeKey = (edge: PackageEdge): string => `${edge.source}\0${edge.target}\0${edge.kind}`;

const byEdge = (left: PackageEdge, right: PackageEdge): number => compareText(edgeKey(left), edgeKey(right));

const taskIdsOf = (pkg: ClassifiedPackage): string[] => pkg.tasks.map((task) => task.id);

const isRootConfig = (config: TurboConfigFile): boolean => ROOT_CONFIG_PATHS.includes(config.path);

const isText = (warning: string | null): warning is string => warning !== null;

/** Cut before `plainLine` walks it; a cut through a surrogate pair leaves U+FFFD, never half a character. */
const shortLine = (warning: string): string => plainLine(warning.slice(0, MAX_WARNING_LENGTH).toWellFormed());

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

/** The root classified apart from `nodes`; empty for a single-package repo (`//` is a node there) or a graph with no root. */
const classifiedRootOf = (root: GraphPackage | null, lookup: TurboTaskLookup): ClassifyResult => {
  if (root === null || lookup.singlePackage) return classifyPackages([]);

  return classifyPackages([root]);
};

/**
 * The root's `//#<name>` turbo tasks as a classified package. `null` for no classified root (see `classifiedRootOf`)
 * or a root hidden by its tags. When the configs cannot tell, no script counts as a turbo task.
 */
const keptRootOf = (classified: ClassifyResult, lookup: TurboTaskLookup): ClassifiedPackage | null => {
  const [classifiedRoot] = classified.packages;

  if (classifiedRoot === undefined) return null;

  const turboTasks = turboTasksOf(lookup, classifiedRoot);
  const isKept = (task: ClassifiedTask): boolean => turboTasks?.has(task.name) ?? false;
  const tasks = classifiedRoot.tasks.filter(isKept);
  const kept: ClassifiedPackage = { ...classifiedRoot, tasks };

  return kept;
};

const rootIdsOf = (kept: ClassifiedPackage | null): string[] => {
  if (kept === null) return [];

  return taskIdsOf(kept);
};

const rootNodeOf = (kept: ClassifiedPackage | null, context: PackageContext): PackageNode | null => {
  if (kept === null) return null;

  return toPackageNode(kept, context);
};

/** Spec §4.4 rules 1–6: one deterministic model from one `packageGraph` and the configs read for it. */
export const buildWorkspaceModel = (graph: PackageGraph, configs: TurboConfigFile[], source: ModelSource): WorkspaceModel => {
  const { root, turboVersion, packageManager, singlePackage, rootLabel } = source;
  const { nodes, edges: graphEdges } = graph.data.packageGraph;
  const classified = classifyPackages(nodes.items);
  const byDir = okConfigsByDir(configs);
  const lookup = turboTaskLookupOf(configs, nodes.items, singlePackage);
  const classifiedRoot = classifiedRootOf(graph.data.root, lookup);
  const keptRoot = keptRootOf(classifiedRoot, lookup);
  const phantoms = new Map([...classified.phantoms, ...classifiedRoot.phantoms]);
  const packageIds = classified.packages.flatMap(taskIdsOf);
  const rootIds = rootIdsOf(keptRoot);
  const visibleIds = new Set([...packageIds, ...rootIds]);
  const visibleNames = new Set(classified.packages.map((pkg) => pkg.name));
  const context: PackageContext = { visibleIds, phantoms, configs: byDir, lookup, rootLabel };
  const toNode = (pkg: ClassifiedPackage): PackageNode => toPackageNode(pkg, context);
  const packages = classified.packages.map(toNode).toSorted(byName);
  const rootPackage = rootNodeOf(keptRoot, context);
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
    rootPackage,
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
