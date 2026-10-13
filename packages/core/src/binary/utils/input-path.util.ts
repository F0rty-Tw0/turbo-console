import type { PlatformPath } from 'node:path';

import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { plainPath } from '../../shared/errors/utils/turbo-message.util.ts';

/** A drive (`C:\`) or UNC (`\\server\share\`) root; a bare `\` is one character. */
const MIN_WINDOWS_ROOT_LENGTH = 2;

/** `name` is the caller's word for `value` in the message. Node's fs throws a raw `ERR_INVALID_ARG_VALUE` on a NUL byte. */
export const assertNoNulByte = (value: string, name: string): void => {
  const hasNul = value.includes('\0');

  if (hasNul) throw new TurboException('invalid-argument', `${name} must not hold a NUL byte: ${plainPath(value)}`);
};

/** On Windows `\tools\turbo.exe` passes `isAbsolute` yet still resolves against the current drive. */
const isFullyQualified = (path: string, platformPath: PlatformPath): boolean => {
  const isAbsolutePath = platformPath.isAbsolute(path);
  const isWindows = platformPath.sep === '\\';

  if (!isAbsolutePath || !isWindows) return isAbsolutePath;

  const { root } = platformPath.parse(path);

  return root.length >= MIN_WINDOWS_ROOT_LENGTH;
};

/**
 * `overridePath`, normalized with `platformPath`. A NUL byte, a relative path or (on Windows) a driveless one throws
 * `invalid-argument`: it would resolve against whatever cwd the host process happens to have, so `stat` and the spawn
 * could name a different file than the caller meant.
 */
export const absoluteOverridePath = (overridePath: string, platformPath: PlatformPath): string => {
  assertNoNulByte(overridePath, 'turbo overridePath');
  const isQualified = isFullyQualified(overridePath, platformPath);

  if (!isQualified) throw new TurboException('invalid-argument', `turbo overridePath must be absolute: ${plainPath(overridePath)}`);

  return platformPath.normalize(overridePath);
};
