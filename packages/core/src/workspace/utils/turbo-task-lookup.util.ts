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
