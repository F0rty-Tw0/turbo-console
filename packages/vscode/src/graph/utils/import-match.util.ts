import { resolve } from 'node:path';

import { isWithin } from '@turbo-console/core';
import type { ImportVia } from '@turbo-console/webview-ui';

import type { ImportEdge } from '../common/import-match.type.ts';

const isNameOf = (specifier: string, name: string): boolean => specifier === name || specifier.startsWith(`${name}/`);

const isRelativeSpecifier = (specifier: string): boolean => {
  const isDots = specifier === '.' || specifier === '..';
  const isDotPath = specifier.startsWith('./') || specifier.startsWith('../');

  return isDots || isDotPath;
};

const isRelativeInto = (specifier: string, fromDir: string, edge: ImportEdge): boolean => {
  const { targetDir, sourceDir } = edge;
  const isRelative = isRelativeSpecifier(specifier);

  if (targetDir === null || !isRelative) return false;

  const path = resolve(fromDir, specifier);
  const isInTarget = isWithin(targetDir, path);
  const isInSource = isWithin(sourceDir, path);
  const isTargetInSource = isWithin(sourceDir, targetDir);
  const isOwnFile = isInSource && !isTargetInSource;

  return isInTarget && !isOwnFile;
};

/** How `specifier`, imported from a file in `fromDir` (absolute), names B (D5 rules 1–3, first wins), or `null`. Rule 4 (`alias`) arrives with U8g. */
export const importMatchOf = (specifier: string, fromDir: string, edge: ImportEdge): ImportVia | null => {
  const isNamed = edge.names.some((name) => isNameOf(specifier, name));

  if (isNamed) return 'name';

  const isRelative = isRelativeInto(specifier, fromDir, edge);

  return isRelative ? 'relative' : null;
};
