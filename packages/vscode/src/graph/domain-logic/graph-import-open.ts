import { join } from 'node:path';

import { isWithin } from '@turbo-console/core';

import { logUnreadable, openReadable } from './graph-read.ts';
import type { ExplainContext } from '../common/graph.type.ts';
import { packagesByName } from '../utils/graph-package.util.ts';
import { importFileOf } from '../utils/import-file.util.ts';

/**
 * Where the real location (symlinks resolved) of `absolute` lies against the real `packageDir`: `gone` when the file
 * cannot be resolved (deleted since the scan; checked first, as a gone package dir takes its files along), `outside`
 * on a symlink out or a package dir that cannot be resolved, else `inside`.
 */
const placeOf = async (context: ExplainContext, packageDir: string, absolute: string): Promise<'gone' | 'outside' | 'inside'> => {
  const { realPath } = context.ports;
  const [realDir, realFile] = await Promise.all([realPath(packageDir), realPath(absolute)]);

  if (realFile === null) return 'gone';

  if (realDir === null) return 'outside';

  const isInside = isWithin(realDir, realFile);

  return isInside ? 'inside' : 'outside';
};

/**
 * Opens `file` of a listed package at `line` after D12's rules, a check that its real location (symlinks resolved) is
 * still inside the package dir, and a read of the path as given (as `openManifest` does, so the editor shows one tab);
 * `false` when the state is not a graph, the package is not listed or a rule or the check fails: nothing read or
 * opened. A file gone since the scan is logged as unreadable and is `true`.
 */
export const openImport = async (packageName: string, file: string, line: number, context: ExplainContext): Promise<boolean> => {
  const { state } = context;

  if (state.kind !== 'graph') return false;

  const pkg = packagesByName(state).get(packageName);

  if (pkg === undefined) return false;

  const absolute = importFileOf(context.root, pkg.path, file);

  if (absolute === null) return false;

  const place = await placeOf(context, join(context.root, pkg.path), absolute);

  if (place === 'outside') return false;

  if (place === 'gone') {
    logUnreadable(context, absolute, 'source file');

    return true;
  }

  await openReadable(context, absolute, line, 'source file');

  return true;
};
