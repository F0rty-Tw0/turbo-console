import { constants } from 'node:fs';
import { open, realpath } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import { platformBinary } from './platform-binary.ts';
import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { ioMessage, plainPath } from '../../shared/errors/utils/turbo-message.util.ts';
import type { WorkspaceTurbo } from '../common/turbo-binary.type.ts';
import { errnoCode, isMissing } from '../utils/errno.util.ts';

const turboManifestSchema = z.object({ version: z.string() });

/** turbo's own `package.json` is about 1 KB; a bigger one is not parsed. */
const MAX_MANIFEST_BYTES = 1024 * 1024;

/**
 * A FIFO opened non-blocking returns at once instead of waiting for a writer, and is then rejected as not a regular
 * file. Windows defines no `O_NONBLOCK` (and has no FIFOs): `| undefined` is `| 0` there.
 */
const READ_NON_BLOCKING = constants.O_RDONLY | constants.O_NONBLOCK;

/** Carries no `cause`: a parse error quotes the file's text, which may be anything (a linked `/proc/self/environ`). */
const invalidManifest = (manifestPath: string): TurboException =>
  new TurboException('invalid-output', `${plainPath(manifestPath)} is not a valid turbo package.json`);

/** A close that fails after another failure must not replace it. */
const ignoreCloseError = (): undefined => undefined;

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

/** At most `MAX_MANIFEST_BYTES + 1` bytes, whatever size the file reports: procfs files report 0 and read on. */
const readBounded = async (handle: FileHandle): Promise<Buffer> => {
  const buffer = Buffer.alloc(MAX_MANIFEST_BYTES + 1);
  let filled = 0;
  let isEnd = false;

  while (!isEnd && filled < buffer.length) {
    const { bytesRead } = await handle.read(buffer, filled, buffer.length - filled, null);

    filled += bytesRead;
    isEnd = bytesRead === 0;
  }

  return buffer.subarray(0, filled);
};

const readSmallFile = async (handle: FileHandle, manifestPath: string): Promise<string> => {
  const stats = await handle.stat();
  const isFile = stats.isFile();

  if (!isFile) throw invalidManifest(manifestPath);

  const bytes = await readBounded(handle);
  const isTooBig = bytes.length > MAX_MANIFEST_BYTES;

  if (isTooBig) throw invalidManifest(manifestPath);

  return bytes.toString('utf8');
};

/**
 * The manifest's text. A `FileHandle` error, a failed close among them, carries no path, so it becomes `io` naming
 * the manifest here; a close failing after an earlier failure leaves that one in place.
 */
const readManifest = async (manifestPath: string): Promise<string> => {
  const handle = await open(manifestPath, READ_NON_BLOCKING);

  try {
    const text = await readSmallFile(handle, manifestPath);

    await handle.close();

    return text;
  } catch (error) {
    await handle.close().catch(ignoreCloseError);

    if (error instanceof TurboException) throw error;

    throw new TurboException('io', ioMessage(manifestPath, errnoCode(error)), { cause: error });
  }
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
 * this OS and arch inside that boundary. Other filesystem errors carry
 * their path, so the caller converts them to `io`.
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
