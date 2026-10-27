import type { PackageManager } from '@turbo-console/core';

import type { ModelView } from './model-view.type.ts';
import type { RunState } from '../../run/common/run.type.ts';

export type IconSpec = {
  readonly id: string;
  readonly color: string | null;
};

/** The node fields a task command reads its row by. */
export type TaskRowArg = {
  readonly kind: 'task';
  readonly id: string;
  readonly root: string;
  readonly key: string;
  readonly packageName: string;
};

export type RowCommand = {
  readonly command: string;
  readonly args: (string | TaskRowArg)[];
};

export type TreeMode = 'folders' | 'list';

/** Whether folder and package rows take the file icon theme's folder icon, or Turbo Console's own codicons. */
export type IconsMode = 'theme' | 'builtin';

/** The `turboConsole.icons` setting: `auto` is `theme` when the file icon theme has folder icons, else `builtin`. */
export type IconsSetting = 'auto' | 'theme' | 'builtin';

export type RowKind = 'root' | 'dir' | 'pkg' | 'scripts' | 'task' | 'msg';

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
 * lines are raw, and `tooltip.util.ts` cleans them. `packageName` is set on `pkg`, `scripts` and `task` rows only.
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
  /**
   * The row's directory relative to `root` (`''` for the root package `//`), for a file icon theme; only dir and package
   * rows have one. It stays relative so a row costs no path join unless theme icons are on.
   */
  readonly folder?: string;
};

/** A kind token (`turboTask`, `turboScript`), then at most one state token; menus match them by prefix (spec 1c-a §4.12). */
export type TaskContextValue = 'turboTask' | 'turboTask.running' | 'turboTask.cached' | 'turboScript' | 'turboScript.running';

/** The value of a file row of an Atomizer group: its task's value with the `.atomFile` token last, so the task menus still match. */
export type AtomFileContextValue = 'turboTask.atomFile' | 'turboTask.cached.atomFile' | 'turboTask.running.atomFile';

/**
 * What the row builders need of a folder: its `root` (row ids and run lookups key on the folder root, which is not
 * always `model.root`) and the model's package manager.
 */
export type RowScope = {
  readonly root: string;
  readonly packageManager: PackageManager;
  /** The model's mode: a single-package `//` lets `turbo X` follow its script `X`. */
  readonly singlePackage: boolean;
};

/** UB5a §3.3: the running runs of one root per package name and per folder path (folder-tree membership, any depth). */
export type RunningCounts = {
  readonly packages: ReadonlyMap<string, number>;
  readonly dirs: ReadonlyMap<string, number>;
};

type RunningCountsOfLive = {
  readonly live: ReadonlySet<string>;
  readonly counts: RunningCounts;
};

/**
 * The running counts of the latest `live` Set seen per view: while a root's run store answers the same Set (it builds a
 * new one on every change of a run), the counts of a view are not computed again.
 */
export type RunningCountsMemo = WeakMap<ModelView, RunningCountsOfLive>;

/** What package and folder rows read beside the view: whether full names show, and the running counts of their root. */
export type RowInputs = {
  readonly scopeShown: boolean;
  readonly running: RunningCounts;
};

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
