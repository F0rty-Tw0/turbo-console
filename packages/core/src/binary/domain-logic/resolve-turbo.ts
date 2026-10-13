import * as nodePath from 'node:path';

import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { toTurboException } from '../../shared/errors/utils/turbo-error.util.ts';
import { plainPath, versionUnsupportedMessage } from '../../shared/errors/utils/turbo-message.util.ts';
import { absolutePath } from '../../shared/fs/utils/input-path.util.ts';
import { SUPPORTED_TURBO_RANGE } from '../../shared/turbo/common/turbo-version.const.ts';
import { checkCwd } from '../../shared/turbo/data-access/check-cwd.ts';
import { isSupportedTurboVersion } from '../../shared/turbo/utils/turbo-version.util.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import { TurboBinary } from '../common/index.ts';
import type { ResolveTurboOptions } from '../common/turbo-binary.type.ts';
import { overrideVersion } from '../data-access/override-turbo.ts';
import { findWorkspaceTurbo } from '../data-access/workspace-turbo.ts';

const overrideBinary = async (root: string, overridePath: string, signal: AbortSignal | undefined): Promise<TurboBinary> => {
  const version = await overrideVersion(overridePath, root, signal);

  return new TurboBinary(root, overridePath, version, 'override');
};

const workspaceBinary = async (root: string): Promise<TurboBinary> => {
  const found = await findWorkspaceTurbo(root);

  if (found === null) throw new TurboException('not-found', `no turbo package in ${plainPath(nodePath.join(root, 'node_modules'))}`);

  return new TurboBinary(root, found.path, found.version, 'workspace');
};

const pickBinary = async (root: string, options: ResolveTurboOptions): Promise<TurboBinary> => {
  if (options.overridePath === undefined) return workspaceBinary(root);

  return overrideBinary(root, options.overridePath, options.signal);
};

/** Checked before anything touches the disk: a relative, driveless or NUL-holding `overridePath` is `invalid-argument`; a good one is normalized. */
const withAbsoluteOverride = (options: ResolveTurboOptions): ResolveTurboOptions => {
  const { overridePath } = options;

  if (overridePath === undefined) return options;

  const absoluteOverride = absolutePath(overridePath, 'turbo overridePath', nodePath);
  const checked: ResolveTurboOptions = { ...options, overridePath: absoluteOverride };

  return checked;
};

/**
 * `checkCwd` gets a signal that never aborts, not the caller's: an aborted caller signal makes `checkCwd` resolve,
 * which would skip the root check. The caller's signal still reaches the override's `--version` spawn.
 */
const NEVER_ABORTED = new AbortController().signal;

/**
 * The turbo binary for the workspace at `root` (normalized). A `root` or `overridePath` that holds a NUL byte, or is
 * empty, relative or (on Windows) driveless, is rejected first, `root` before `overridePath`, with no disk access.
 * `root` is then checked on both paths, whatever the caller's signal, so a missing, non-directory or unsearchable root
 * is `io` naming it, even on an override memo hit. Then `overridePath` when given, after one `--version` spawn per file
 * state; otherwise the platform binary of `<root>/node_modules/turbo`, read without a spawn: only a binary whose real
 * path lies inside the root's own real `node_modules` counts, never an ancestor's, `NODE_PATH` or a global folder.
 * Never a shell, `PATH` or `node_modules/.bin`. Rejects with `TurboException` only: `invalid-argument` (a bad `root` or
 * `overridePath`, see above, named in the message as `turbo root` or `turbo overridePath`), `not-found` (no turbo
 * package, no platform binary, override missing or not runnable), `failed` (`--version` exits non-zero, times out or is
 * aborted), `version-unsupported` (outside `SUPPORTED_TURBO_RANGE` or unparsable), `io` (the root, or a
 * `turbo/package.json` or platform binary that cannot be read), `invalid-output` (a `turbo/package.json` that is not a
 * regular file of at most 1 MiB holding JSON with a string `version`).
 */
export const resolveTurbo = async (root: string, options: ResolveTurboOptions): Promise<TurboBinary> => {
  try {
    const absoluteRoot = absolutePath(root, 'turbo root', nodePath);
    const checked = withAbsoluteOverride(options);

    await checkCwd(absoluteRoot, NEVER_ABORTED);

    const binary = await pickBinary(absoluteRoot, checked);
    const isSupported = isSupportedTurboVersion(binary.version, SUPPORTED_TURBO_RANGE);

    if (!isSupported) throw new TurboException('version-unsupported', versionUnsupportedMessage(binary.version, SUPPORTED_TURBO_RANGE));

    return binary;
  } catch (error) {
    throw toTurboException(error, '--version');
  }
};
