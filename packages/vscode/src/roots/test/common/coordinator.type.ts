import type { CoordinatorPorts } from '../../common/coordinator.type.ts';
import type { LoadMode, LoadResult, LoadedModel } from '../../common/root.type.ts';

export type DeferredRun = {
  readonly mode: LoadMode;
  readonly signal: AbortSignal;
  readonly publish: (result: LoadedModel) => void;
  readonly settle: (result: LoadResult) => void;
};

export type DeferredPorts = {
  readonly ports: CoordinatorPorts;
  readonly runs: DeferredRun[];
  readonly setVisible: (visible: boolean) => void;
};
