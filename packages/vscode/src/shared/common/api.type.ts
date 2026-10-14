import type { Span } from './span.type.ts';
import type { LoadRecord } from '../../roots/common/coordinator.type.ts';
import type { PackagesTreeApi } from '../../tree/common/tree-node.type.ts';

type RunTiming = {
  readonly taskId: string;
  readonly clickedAt: number;
  readonly processStartedAt: number | null;
};

/** Mutable records owned by the session: `activate` replaces `activation` when it returns, the rest grow in place. */
export type Timings = {
  activation: Span;
  readonly treeVisible: Map<string, Span>;
  readonly runs: RunTiming[];
};

/**
 * What `activate` returns, for the integration tests only. Root keys are each workspace folder's `uri.fsPath` as VS
 * Code gives it. `loads` holds an empty list per root from activation on; `whenIdle` rejects for a key that is not a
 * current root.
 */
export type TurboConsoleApi = {
  readonly tree: PackagesTreeApi;
  readonly timings: Timings;
  readonly loads: Map<string, LoadRecord[]>;
  readonly whenIdle: (root: string) => Promise<void>;
};
