import type { Span } from '../../shared/common/span.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';

const hasPackageRows = (rows: TreeRow[]): boolean => rows.some((row) => row.kind === 'pkg' || row.kind === 'dir');

/** Opens the root's span at its first `getChildren`; a later ask keeps the first start. */
export const markAsked = (spans: Map<string, Span>, root: string, now: number): void => {
  const isAsked = spans.has(root);

  if (isAsked) return;

  const span: Span = { start: now, end: null };

  spans.set(root, span);
};

/** Closes the root's open span when it first returns package or folder rows; message rows alone leave it open. */
export const markShown = (spans: Map<string, Span>, root: string, rows: TreeRow[], now: number): void => {
  const span = spans.get(root);

  if (span?.end !== null) return;

  const isPackagesShown = hasPackageRows(rows);

  if (!isPackagesShown) return;

  const shown: Span = { start: span.start, end: now };

  spans.set(root, shown);
};
