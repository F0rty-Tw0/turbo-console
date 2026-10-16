import type { Event, TreeViewVisibilityChangeEvent } from 'vscode';

/** What `TreeVisibility` and `ElapsedTicker` read of the Packages view: a `vscode.TreeView` fits. */
export type VisibleView = {
  readonly visible: boolean;
  readonly onDidChangeVisibility: Event<TreeViewVisibilityChangeEvent>;
};
