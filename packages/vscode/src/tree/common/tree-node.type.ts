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
 * What a node's rows are read with: the view mode, the runs, the model's view (built once per model), whether
 * package rows read their full names (`scopeShown`) or their bare labels, and the wall-clock time (`now`, the base of
 * `RunEntry.launchedAt`) a running task's elapsed time is counted to.
 */
export type RowContext = {
  readonly mode: TreeMode;
  readonly runs: RunLookup;
  readonly views: ModelViewsOf;
  readonly scopeShown: boolean;
  readonly now: number;
};

/** `'root'` redraws the root (the whole tree in a single-root window); a list names the packages to redraw. */
export type RefreshTarget = 'root' | string[];

/**
 * What one `onDidChangeTreeData` event redraws: a node, several nodes at once, or (`undefined`) the whole tree. VS Code
 * debounces the event (leading edge, 200 ms), so nodes fired one by one in a loop redraw in two passes.
 */
export type TreeRefresh = TreeNode | TreeNode[] | undefined;

/** The running task ids per root, as the elapsed ticker holds them. */
export type RunningTasks = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * `treeVisible` gets one span per root: its first `getChildren`, ended when it first returns package or folder rows.
 * `now` is the span clock (`performance.now()`); `wallNow` is the wall clock (`Date.now()`) the rows count elapsed time on.
 */
export type TreePorts = {
  readonly runs: RunLookup;
  readonly fire: (refresh: TreeRefresh) => void;
  readonly treeVisible: Map<string, Span>;
  readonly now: () => number;
  readonly wallNow: () => number;
};

/** The public face of `PackagesTreeProvider`, so `common/` can name it without importing the feature. */
export type PackagesTreeApi = {
  readonly onDidChangeTreeData: Event<TreeRefresh>;
  readonly getChildren: (node?: TreeNode) => Promise<TreeNode[]>;
  readonly getTreeItem: (node: TreeNode) => TreeItem;
  readonly refreshFor: (change: RootChange) => void;
  readonly setMode: (mode: TreeMode) => void;
  readonly refreshTask: (root: string, taskId: string) => void;
  readonly refreshTasks: (running: RunningTasks) => void;
  readonly setScopeShown: (value: boolean) => void;
  readonly isScopeShown: () => boolean;
};
