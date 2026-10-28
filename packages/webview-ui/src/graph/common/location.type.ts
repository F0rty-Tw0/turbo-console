import type { GraphViewMode } from '../../bridge/common/graph-view-state.type.ts';

/** A crumb of the location bar: "Packages", a focused folder, the package of a task choice, or "Tasks (n)". */
export type LocationCrumb = {
  readonly kind: 'packages' | 'folder' | 'package' | 'tasks';
  readonly label: string;
  /** The folder key or package name the crumb stands for; empty for "Packages" and "Tasks (n)". */
  readonly name: string;
  /** The last crumb: text with `aria-current="page"`, never a button. */
  readonly isCurrent: boolean;
};

/** What the location bar shows: the mode, the focused folder, the one package of the chosen tasks and the shown task count. */
export type LocationState = {
  readonly mode: GraphViewMode;
  readonly folder: string | null;
  readonly taskPackage: string | null;
  readonly taskCount: number;
};
