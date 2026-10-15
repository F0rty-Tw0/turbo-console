import type { PickItem } from './picker.type.ts';
import type { Disposed, Terminable } from './run.type.ts';

/** The `root`, `id` and `affected` of a run all task definition: what the end of its task is matched by. */
export type RunAllDefinition = {
  readonly root: string;
  readonly id: string;
  readonly affected: boolean;
};

/** The definition of the `vscode.Task` of one run all. */
export type RunAllTaskDefinition = {
  readonly type: string;
  readonly root: string;
  readonly id: string;
  readonly affected: boolean;
};

/** Which run all the user asked for; the root and the task name are picked. */
export type RunAllRequest = {
  readonly affected: boolean;
};

/**
 * What one launch holds of its key. `settle` says VS Code holds the task, so only its end frees the key; `expire` frees
 * the key when the launch has not settled and says whether it did; `release` frees the key. Each acts only while this
 * launch still holds the key, so a newer launch that took it since is left alone.
 */
export type RunAllClaim = {
  readonly settle: () => void;
  readonly expire: () => boolean;
  readonly release: () => void;
};

/** One run all, ready to launch. */
export type RunAllLaunch = {
  readonly root: string;
  readonly binaryPath: string;
  readonly taskName: string;
  readonly affected: boolean;
};

/** The task events of run all tasks, already narrowed to them: a process starting and a task ending. */
export type RunAllEvents = {
  readonly processStarted: (definition: RunAllDefinition) => void;
  readonly taskEnded: (definition: RunAllDefinition) => void;
};

/** Forwards the task events of run all tasks to `events`; the subscription is disposed to unsubscribe. */
export type RunAllEventSource = (events: RunAllEvents) => Disposed;

/**
 * Editor effects of run all. `canExecute` answers whether `binaryPath` exists and may be run; `isActive` whether VS
 * Code already runs the task of a guard key, one this window may not know (Rerun Last Task); `ensureLoaded` settles
 * when a root has its first answer; `pick` resolves with the item chosen, or `undefined` when the pick is closed;
 * `execute` resolves with the execution once VS Code accepted the task, maybe before it is active, and rejects when it
 * cannot; `after` calls `action` once
 * `delayMs` has passed; `log` takes a finished line.
 */
export type RunAllPorts = {
  readonly canExecute: (binaryPath: string) => Promise<boolean>;
  readonly isActive: (key: string) => boolean;
  readonly ensureLoaded: (root: string) => Promise<void>;
  readonly pick: (items: PickItem[], placeholder: string) => Promise<PickItem | undefined>;
  readonly info: (text: string) => void;
  readonly execute: (launch: RunAllLaunch, args: string[]) => Promise<Terminable>;
  readonly after: (delayMs: number, action: () => void) => void;
  readonly log: (line: string) => void;
  readonly notifyFailedToStart: () => void;
};
