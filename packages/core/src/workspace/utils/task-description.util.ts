import { posix } from 'node:path';

import type { TurboConfigFile, TurboConfigOk } from '../common/turbo-config.type.ts';
import type { AffectedMode } from '../common/workspace-model.type.ts';

type DirEntry = [string, TurboConfigOk];

const isOk = (config: TurboConfigFile): config is TurboConfigOk => !('error' in config);

const dirEntry = (config: TurboConfigOk): DirEntry => [posix.dirname(config.path), config];

/** Own keys only: a task named `constructor` or `toString` must not find `Object.prototype`'s member. */
const ownDescription = (config: TurboConfigOk | undefined, key: string): string | null => {
  if (config === undefined) return null;

  const isOwn = Object.hasOwn(config.descriptions, key);

  if (!isOwn) return null;

  return config.descriptions[key] ?? null;
};

/** Parsed configs by directory (`.` = root); configs that failed to parse are left out. */
export const okConfigsByDir = (configs: TurboConfigFile[]): Map<string, TurboConfigOk> => {
  const entries = configs.filter(isOk).map(dirEntry);

  return new Map(entries);
};

/** Rule 5: the package config's `<task>`, then the root's `<pkg>#<task>`, then the root's `<task>`; `null` when none. */
export const descriptionOf = (configs: Map<string, TurboConfigOk>, packagePath: string, id: string): string | null => {
  const hashAt = id.indexOf('#');
  const taskName = id.slice(hashAt + 1);
  const root = configs.get('.');
  const own = ownDescription(configs.get(packagePath), taskName);
  const qualified = ownDescription(root, id);
  const bare = ownDescription(root, taskName);

  return own ?? qualified ?? bare;
};

/** `'task'` only for a parsed root config with `futureFlags.affectedUsingTaskInputs: true`. */
export const affectedModeOf = (rootConfig: TurboConfigFile | null): AffectedMode => {
  if (rootConfig === null) return 'package';

  const isTaskMode = isOk(rootConfig) && rootConfig.affectedUsingTaskInputs;

  return isTaskMode ? 'task' : 'package';
};
