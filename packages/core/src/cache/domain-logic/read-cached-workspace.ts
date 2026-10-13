import * as nodePath from 'node:path';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import type { TurboBinary } from '../../binary/common/index.ts';
import { absolutePath } from '../../binary/utils/input-path.util.ts';
import { toTurboException } from '../../shared/errors/utils/turbo-error.util.ts';
import type { CachedWorkspace } from '../common/cache.type.ts';
import { hashKeyedFiles } from '../data-access/keyed-files.ts';
import { findEntry } from '../data-access/store-workspace.ts';
import { cacheKeyOf } from '../utils/cache-key.util.ts';

const COMMAND = 'cache read';

/**
 * Spec §4.5: the model last stored for `binary.root`, from memory or else from `cacheDir`, with zero spawns; `null` when
 * neither holds one. `isFresh` when its keyed files, hashed again now, give the stored key (a `null` key never does). A
 * stale model is still returned, for the caller to show while it reloads. The caller gets its own copy of the model:
 * changing it changes nothing the cache holds. `cacheDir` must be the editor's own storage, never inside the workspace:
 * a cloned repo could ship a pre-keyed cache file that reads as fresh, and turbo would never run. Rejects with
 * `TurboException` only: `invalid-argument`, before memory or disk is read, when `cacheDir` is empty, relative or (on
 * Windows) driveless, so it cannot resolve against the host's cwd.
 */
export const readCachedWorkspace = async (binary: TurboBinary, cacheDir: string): Promise<CachedWorkspace | null> => {
  try {
    const dir = absolutePath(cacheDir, 'cacheDir', nodePath);
    const entry = await findEntry(binary.root, dir);

    if (entry === null) return null;

    const files = await hashKeyedFiles(binary.root, entry.keyedPaths);
    const key = cacheKeyOf(files, binary.version);
    const isFresh = entry.key === key;
    const model = structuredClone(entry.model);
    const cached: CachedWorkspace = { model, isFresh };

    return cached;
  } catch (error) {
    throw toTurboException(error, COMMAND);
  }
};
