import { realpath } from 'node:fs/promises';
import { join } from 'node:path';

import { object, string } from 'zod/mini';

import { platformBinary } from './platform-binary.ts';
import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { errnoCode, isMissing } from '../../shared/errors/utils/errno.util.ts';
import { ioMessage, plainPath } from '../../shared/errors/utils/turbo-message.util.ts';
import { readSmallFile } from '../../shared/fs/data-access/small-file.ts';
import type { WorkspaceTurbo } from '../common/turbo-binary.type.ts';

const turboManifestSchema = object({ version: string() });

/** Carries no `cause`: a parse error quotes the file's text, which may be anything (a linked `/proc/self/environ`). */
const invalidManifest = (manifestPath: string): TurboException =>
  new TurboException('invalid-output', `${plainPath(manifestPath)} is not a valid turbo package.json`);

/** `path` with every symlink resolved, or `null` when it (or a parent) does not exist; other errors carry their path. */
const realPathOrNull = async (path: string): Promise<string | null> => {
  try {
    return await realpath(path);
  } catch (error) {
    const isAbsent = isMissing(error);

    if (isAbsent) return null;

    throw error;
  }
};

/** The manifest's text, or `null` when it is not a regular file of at most 1 MiB. A read error is `io` naming the manifest. */
const readManifestFile = async (manifestPath: string): Promise<string | null> => {
  try {
    return await readSmallFile(manifestPath);
  } catch (error) {
    throw new TurboException('io', ioMessage(manifestPath, errnoCode(error)), { cause: error });
  }
};

const readManifest = async (manifestPath: string): Promise<string> => {
  const text = await readManifestFile(manifestPath);

  if (text === null) throw invalidManifest(manifestPath);

  return text;
};

const manifestVersion = (manifestPath: string, text: string): string => {
  try {
    const json: unknown = JSON.parse(text);

    return turboManifestSchema.parse(json).version;
  } catch {
    throw invalidManifest(manifestPath);
  }
};

/**
 * The native binary of the `turbo` package installed in `<root>/node_modules`, with that package's version; `null` when
 * there is none. Only the root's own `node_modules` counts: no ancestor folder, `NODE_PATH` or global folder, and the
 * root's `package.json` is never read. The platform package is looked up in the dirs Node would search from turbo's
 * real path, kept inside the real `<root>/node_modules` (npm hoisting and pnpm's `.pnpm` store both lie there), and
 * the binary's own real path must lie there too. Throws `invalid-output` when `turbo/package.json` is not a regular
 * file of at most 1 MiB holding JSON with a string `version`, and `not-found` when there is no platform binary for
 * this OS and arch inside that boundary. A failed manifest read throws `io` naming the manifest; the other filesystem
 * errors (resolving real paths, finding the platform binary) carry their path, so the caller converts them to `io`.
 */
export const findWorkspaceTurbo = async (root: string): Promise<WorkspaceTurbo | null> => {
  const nodeModules = join(root, 'node_modules');
  const manifestPath = join(nodeModules, 'turbo', 'package.json');
  const realManifest = await realPathOrNull(manifestPath);

  if (realManifest === null) return null;

  const boundary = await realpath(nodeModules);
  const text = await readManifest(manifestPath);
  const version = manifestVersion(manifestPath, text);
  const path = await platformBinary(realManifest, boundary);

  if (path === null) {
    const where = `${process.platform}-${process.arch} inside ${plainPath(nodeModules)}`;

    throw new TurboException('not-found', `no turbo binary for ${where} (a turbo linked from elsewhere needs overridePath)`);
  }

  const found: WorkspaceTurbo = { path, version };

  return found;
};
