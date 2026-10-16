import { normalDir, toPosixPath } from '../../shared/turbo/utils/posix-path.util.ts';
import type { TurboTaskLookup, TurboTaskPackage } from '../common/turbo-config.type.ts';

export const ROOT_DIR = '.';

/** The root package's name in a task id (`//#fmt`) and the root config's name in `extends`. */
export const ROOT_NAME = '//';

export const packageDirOf = (pkg: TurboTaskPackage): string => normalDir(toPosixPath(pkg.path));

/**
 * The dir of the package an `extends` name names; `undefined` when no graph package has that name. Only a matched
 * parent's dir is normalized: a model build looks up every package, but few configs extend one.
 */
export const dirOfName = (lookup: TurboTaskLookup, name: string): string | undefined => {
  const pkg = lookup.packagesByName.get(name);

  if (pkg === undefined) return undefined;

  return packageDirOf(pkg);
};

/**
 * A root key names a task of one package (`web#build`) or of every package but the root (`build`): turbo 2.11.7 runs
 * the root package's `build` script only for a `//#build` key.
 */
export const rootKeyTaskOf = (key: string, packageName: string): string | null => {
  const prefix = `${packageName}#`;
  const isOwn = key.startsWith(prefix);

  if (isOwn) return key.slice(prefix.length);

  const isQualified = key.includes('#');

  if (isQualified || packageName === ROOT_NAME) return null;

  return key;
};
