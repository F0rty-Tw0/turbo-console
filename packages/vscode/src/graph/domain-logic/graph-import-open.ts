import { openReadable } from './graph-read.ts';
import type { ExplainContext } from '../common/graph.type.ts';
import { packagesByName } from '../utils/graph-package.util.ts';
import { importFileOf } from '../utils/import-file.util.ts';

/**
 * Opens `file` of a listed package at `line` after D12's rules and a read; `false` when the state is not a graph, the
 * package is not listed or a rule fails: nothing read or opened.
 */
export const openImport = async (packageName: string, file: string, line: number, context: ExplainContext): Promise<boolean> => {
  const { state } = context;

  if (state.kind !== 'graph') return false;

  const pkg = packagesByName(state).get(packageName);

  if (pkg === undefined) return false;

  const absolute = importFileOf(context.root, pkg.path, file);

  if (absolute === null) return false;

  await openReadable(context, absolute, line, 'source file');

  return true;
};
