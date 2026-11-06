import { join, win32 } from 'node:path';

import { isSourceName, isWithin } from '@turbo-console/core';

/** `..`, `node_modules` in any case (case-insensitive disks), and a `:` (NTFS stream, drive) or `~` (8.3 short name). */
const isBarredSegment = (segment: string): boolean => {
  const isParent = segment === '..';
  const isModules = segment.toLowerCase() === 'node_modules';
  const hasWindowsMark = segment.includes(':') || segment.includes('~');

  return isParent || isModules || hasWindowsMark;
};

const SPACE_CODE = 32;

const isControlChar = (char: string): boolean => (char.codePointAt(0) ?? SPACE_CODE) < SPACE_CODE;

/**
 * The absolute path of `file` (posix, relative to the package's dir) when D12 allows opening it, else `null`. A backslash or
 * a control character (NUL, newline) bars it.
 */
export const importFileOf = (root: string, packagePath: string, file: string): string | null => {
  const hasBarredChar = file.includes('\\') || Array.from(file).some(isControlChar);
  const isAbsolute = win32.isAbsolute(file);
  const hasBarredSegment = file.split('/').some(isBarredSegment);
  const isSource = isSourceName(file);
  const isAllowed = isSource && !hasBarredChar && !isAbsolute && !hasBarredSegment;

  if (!isAllowed) return null;

  const packageDir = join(root, packagePath);
  const absolute = join(packageDir, file);
  const isInside = isWithin(packageDir, absolute);

  return isInside ? absolute : null;
};
