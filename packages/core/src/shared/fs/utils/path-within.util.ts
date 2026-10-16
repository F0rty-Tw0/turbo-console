import { isAbsolute, relative, sep } from 'node:path';

/**
 * `dir` is `boundary` or lies below it; both absolute. A different drive or root is outside. It compares resolved path
 * text only and never touches the file system, so it does not follow symlinks: a caller enforcing containment against
 * symlinks must pass real paths (`realpath`).
 */
export const isWithin = (boundary: string, dir: string): boolean => {
  const fromBoundary = relative(boundary, dir);
  const isParentStep = fromBoundary === '..' || fromBoundary.startsWith(`..${sep}`);
  const isOutside = isParentStep || isAbsolute(fromBoundary);

  return !isOutside;
};
