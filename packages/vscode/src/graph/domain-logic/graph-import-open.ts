import { join } from 'node:path';

import { isWithin } from '@turbo-console/core';

import { openReadable } from './graph-read.ts';
import type { ExplainContext } from '../common/graph.type.ts';
import { packagesByName } from '../utils/graph-package.util.ts';
import { importFileOf } from '../utils/import-file.util.ts';

/**
 * The real location of `absolute` when it stays inside the real `packageDir`; `null` on a symlink out or a path that
 * cannot be resolved.
 */
const realFileOf = async (context: ExplainContext, packageDir: string, absolute: string): Promise<string | null> => {
  const { realPath } = context.ports;
  const [realDir, realFile] = await Promise.all([realPath(packageDir), realPath(absolute)]);

  if (realDir === null || realFile === null) return null;

  const isInside = isWithin(realDir, realFile);

  return isInside ? realFile : null;
};

/**
 * Opens `file` of a listed package at `line` after D12's rules, a check that its real location (symlinks resolved) is
 * still inside the package dir, and a read; `false` when the state is not a graph, the package is not listed or a rule
 * or the check fails: nothing read or opened.
 */
export const openImport = async (packageName: string, file: string, line: number, context: ExplainContext): Promise<boolean> => {
  const { state } = context;

  if (state.kind !== 'graph') return false;

  const pkg = packagesByName(state).get(packageName);

  if (pkg === undefined) return false;

  const absolute = importFileOf(context.root, pkg.path, file);

  if (absolute === null) return false;

  const real = await realFileOf(context, join(context.root, pkg.path), absolute);

  if (real === null) return false;

  await openReadable(context, real, line, 'source file');

  return true;
};
