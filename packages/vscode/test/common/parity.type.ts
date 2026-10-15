import type { ShownManifest, ShownPackage } from './launch.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';

/** One quick pick the suite drives: the rows it lists, in order, and the row to accept. */
export type PickStep = {
  readonly list: string[];
  readonly wanted: string;
};

/** The first regular package no package depends on that has a shown `build`, and the next one: unrelated to it. */
export type LeafPair = {
  readonly leaf: ShownPackage;
  readonly other: ShownPackage;
};

/** The end of a task process; `code` is `undefined` when VS Code reports none. */
export type ProcessExit = {
  readonly code: number | undefined;
};

/** What the suite saw of one run all task: the args of its process once it started, its exit once it ended. */
export type AllRunWatch = {
  readonly startedArgs: () => string[] | null;
  readonly exit: () => ProcessExit | null;
  readonly dispose: () => void;
};

/** What every step of spec §5.3 case 8 reads; `budgetFactor` scales its waits as it scales the timing budgets. */
export type ParityScene = {
  readonly api: TurboConsoleApi;
  readonly root: string;
  readonly turboPath: string;
  readonly budgetFactor: number;
  readonly manifest: ShownManifest;
  readonly pair: LeafPair;
};
