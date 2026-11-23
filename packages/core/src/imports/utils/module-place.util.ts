import { posix, sep } from 'node:path';

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

/**
 * `path` is `dir` or lies below it, both resolved absolute paths. An exact-case prefix test: `path.relative` re-resolves
 * and lowercases both sides on win32, which made it the bench hot spot (spec §11 already leaves case mismatch a gap).
 */
const isUnder = (dir: string, path: string): boolean => {
  const withSep = dir + sep;
  const prefix = dir.endsWith(sep) ? dir : withSep;

  return path === dir || path.startsWith(prefix);
};

/** `path` relative to `dir` with posix separators; `path` must satisfy `isUnder(dir, path)`. */
const posixFrom = (dir: string, path: string): string => {
  const pastSep = dir.length + 1;
  const start = dir.endsWith(sep) ? dir.length : pastSep;

  return path.slice(start).replaceAll(sep, '/');
};

/** The deepest package dir that contains `path`; the package being resolved wins a tie. */
const ownerOf = (path: string, context: ModuleResolveContext): Owner | null => {
  let best: Owner | null = null;

  for (const owner of ownersOf(context)) {
    const isInside = isUnder(owner.dir, path);

    if (!isInside) continue;

    const isDeeper = best === null || owner.dir.length > best.dir.length;

    if (isDeeper) best = owner;
  }

  return best;
};

/**
 * The first walked file `r` names, in probe order: the JS extension swap, `r` itself, `r` plus a suffix, then `r/index`
 * plus a suffix. Lazy: it stops at the first hit, so the common case builds one or two strings.
 */
const walkedFileOf = (r: string, walked: ReadonlySet<string>): string | undefined => {
  const extension = posix.extname(r);
  const stem = r.slice(0, r.length - extension.length);
  const swaps = JS_EXTENSION_SWAPS.get(extension) ?? [];
  const indexDir = r === '' ? '' : `${r}/`;
  const swapped = swaps.map((suffix) => stem + suffix);
  const probes = [...swapped, r];

  return (
    probes.find((candidate) => walked.has(candidate)) ??
    SOURCE_SUFFIXES.map((suffix) => r + suffix).find((candidate) => walked.has(candidate)) ??
    SOURCE_SUFFIXES.map((suffix) => `${indexDir}index${suffix}`).find((candidate) => walked.has(candidate))
  );
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

  const r = posixFrom(context.dir, path);
  const file = walkedFileOf(r, context.walked);

  if (file !== undefined) {
    const found: ModuleTarget = { kind: 'file', file };

    return found;
  }

  const isAsset = ASSET_SUFFIXES.includes(posix.extname(r));
  const kind: ModuleBucket = isAsset ? 'assets' : 'unresolved';
  const bucket: ModuleTarget = { kind };

  return bucket;
};
