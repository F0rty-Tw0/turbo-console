import type { TaskDefinition } from '@turbo-console/core';

/**
 * What a task's run button and status line show; built in the host from the tree's `taskDisplay`. `colorVar` is a CSS
 * variable name or `null`; `iconId` has no `~spin` modifier, `isSpinning` stands for it. While running, `text` is the
 * kind prefix only (`running` / `continuous`) and `elapsedMs` the wall-clock time since launch (never negative); else
 * `elapsedMs` is `null`. `isIdle` is true when the task has no run to show (it never ran, or its entry was dropped), so
 * an ended run is never idle.
 */
export type RunView = {
  readonly iconId: string;
  readonly colorVar: string | null;
  readonly text: string;
  readonly isRunning: boolean;
  readonly elapsedMs: number | null;
  readonly isSpinning: boolean;
  readonly isIdle: boolean;
};

export type CacheStatus = 'HIT' | 'MISS' | 'deferred';

/**
 * `definition` and `cacheStatus` are `null` while loading, after a failed dry run, for tasks with no command, and for
 * tasks that are no turbo task (`isTurboTask` false: a package script no turbo config defines, left out of the dry
 * run). `taskId` is the model id `<package>#<task>`. `runCommand` is `<package manager> run <name>` for a script, `null`
 * for a turbo task and for a script the run flow refuses (an unsafe name or a blank body).
 */
export type TaskCard = {
  readonly taskId: string;
  readonly name: string;
  readonly command: string | null;
  readonly description: string | null;
  readonly dependents: string[];
  readonly definition: TaskDefinition | null;
  readonly cacheStatus: CacheStatus | null;
  readonly isTurboTask: boolean;
  readonly persistent: boolean;
  readonly runCommand: string | null;
  readonly run: RunView;
};

export type DryRunPhase = 'loading' | 'ready' | 'failed';

/**
 * `reloadError` is the banner text when the root's last reload failed and the store kept the previous model, else `null`.
 * `hiddenScriptCount` is the runnable scripts left out while `scriptsShown` is false (refused names not counted), `0` while shown.
 */
export type PackageDetails = {
  readonly kind: 'package';
  readonly root: string;
  readonly packageName: string;
  readonly path: string;
  readonly tags: string[];
  readonly tasks: TaskCard[];
  readonly dryRun: DryRunPhase;
  readonly reloadError: string | null;
  readonly scriptsShown: boolean;
  readonly hiddenScriptCount: number;
};

/** The package is not in the current model. */
export type MissingPackage = {
  readonly kind: 'missing';
  readonly root: string;
  readonly packageName: string;
};

export type DetailsState = PackageDetails | MissingPackage;
