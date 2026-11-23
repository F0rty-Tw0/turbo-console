import { resolve } from 'node:path';

import { aliasTargetsOf, isCatchAllOf } from './alias-targets.util.ts';
import { placeOf } from './module-place.util.ts';
import { isNameOf } from './specifier-name.util.ts';
import { PATHS_SKIPPED } from '../common/import-scan.const.ts';
import type { ModuleBucket, ModuleResolveContext, ModuleTarget } from '../common/module-graph.type.ts';

const isPlacedTarget = (target: ModuleTarget): boolean => target.kind === 'file' || target.kind === 'stub';

/** The first alias target that places as a file or stub, else the first target's bucket; null when no alias applies. */
const aliasedOf = (specifier: string, context: ModuleResolveContext): ModuleTarget | null => {
  const tsconfigPaths = context.tsconfigPaths;

  if (tsconfigPaths === null) return null;

  let first: ModuleTarget | null = null;

  for (const target of aliasTargetsOf(specifier, tsconfigPaths.paths)) {
    const placed = placeOf(resolve(tsconfigPaths.baseUrl, target), context);
    const isPlaced = isPlacedTarget(placed);

    if (isPlaced) return placed;

    first ??= placed;
  }

  return first;
};

/**
 * The bucket of an alias miss no later step claims: the first target's, unless the key was a catch-all such as `"*"`,
 * which names no namespace of its own, so the import is taken as an npm one (`external`), as TS's fallback would find it.
 */
const missedOf = (specifier: string, aliased: ModuleTarget | null, context: ModuleResolveContext): ModuleTarget | null => {
  const tsconfigPaths = context.tsconfigPaths;

  if (aliased === null || tsconfigPaths === null) return null;

  const isCatchAll = isCatchAllOf(specifier, tsconfigPaths.paths);

  if (isCatchAll) return null;

  return aliased;
};

/** A bare specifier no `paths` target placed: another workspace package's name, the own name, an alias miss, else external. */
const bareOf = (specifier: string, aliased: ModuleTarget | null, context: ModuleResolveContext): ModuleTarget => {
  const isOtherName = (name: string): boolean => isNameOf(specifier, name);
  const other = context.others.find((candidate) => candidate.names.some(isOtherName));

  if (other !== undefined) {
    const stub: ModuleTarget = { kind: 'stub', name: other.name };

    return stub;
  }

  const isSelfName = isNameOf(specifier, context.selfName);
  const isSelf = context.selfName !== '' && isSelfName;
  const missed = missedOf(specifier, aliased, context);

  if (!isSelf && missed !== null) return missed;

  const kind: ModuleBucket = isSelf ? 'self' : 'external';
  const bucket: ModuleTarget = { kind };

  return bucket;
};

/**
 * Where `specifier`, imported from the absolute native `fromDir`, lands. First match wins: a relative or absolute path
 * is placed, then a tsconfig `paths` target that places, then another workspace package's name, then the package's own
 * name (`self`). A `paths` key that matched but placed nowhere falls through to those steps, as TS falls back to normal
 * resolution; only then does it count in the first target's bucket (`missedOf`), else `external`. Exact-case; never
 * touches the disk.
 */
export const resolveSpecifierOf = (specifier: string, fromDir: string, context: ModuleResolveContext): ModuleTarget => {
  const isDotted = PATHS_SKIPPED.test(specifier);
  const isRooted = specifier.startsWith('/');
  const isPath = isDotted || isRooted;

  if (isPath) return placeOf(resolve(fromDir, specifier), context);

  const aliased = aliasedOf(specifier, context);

  if (aliased === null) return bareOf(specifier, null, context);

  const isAliasPlaced = isPlacedTarget(aliased);

  if (isAliasPlaced) return aliased;

  return bareOf(specifier, aliased, context);
};
