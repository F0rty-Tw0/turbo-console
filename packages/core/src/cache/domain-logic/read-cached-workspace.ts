import * as nodePath from 'node:path';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import type { TurboBinary } from '../../binary/common/index.ts';
import { toTurboException } from '../../shared/errors/utils/turbo-error.util.ts';
import { absolutePath } from '../../shared/fs/utils/input-path.util.ts';
import type { CacheEntry, CachedWorkspace } from '../common/cache.type.ts';
import { hashKeyedFiles } from '../data-access/keyed-files.ts';
import { findEntry } from '../data-access/store-workspace.ts';
import { cacheKeyOf } from '../utils/cache-key.util.ts';

const COMMAND = 'cache read';

/** A binary resolved for another root proves nothing about the turbo this entry would run under, so it never reads fresh. */
const isFreshEntry = async (root: string, entry: CacheEntry, binary: TurboBinary): Promise<boolean> => {
  if (binary.root !== root) return false;

  try {
    const files = await hashKeyedFiles(root, entry.keyedPaths);
    const key = cacheKeyOf(files, binary.version);

    return entry.key === key;
  } catch (error) {
    throw toTurboException(error, COMMAND);
  }
};

/**
 * Spec §4.5: the model last stored for `root`, from memory or else from `cacheDir`, with zero spawns; `null` when
 * neither holds one. `root` is normalized as `resolveTurbo` normalizes it, so the read finds the entry stored under
 * `binary.root` without resolving the binary first. The read hashes nothing, so a caller can show the model before it
 * knows whether it is fresh: `isFresh` takes the resolved `binary`, hashes the entry's keyed files when called and
 * resolves whether they give the stored key under `binary.version` (a `null` key never does, nor a `binary` whose
 * `root` is not this normalized root, so no bare version string can vouch for an entry). A stale model is still
 * returned, for the caller to show while it reloads. The caller gets its own copy of the model: changing it changes
 * nothing the cache holds. `cacheDir` must be the editor's own storage, never inside the workspace: a cloned repo could
 * ship a pre-keyed cache file that reads as fresh, and turbo would never run. Both the read and `isFresh` reject with
 * `TurboException` only; the read rejects `invalid-argument`, before memory or disk is read, when `root` or `cacheDir`
 * holds a NUL byte or is empty, relative or (on Windows) driveless, so neither can resolve against the host's cwd.
 */
export const readCachedWorkspace = async (root: string, cacheDir: string): Promise<CachedWorkspace | null> => {
  try {
    const absoluteRoot = absolutePath(root, 'turbo root', nodePath);
    const dir = absolutePath(cacheDir, 'cacheDir', nodePath);
    const entry = await findEntry(absoluteRoot, dir);

    if (entry === null) return null;

    const model = structuredClone(entry.model);
    const isFresh = async (binary: TurboBinary): Promise<boolean> => isFreshEntry(absoluteRoot, entry, binary);
    const cached: CachedWorkspace = { model, isFresh };

    return cached;
  } catch (error) {
    throw toTurboException(error, COMMAND);
  }
};
