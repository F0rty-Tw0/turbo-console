import { resolve } from 'node:path';

import { aliasTargetsOf } from './alias-targets.util.ts';
import { placeOf } from './module-place.util.ts';
import { isNameOf } from './specifier-name.util.ts';
import { PATHS_SKIPPED } from '../common/import-scan.const.ts';
import type { ModuleBucket, ModuleResolveContext, ModuleTarget } from '../common/module-graph.type.ts';

/** The first alias target that places as a file or stub, else the first target's bucket; null when no alias applies. */
const aliasedOf = (specifier: string, context: ModuleResolveContext): ModuleTarget | null => {
  const tsconfigPaths = context.tsconfigPaths;

  if (tsconfigPaths === null) return null;

  let first: ModuleTarget | null = null;

  for (const target of aliasTargetsOf(specifier, tsconfigPaths.paths)) {
    const placed = placeOf(resolve(tsconfigPaths.baseUrl, target), context);
    const isPlaced = placed.kind === 'file' || placed.kind === 'stub';

    if (isPlaced) return placed;

    first ??= placed;
  }

  return first;
};

/**
 * Where `specifier`, imported from the absolute native `fromDir`, lands. First match wins: a relative or absolute path
 * is placed, then tsconfig `paths`, then another workspace package's name, then the package's own name (`self`), else
 * `external`. Exact-case; never touches the disk.
 */
export const resolveSpecifierOf = (specifier: string, fromDir: string, context: ModuleResolveContext): ModuleTarget => {
  const isDotted = PATHS_SKIPPED.test(specifier);
  const isRooted = specifier.startsWith('/');
  const isPath = isDotted || isRooted;

  if (isPath) return placeOf(resolve(fromDir, specifier), context);

  const aliased = aliasedOf(specifier, context);

  if (aliased !== null) return aliased;

  const isOtherName = (name: string): boolean => isNameOf(specifier, name);
  const other = context.others.find((candidate) => candidate.names.some(isOtherName));

  if (other !== undefined) {
    const stub: ModuleTarget = { kind: 'stub', name: other.name };

    return stub;
  }

  const isSelf = context.selfName !== '' && isNameOf(specifier, context.selfName);
  const kind: ModuleBucket = isSelf ? 'self' : 'external';
  const bucket: ModuleTarget = { kind };

  return bucket;
};
