import { posix, relative, sep } from 'node:path';

import { isWithin } from '../../shared/fs/utils/path-within.util.ts';
import { SOURCE_SUFFIXES } from '../common/import-scan.const.ts';
import { ASSET_SUFFIXES, JS_EXTENSION_SWAPS } from '../common/module-graph.const.ts';
import type { ModuleBucket, ModuleResolveContext, ModuleTarget } from '../common/module-graph.type.ts';

/** A package dir that can own a path; `stub` is null for the package being resolved. */
type Owner = {
  readonly dir: string;
  readonly stub: string | null;
};

const ownersOf = (context: ModuleResolveContext): Owner[] => {
  const owners: Owner[] = [{ dir: context.dir, stub: null }];

  for (const other of context.others) {
    if (other.dir !== null) owners.push({ dir: other.dir, stub: other.name });
  }

  return owners;
};

/** The deepest package dir that contains `path`; the package being resolved wins a tie. */
const ownerOf = (path: string, context: ModuleResolveContext): Owner | null => {
  let best: Owner | null = null;

  for (const owner of ownersOf(context)) {
    const isInside = isWithin(owner.dir, path);

    if (!isInside) continue;

    const isDeeper = best === null || owner.dir.length > best.dir.length;

    if (isDeeper) best = owner;
  }

  return best;
};

/** The walked files `r` may name, in probe order: the JS extension swap, `r` itself, `r` plus a suffix, then `r/index` plus a suffix. */
const candidatesOf = (r: string): string[] => {
  const extension = posix.extname(r);
  const stem = r.slice(0, r.length - extension.length);
  const swaps = JS_EXTENSION_SWAPS.get(extension) ?? [];
  const swapped = swaps.map((suffix) => stem + suffix);
  const suffixed = SOURCE_SUFFIXES.map((suffix) => r + suffix);
  const indexes = SOURCE_SUFFIXES.map((suffix) => posix.join(r, `index${suffix}`));

  return [...swapped, r, ...suffixed, ...indexes];
};

/**
 * Where the absolute native `path` lands: a walked file of this package, a stub for the deepest other package that owns
 * it, or a bucket (`assets` for a miss with an asset extension, else `unresolved`). Exact-case; never touches the disk.
 */
export const placeOf = (path: string, context: ModuleResolveContext): ModuleTarget => {
  const owner = ownerOf(path, context);

  if (owner === null) {
    const unresolved: ModuleTarget = { kind: 'unresolved' };

    return unresolved;
  }

  if (owner.stub !== null) {
    const stub: ModuleTarget = { kind: 'stub', name: owner.stub };

    return stub;
  }

  const r = relative(context.dir, path).replaceAll(sep, '/');
  const file = candidatesOf(r).find((candidate) => context.walked.has(candidate));

  if (file !== undefined) {
    const found: ModuleTarget = { kind: 'file', file };

    return found;
  }

  const isAsset = ASSET_SUFFIXES.includes(posix.extname(r));
  const kind: ModuleBucket = isAsset ? 'assets' : 'unresolved';
  const bucket: ModuleTarget = { kind };

  return bucket;
};
