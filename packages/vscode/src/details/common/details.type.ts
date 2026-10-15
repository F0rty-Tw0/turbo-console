import type { DryRunState } from '@turbo-console/core';
import type { DryRunPhase } from '@turbo-console/webview-ui';

import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { RunLookup } from '../../run/common/run.type.ts';

/** `states` hold what turbo listed for the dry run, upstream packages' tasks included: a card takes only the state whose id is its own. */
export type DryRunResult = {
  readonly phase: DryRunPhase;
  readonly states: DryRunState[];
};

export type DetailsInput = {
  readonly root: string;
  readonly packageName: string;
  readonly state: RootState;
  readonly dryRun: DryRunResult;
  readonly runs: RunLookup;
};
