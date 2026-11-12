import type { PackageEdge, PackageNode, WorkspaceModel } from '@turbo-console/core';
import { LAYOUT_VERSION, ROOT_TASK_PACKAGE } from '@turbo-console/webview-ui';
import type { GraphEdge, GraphPackage, GraphState, GraphTask } from '@turbo-console/webview-ui';

import { coversExactly } from './graph-cache.util.ts';
import { packageNamesOf } from './graph-package.util.ts';
import { graphListingOf, persistentIdsOf, runIdsOfListing } from './graph-tasks.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { bareTextsOf, fullTextOf } from '../../tree/utils/model-view.util.ts';
import { binaryMessageOf, shownModelOf } from '../../tree/utils/root-rows.util.ts';
import { isListedTask } from '../../tree/utils/script-task.util.ts';
import type { GraphLayoutCacheEntry, GraphLayoutCaches } from '../common/graph-cache.type.ts';
import type { GraphShown, GraphToggles } from '../common/graph.type.ts';

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const KEY_SEPARATOR = '\0';
const LOAD_KIND = 'load-no-model';
const LOADING: GraphState = { kind: 'loading' };
const NO_IDS: string[] = [];

const compareText = (left: string, right: string): number => {
  if (left < right) return -1;

  return left > right ? 1 : 0;
};

const compareEdges = (left: GraphEdge, right: GraphEdge): number =>
  compareText(left.source, right.source) || compareText(left.target, right.target);

const comparePackages = (left: GraphPackage, right: GraphPackage): number => compareText(left.name, right.name);

const fnv1a = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let hash = FNV_OFFSET;

  for (const byte of bytes) hash = Math.imul(hash ^ byte, FNV_PRIME) >>> 0;

  return hash.toString(16).padStart(8, '0');
};

/**
 * FNV-1a over the layout version and a newline, then a `[name, path, tags]` JSON line per package in name order, a blank line, then a `[source, target]` JSON line per edge
 * in sorted order, so input order never matters but a changed path, a tag or the layout version does. Tags are hashed in the order given: `graphStateOf`
 * sorts them first.
 */
export const graphHashOf = (packages: GraphPackage[], edges: GraphEdge[]): string => {
  const packageLines = packages.toSorted(comparePackages).map((pkg) => JSON.stringify([pkg.name, pkg.path, pkg.tags]));
  const lines = edges.toSorted(compareEdges).map((edge) => JSON.stringify([edge.source, edge.target]));
  const text = `${LAYOUT_VERSION}\n${packageLines.join('\n')}\n\n${lines.join('\n')}`;

  return fnv1a(text);
};

/** The bare text of a node; the root `//` reads its full label while scopes are shown, the text of its tree row. */
const bareNameOf = (node: PackageNode, bareTexts: ReadonlyMap<string, string>, scopeShown: boolean): string => {
  const isRootShown = scopeShown && node.name === ROOT_TASK_PACKAGE;

  if (isRootShown) return fullTextOf(node);

  return bareTexts.get(node.name) ?? node.name;
};

/** The name, its bare name, the path, the tags (deduplicated and sorted) and the listed task count of a node (scripts count only while `scriptsShown`); only name, path and tags are hashed. */
const packageOf = (node: PackageNode, bareTexts: ReadonlyMap<string, string>, shown: GraphShown): GraphPackage => {
  const tags = Array.from(new Set(node.tags)).toSorted(compareText);
  const taskCount = node.tasks.filter((task): boolean => isListedTask(task, shown.scriptsShown)).length;
  const bareName = bareNameOf(node, bareTexts, shown.scopeShown);
  const info: GraphPackage = { name: node.name, bareName, path: node.path, tags, taskCount };

  return info;
};

/** `kind` dropped, pairs deduped, sorted by source then target. */
const edgesOf = (modelEdges: PackageEdge[]): GraphEdge[] => {
  const byPair = new Map<string, GraphEdge>();

  for (const { source, target } of modelEdges) byPair.set(`${source}${KEY_SEPARATOR}${target}`, { source, target });

  return Array.from(byPair.values()).toSorted(compareEdges);
};

/** The cached entry when it is for this exact graph: the same hash and a point for exactly its packages. */
const cachedEntryOf = (cache: GraphLayoutCacheEntry | null, hash: string, packages: string[]): GraphLayoutCacheEntry | null => {
  if (cache?.hash !== hash) return null;

  return coversExactly(cache.positions, packages) ? cache : null;
};

/** The `//` package's label in either mode; `null` when the model has no `//` package or it has no label. */
export const rootPackageLabelOf = (model: WorkspaceModel): string | null => {
  const root = model.packages.find((node) => node.name === ROOT_TASK_PACKAGE);

  return root?.label ?? null;
};

/** The `//` package's label of a single-package model, which names the owner of every task; `null` for a monorepo. */
export const rootLabelOf = (model: WorkspaceModel): string | null => {
  if (!model.singlePackage) return null;

  return rootPackageLabelOf(model);
};

/** The tree's four toggles as they are now, read at every state build. */
export const shownOf = (toggles: GraphToggles): GraphShown => {
  const shown: GraphShown = {
    scopeShown: toggles.scope.isShown(),
    scriptsShown: toggles.scripts.isShown(),
    predictionShown: toggles.prediction.isShown(),
    affectedShown: toggles.affected.isShown()
  };

  return shown;
};

export const graphStateOf = (model: WorkspaceModel, caches: GraphLayoutCaches, shown: GraphShown): GraphState => {
  const bareTexts = bareTextsOf(model.packages);
  const packages = model.packages.map((node) => packageOf(node, bareTexts, shown)).toSorted(comparePackages);
  const edges = edgesOf(model.edges);
  const hash = graphHashOf(packages, edges);
  const names = packageNamesOf(packages);
  const flat = cachedEntryOf(caches.flat, hash, names);
  const folders = cachedEntryOf(caches.folders, hash, names);
  const { tasks, atomGroups } = graphListingOf(model);
  const { singlePackage } = model;
  const rootLabel = rootLabelOf(model);
  const state: GraphState = {
    kind: 'graph',
    hash,
    packages,
    edges,
    positions: flat?.positions ?? null,
    folderPositions: folders?.positions ?? null,
    routes: flat?.routes ?? null,
    folderRoutes: folders?.routes ?? null,
    tasks,
    atomGroups,
    singlePackage,
    rootLabel,
    scopeShown: shown.scopeShown,
    scriptsShown: shown.scriptsShown,
    predictionShown: shown.predictionShown,
    affectedShown: shown.affectedShown
  };

  return state;
};

/** A root's state as the page sees it. Fixed texts only, never the failure's own message. */
export const graphStateOfRoot = (state: RootState | undefined, caches: GraphLayoutCaches, shown: GraphShown): GraphState => {
  if (state === undefined) return LOADING;

  const model = shownModelOf(state);

  if (model !== null) return graphStateOf(model, caches, shown);

  if (state.error === null) return LOADING;

  const { stage, error } = state.error;
  const binaryKind = binaryMessageOf(error.kind);
  const kind = stage === 'binary' ? binaryKind : LOAD_KIND;
  const failed: GraphState = { kind: 'error', message: MESSAGE_TEXTS[kind] };

  return failed;
};

/**
 * The ids `graphStateOfRoot(state, ...)` lists as tasks and group files, without building the rest of the state: none unless
 * the root shows a model. `listingOf` builds the listing; a caller that asks per runs post passes a memo of it.
 */
export const runIdsOfRoot = (state: RootState | undefined, listingOf = graphListingOf): string[] => {
  if (state === undefined) return NO_IDS;

  const model = shownModelOf(state);

  if (model === null) return NO_IDS;

  return runIdsOfListing(listingOf(model));
};

/** The tasks `graphStateOfRoot(state, ...)` lists, without building the rest of the state: none unless the root shows a model. */
export const tasksOfRoot = (state: RootState | undefined, listingOf = graphListingOf): GraphTask[] => {
  if (state === undefined) return [];

  const model = shownModelOf(state);

  if (model === null) return [];

  return listingOf(model).tasks;
};

/**
 * The ids the root's model marks persistent: a superset of the ids `runIdsOfRoot(state)` lists (it keeps the ids a fold hides),
 * which is fine for `.has`. None unless the root shows a model.
 */
export const persistentIdsOfRoot = (state: RootState | undefined): ReadonlySet<string> => {
  if (state === undefined) return new Set<string>();

  const model = shownModelOf(state);

  if (model === null) return new Set<string>();

  return persistentIdsOf(model);
};
