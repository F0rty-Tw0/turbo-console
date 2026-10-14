export type IconSpec = {
  readonly id: string;
  readonly color: string | null;
};

export type RowCommand = {
  readonly command: string;
  readonly args: string[];
};

export type TreeMode = 'folders' | 'list';

export type RowKind = 'root' | 'dir' | 'pkg' | 'task' | 'msg';

type Collapsible = 'none' | 'collapsed' | 'expanded';

export type MessageKind =
  'binary-not-found' | 'binary-version' | 'binary-other' | 'load-no-model' | 'load-with-model' | 'no-packages' | 'loading';

/**
 * One tree item as plain data. `key` and `packageName` hold raw model names, never cleaned: cleaning folds whitespace,
 * so a cleaned name could filter another package. `label` and `description` are cleaned display text; the `tooltip`
 * lines are raw, and `tooltipOf` cleans them. `packageName` is set on `pkg` and `task` rows only.
 */
export type TreeRow = {
  readonly id: string;
  readonly kind: RowKind;
  readonly root: string;
  readonly key: string;
  readonly packageName: string | null;
  readonly label: string;
  readonly description: string;
  readonly icon: IconSpec;
  readonly contextValue: string;
  readonly collapsible: Collapsible;
  readonly tooltip: string[];
  readonly command: RowCommand | null;
};

export type TaskContextValue = 'turboTask' | 'turboTask.running';

export type TaskDisplay = {
  readonly icon: IconSpec;
  readonly description: string;
  readonly contextValue: TaskContextValue;
};
