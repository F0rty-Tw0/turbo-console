import { posix } from 'node:path';

import { ROOT_DIR, ROOT_NAME, dirOfName, packageDirOf } from './turbo-task-lookup.util.ts';
import { bareTasksOf, persistentOf } from './turbo-task-persistent.util.ts';
import type {
  RootTaskIndex,
  TaskPresence,
  TurboConfigFile,
  TurboConfigOk,
  TurboTaskFacts,
  TurboTaskLookup,
  TurboTaskPackage
} from '../common/turbo-config.type.ts';

/** Read only, never pushed to: a chain is copied into its child's with a spread. */
const EMPTY_CHAIN: TurboConfigOk[] = [];

type DirEntry = [string, TurboConfigFile];

const dirEntry = (config: TurboConfigFile): DirEntry => [posix.dirname(config.path), config];

const nameEntry = (pkg: TurboTaskPackage): [string, TurboTaskPackage] => [pkg.name, pkg];

const applyPresence = (names: Set<string>, name: string, presence: TaskPresence): void => {
  if (presence === 'excluded') {
    names.delete(name);

    return;
  }

  names.add(name);
};

/** The package names a `<pkg>#<task>` root key names: npm names hold no `#`, so the name ends at the first one. */
const qualifiedNamesOf = (root: TurboConfigOk): Set<string> => {
  const names = new Set<string>();

  for (const key of Object.keys(root.tasks)) {
    const hashAt = key.indexOf('#');

    if (hashAt !== -1) names.add(key.slice(0, hashAt));
  }

  return names;
};

const rootIndexOf = (configsByDir: Map<string, TurboConfigFile>): RootTaskIndex | null => {
  const config = configsByDir.get(ROOT_DIR);

  if (config === undefined || 'error' in config) return null;

  const qualifiedNames = qualifiedNamesOf(config);
  const bareTasks = bareTasksOf(config);
  const index: RootTaskIndex = { config, qualifiedNames, bareTasks };

  return index;
};

/** `packages` are every graph package, hidden ones included: a package config may extend any of them. */
export const turboTaskLookupOf = (configs: TurboConfigFile[], packages: TurboTaskPackage[]): TurboTaskLookup => {
  const configsByDir = new Map(configs.map(dirEntry));
  const packagesByName = new Map(packages.map(nameEntry));
  const root = rootIndexOf(configsByDir);
  const lookup: TurboTaskLookup = { configsByDir, packagesByName, root };

  return lookup;
};

/**
 * A root key names a task of one package (`web#build`) or of every package but the root (`build`): turbo 2.11.7 runs
 * the root package's `build` script only for a `//#build` key.
 */
const rootKeyTaskOf = (key: string, packageName: string): string | null => {
  const prefix = `${packageName}#`;
  const isOwn = key.startsWith(prefix);

  if (isOwn) return key.slice(prefix.length);

  const isQualified = key.includes('#');

  if (isQualified || packageName === ROOT_NAME) return null;

  return key;
};

const applyRoot = (names: Set<string>, root: TurboConfigOk, packageName: string): void => {
  for (const [key, presence] of Object.entries(root.tasks)) {
    const task = rootKeyTaskOf(key, packageName);

    if (task !== null) applyPresence(names, task, presence);
  }
};

/**
 * The package configs of `dir`'s package, highest priority first: its own config, then each `extends` name after `//`
 * in listed order, each followed by its own chain (depth first). `[]` when the package has no config; `null` when a
 * config of the chain did not parse, its `extends` does not start with `//` (turbo 2.11.7 rejects it), or an `extends`
 * name is no package. `seen` keeps a cycle or a shared parent to one visit.
 */
const chainOf = (lookup: TurboTaskLookup, dir: string, seen: Set<string>): TurboConfigOk[] | null => {
  const config = lookup.configsByDir.get(dir);

  if (config === undefined) return EMPTY_CHAIN;

  if ('error' in config) return null;

  const [first, ...parentNames] = config.extends;

  if (first !== ROOT_NAME) return null;

  const chain: TurboConfigOk[] = [config];

  seen.add(dir);

  for (const name of parentNames) {
    if (name === ROOT_NAME) continue;

    const parentDir = dirOfName(lookup, name);

    if (parentDir === undefined) return null;

    const isSeen = seen.has(parentDir);

    if (isSeen) continue;

    const parentChain = chainOf(lookup, parentDir, seen);

    if (parentChain === null) return null;

    chain.push(...parentChain);
  }

  return chain;
};

/** The root package has no package config: its one config is the root's. */
const packageChainOf = (lookup: TurboTaskLookup, dir: string): TurboConfigOk[] | null => {
  if (dir === ROOT_DIR) return EMPTY_CHAIN;

  const seen = new Set([ROOT_DIR]);

  return chainOf(lookup, dir, seen);
};

const applyTasks = (names: Set<string>, config: TurboConfigOk): void => {
  for (const [name, presence] of Object.entries(config.tasks)) applyPresence(names, name, presence);
};

/**
 * The tasks turbo 2.11.7 defines, and so runs, for `pkg`, each with its resolved `persistent` (`persistentOf`). The
 * first config with an entry for a name decides presence, in this order: the package's own config, the root config's
 * bare and `<pkg>#<task>` keys, then the parent chain of `chainOf`; an entry of exactly `{ "extends": false }` drops
 * the task. So a parent's exclusion hides only a task another parent package defines, never a root task. Applied
 * last-wins from the lowest priority up. `turbo query` lists a package script with no such key all the same, and
 * `turbo run` of a name no config defines exits 1. `null` when it cannot tell: no parsed root config, or a chain
 * `chainOf` cannot build.
 *
 * Runs once per package, so a package with no config and no `<pkg>#` root key gets the root index's shared `bareTasks`,
 * never a copy. The root package never does: its dir `.` always holds the root config.
 */
export const turboTasksOf = (lookup: TurboTaskLookup, pkg: TurboTaskPackage): ReadonlyMap<string, TurboTaskFacts> | null => {
  const { root } = lookup;

  if (root === null) return null;

  const dir = packageDirOf(pkg);
  const hasConfig = lookup.configsByDir.has(dir);
  const isQualified = root.qualifiedNames.has(pkg.name);

  if (!hasConfig && !isQualified) return root.bareTasks;

  const chain = packageChainOf(lookup, dir);

  if (chain === null) return null;

  const names = new Set<string>();
  const [own, ...parents] = chain;
  const lowestFirst = parents.toReversed();

  for (const config of lowestFirst) applyTasks(names, config);

  applyRoot(names, root.config, pkg.name);

  if (own !== undefined) applyTasks(names, own);

  return persistentOf(lookup, root.config, pkg, names);
};
