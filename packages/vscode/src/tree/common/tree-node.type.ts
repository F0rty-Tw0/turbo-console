import type { Event, TreeItem } from 'vscode';

import type { ModelViewsOf } from './model-view.type.ts';
import type { TreeMode, TreeRow } from './tree-row.type.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
import type { RunLookup } from '../../run/common/run.type.ts';
import type { Span } from '../../shared/common/span.type.ts';

/**
 * The element VS Code holds for one row. One object per row id for as long as the row exists, so a `fire` with it
 * refreshes that item. `packageName` is set on `pkg` and `task` nodes: task names may hold `#` or `:`, so nothing splits
 * an id to recover the package.
 */
export type TreeNode = {
  readonly kind: TreeRow['kind'];
  readonly id: string;
  readonly root: string;
  readonly key: string;
  readonly packageName: string | null;
};

/**
 * What a node's rows are read with: the view mode, the runs, the model's view (built once per model) and whether
 * package rows read their full names (`scopeShown`) or their bare labels.
 */
export type RowContext = {
  readonly mode: TreeMode;
  readonly runs: RunLookup;
  readonly views: ModelViewsOf;
  readonly scopeShown: boolean;
};

/** `'root'` redraws the root (the whole tree in a single-root window); a list names the packages to redraw. */
export type RefreshTarget = 'root' | string[];

/** `treeVisible` gets one span per root: its first `getChildren`, ended when it first returns package or folder rows. */
export type TreePorts = {
  readonly runs: RunLookup;
  readonly fire: (node: TreeNode | undefined) => void;
  readonly treeVisible: Map<string, Span>;
  readonly now: () => number;
};

/** The public face of `PackagesTreeProvider`, so `common/` can name it without importing the feature. */
export type PackagesTreeApi = {
  readonly onDidChangeTreeData: Event<TreeNode | undefined>;
  readonly getChildren: (node?: TreeNode) => Promise<TreeNode[]>;
  readonly getTreeItem: (node: TreeNode) => TreeItem;
  readonly refreshFor: (change: RootChange) => void;
  readonly setMode: (mode: TreeMode) => void;
  readonly refreshTask: (root: string, taskId: string) => void;
  readonly setScopeShown: (value: boolean) => void;
  readonly isScopeShown: () => boolean;
};
