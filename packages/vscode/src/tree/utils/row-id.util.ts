import type { RowKind } from '../common/tree-row.type.ts';

/**
 * Spec §4.3 item identity: a typed prefix, so a crafted package name cannot collide with another kind, and a NUL between
 * root and key (a path holds none). A root row is just the root path.
 */
export const rowIdOf = (kind: RowKind, root: string, key: string): string => {
  if (kind === 'root') return `root:${root}`;

  return `${kind}:${root}\0${key}`;
};
