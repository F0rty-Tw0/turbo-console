import type { DryRunRequest, DryRunState } from '@turbo-console/core';

/** One `DetailsPorts.dryRun` call that stays pending until the spec settles it. */
export type DeferredDryRun = {
  readonly request: DryRunRequest;
  readonly signal: AbortSignal;
  readonly resolve: (states: DryRunState[]) => void;
  readonly reject: (error: unknown) => void;
};
