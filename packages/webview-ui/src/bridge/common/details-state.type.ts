import type { TaskDefinition } from '@turbo-console/core';

/** What a task's run button and status line show; built in the host from the tree's `taskDisplay`. `colorVar` is a CSS variable name or `null`; `iconId` has no `~spin` modifier, `isRunning` stands for it. */
export type RunView = {
  readonly iconId: string;
  readonly colorVar: string | null;
  readonly text: string;
  readonly isRunning: boolean;
};

/** `definition` and `cacheStatus` are `null` while loading, after a failed dry run, and for tasks with no command. `taskId` is the model id `<package>#<task>`. */
export type TaskCard = {
  readonly taskId: string;
  readonly name: string;
  readonly command: string | null;
  readonly description: string | null;
  readonly dependents: string[];
  readonly definition: TaskDefinition | null;
  readonly cacheStatus: 'HIT' | 'MISS' | 'deferred' | null;
  readonly run: RunView;
};

export type DryRunPhase = 'loading' | 'ready' | 'failed';

/** `reloadError` is the banner text when the root's last reload failed and the store kept the previous model, else `null`. */
export type PackageDetails = {
  readonly kind: 'package';
  readonly root: string;
  readonly packageName: string;
  readonly path: string;
  readonly tags: string[];
  readonly tasks: TaskCard[];
  readonly dryRun: DryRunPhase;
  readonly reloadError: string | null;
};

/** The package is not in the current model. */
export type MissingPackage = {
  readonly kind: 'missing';
  readonly root: string;
  readonly packageName: string;
};

export type DetailsState = PackageDetails | MissingPackage;
