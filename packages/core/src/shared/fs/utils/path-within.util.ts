import { isAbsolute, relative, sep } from 'node:path';

/** `dir` is `boundary` or lies below it; both absolute. A different drive or root is outside. */
export const isWithin = (boundary: string, dir: string): boolean => {
  const fromBoundary = relative(boundary, dir);
  const isParentStep = fromBoundary === '..' || fromBoundary.startsWith(`..${sep}`);
  const isOutside = isParentStep || isAbsolute(fromBoundary);

  return !isOutside;
};
