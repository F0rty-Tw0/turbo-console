import type { TaskNode } from './workspace-model.type.ts';

/** One spec file of an Atomizer group: its task, the spec path the task name carries, and whether it is live. */
export type AtomFile = {
  readonly task: TaskNode;
  readonly specPath: string;
  readonly isLive: boolean;
};

/** An Atomizer umbrella task of one package and its file tasks, sorted by `specPath`. */
export type AtomGroup = {
  readonly packageName: string;
  readonly umbrella: TaskNode;
  readonly files: AtomFile[];
};
