import type { RowContext, TreeNode, TreeRefresh } from './tree-node.type.ts';
import type { Roots } from '../../roots/common/coordinator.type.ts';

/** What `TreeRefresher` reads: the roots, the node cache it fires from and prunes, the event fire and the row context now. */
export type RefreshDeps = {
  readonly store: Roots;
  readonly cache: Map<string, TreeNode>;
  readonly fire: (refresh: TreeRefresh) => void;
  readonly rowContext: () => RowContext;
};
