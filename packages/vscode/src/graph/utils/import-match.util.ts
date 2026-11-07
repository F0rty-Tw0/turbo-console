import { resolve } from 'node:path';

import { isWithin } from '@turbo-console/core';
import type { TsconfigPaths } from '@turbo-console/core';
import type { ImportVia } from '@turbo-console/webview-ui';

import { aliasTargetsOf } from './alias-targets.util.ts';
import type { ImportEdge } from '../common/import-match.type.ts';

/** TS `pathIsRelative`: the names TS never maps through `paths`, so a backslash after the dots (`.\x`) counts too. */
const PATHS_SKIPPED = /^\.\.?(?:$|[\\/])/;

const isNameOf = (specifier: string, name: string): boolean => specifier === name || specifier.startsWith(`${name}/`);

const isRelativeSpecifier = (specifier: string): boolean => {
  const isDots = specifier === '.' || specifier === '..';
  const isDotPath = specifier.startsWith('./') || specifier.startsWith('../');

  return isDots || isDotPath;
};

const isInto = (path: string, edge: ImportEdge, targetDir: string): boolean => {
  const isInTarget = isWithin(targetDir, path);

  if (!isInTarget) return false;

  const isInSource = isWithin(edge.sourceDir, path);

  if (!isInSource) return true;

  const isTargetInSource = isWithin(edge.sourceDir, targetDir);

  return isTargetInSource;
};

const isRelativeInto = (specifier: string, fromDir: string, edge: ImportEdge): boolean => {
  const { targetDir } = edge;
  const isRelative = isRelativeSpecifier(specifier);

  if (targetDir === null || !isRelative) return false;

  const path = resolve(fromDir, specifier);

  return isInto(path, edge, targetDir);
};

const isAliasInto = (specifier: string, edge: ImportEdge, tsconfigPaths: TsconfigPaths | null): boolean => {
  const { targetDir } = edge;

  if (targetDir === null || tsconfigPaths === null) return false;

  const isSkipped = PATHS_SKIPPED.test(specifier);

  if (isSkipped) return false;

  const { baseUrl, paths } = tsconfigPaths;
  const targets = aliasTargetsOf(specifier, paths);
  const isTargetInto = (target: string): boolean => isInto(resolve(baseUrl, target), edge, targetDir);

  return targets.some(isTargetInto);
};

/** How `specifier`, imported from a file in `fromDir` (absolute), names B (D5 rules 1–4, first wins), or `null`. */
export const importMatchOf = (
  specifier: string,
  fromDir: string,
  edge: ImportEdge,
  tsconfigPaths: TsconfigPaths | null
): ImportVia | null => {
  const isNamed = edge.names.some((name) => isNameOf(specifier, name));

  if (isNamed) return 'name';

  const isRelative = isRelativeInto(specifier, fromDir, edge);

  if (isRelative) return 'relative';

  const isAlias = isAliasInto(specifier, edge, tsconfigPaths);

  return isAlias ? 'alias' : null;
};
