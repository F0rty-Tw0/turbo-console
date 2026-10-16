import type { RunState } from '../../run/common/run.type.ts';

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
  | 'binary-not-found'
  | 'binary-version'
  | 'binary-other'
  | 'load-no-model'
  | 'load-with-model'
  | 'no-packages'
  | 'no-shown-packages'
  | 'no-turbo-packages'
  | 'loading';

/**
 * One tree item as plain data. `key` and `packageName` hold raw model names, never cleaned: cleaning folds whitespace,
 * so a cleaned name could filter another package. `label` and `description` are cleaned display text; the `tooltip`
 * lines are raw, and `tooltip.util.ts` cleans them. `packageName` is set on `pkg` and `task` rows only.
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

/** A kind token (`turboTask`, `turboScript`), then at most one state token; menus match them by prefix (spec 1c-a §4.12). */
export type TaskContextValue = 'turboTask' | 'turboTask.running' | 'turboTask.cached' | 'turboScript';

export type EndedState = Exclude<RunState, 'running'>;

/** The icon and the description prefix of a running task: `running` or `continuous`. */
export type RunningKind = {
  readonly icon: IconSpec;
  readonly prefix: string;
};

export type TaskDisplay = {
  readonly icon: IconSpec;
  readonly description: string;
  readonly contextValue: TaskContextValue;
};
