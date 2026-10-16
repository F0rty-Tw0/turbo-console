import { posix } from 'node:path';

import { normalDir, toPosixPath } from '../../shared/turbo/utils/posix-path.util.ts';
import type { TaskPresence, TurboConfigFile, TurboConfigOk, TurboTaskLookup, TurboTaskPackage } from '../common/turbo-config.type.ts';

const ROOT_DIR = '.';

/** The root package's name in a task id (`//#fmt`) and the root config's name in `extends`. */
const ROOT_NAME = '//';

/** Read only, never pushed to: a chain is copied into its child's with a spread. */
const EMPTY_CHAIN: TurboConfigOk[] = [];

type DirEntry = [string, TurboConfigFile];

const dirEntry = (config: TurboConfigFile): DirEntry => [posix.dirname(config.path), config];

const nameEntry = (pkg: TurboTaskPackage): [string, string] => [pkg.name, normalDir(toPosixPath(pkg.path))];

/** `packages` are every graph package, hidden ones included: a package config may extend any of them. */
export const turboTaskLookupOf = (configs: TurboConfigFile[], packages: TurboTaskPackage[]): TurboTaskLookup => {
  const configsByDir = new Map(configs.map(dirEntry));
  const dirsByName = new Map(packages.map(nameEntry));
  const lookup: TurboTaskLookup = { configsByDir, dirsByName };

  return lookup;
};

const applyPresence = (names: Set<string>, name: string, presence: TaskPresence): void => {
  if (presence === 'excluded') {
    names.delete(name);

    return;
  }

  names.add(name);
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
 * The package configs whose tasks `dir`'s package merges, in turbo's order: the `extends` names after `//`, each with
 * its own chain first, then the package's own config. `[]` when the package has no config; `null` when a config of the
 * chain did not parse or an `extends` name is no package. `seen` keeps a cycle or a shared parent to one visit.
 */
const chainOf = (lookup: TurboTaskLookup, dir: string, seen: Set<string>): TurboConfigOk[] | null => {
  const config = lookup.configsByDir.get(dir);

  if (config === undefined) return EMPTY_CHAIN;

  if ('error' in config) return null;

  const chain: TurboConfigOk[] = [];

  seen.add(dir);

  for (const name of config.extends) {
    if (name === ROOT_NAME) continue;

    const parentDir = lookup.dirsByName.get(name);

    if (parentDir === undefined) return null;

    const isSeen = seen.has(parentDir);

    if (isSeen) continue;

    const parentChain = chainOf(lookup, parentDir, seen);

    if (parentChain === null) return null;

    chain.push(...parentChain);
  }

  chain.push(config);

  return chain;
};

/** The root package has no package config: its one config is the root's. */
const packageChainOf = (lookup: TurboTaskLookup, dir: string): TurboConfigOk[] | null => {
  if (dir === ROOT_DIR) return EMPTY_CHAIN;

  const seen = new Set([ROOT_DIR]);

  return chainOf(lookup, dir, seen);
};

/**
 * The task names turbo 2.11 defines, and so runs, for `pkg`: the root config's bare and `<pkg>#<task>` keys, then the
 * package config chain, where an entry of exactly `{ "extends": false }` drops a task. `turbo query` lists a package
 * script with no such key all the same, and `turbo run` of a name no config defines exits 1. `null` when it cannot
 * tell: no parsed root config, or a config of the chain that did not parse.
 */
export const turboTaskNamesOf = (lookup: TurboTaskLookup, pkg: TurboTaskPackage): Set<string> | null => {
  const root = lookup.configsByDir.get(ROOT_DIR);

  if (root === undefined || 'error' in root) return null;

  const dir = normalDir(toPosixPath(pkg.path));
  const chain = packageChainOf(lookup, dir);

  if (chain === null) return null;

  const names = new Set<string>();

  applyRoot(names, root, pkg.name);

  for (const config of chain) {
    for (const [name, presence] of Object.entries(config.tasks)) applyPresence(names, name, presence);
  }

  return names;
};
