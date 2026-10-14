import type { TreeNode } from '../common/tree-node.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';

/** The cached node of `row.id`, else a new one stored under it: VS Code refreshes an item only for the object it holds. */
export const nodeFor = (cache: Map<string, TreeNode>, row: TreeRow): TreeNode => {
  const cached = cache.get(row.id);

  if (cached !== undefined) return cached;

  const node: TreeNode = { kind: row.kind, id: row.id, root: row.root, key: row.key, packageName: row.packageName };

  cache.set(row.id, node);

  return node;
};

/** The nodes of `rows` in order, each id once: VS Code rejects a level that repeats an id. */
export const nodesOf = (cache: Map<string, TreeNode>, rows: TreeRow[]): TreeNode[] => {
  const ids = new Set<string>();
  const nodes: TreeNode[] = [];

  for (const row of rows) {
    const isSeen = ids.has(row.id);

    if (isSeen) continue;

    ids.add(row.id);
    nodes.push(nodeFor(cache, row));
  }

  return nodes;
};

/** Drops the nodes of `root` whose id is not in `keep`; `keep` is every row id the root has now, never a subset. */
export const pruneNodes = (cache: Map<string, TreeNode>, root: string, keep: Set<string>): void => {
  for (const [id, node] of cache) {
    const isKept = keep.has(id);
    const isGone = node.root === root && !isKept;

    if (isGone) cache.delete(id);
  }
};
