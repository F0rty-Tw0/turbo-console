import type { Event, TreeViewVisibilityChangeEvent, ViewBadge } from 'vscode';

/**
 * What `TreeVisibility` and `ElapsedTicker` read of the Packages view, and the badge the ticker sets on it (UB5a §3.4): a
 * `vscode.TreeView` fits.
 */
export type VisibleView = {
  readonly visible: boolean;
  readonly onDidChangeVisibility: Event<TreeViewVisibilityChangeEvent>;
  badge?: ViewBadge | undefined;
};
