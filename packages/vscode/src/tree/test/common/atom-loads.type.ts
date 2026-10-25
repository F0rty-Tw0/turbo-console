import type { AtomResult, DryRunRequest, DryRunState, TurboBinary, WorkspaceModel } from '@turbo-console/core';
import type { Mock } from 'vitest';

import type { AtomLoadPorts } from '../../common/atom-load.type.ts';

/** One `dryRun` port call that stays pending until the spec settles it. */
export type DeferredDryRun = {
  readonly binary: TurboBinary;
  readonly request: DryRunRequest;
  readonly signal: AbortSignal;
  readonly resolve: (states: DryRunState[]) => void;
  readonly reject: (error: unknown) => void;
};

/** One `results` port call that stays pending until the spec settles it. */
export type DeferredScan = {
  readonly resolve: (results: Map<string, AtomResult>) => void;
  readonly reject: (error: unknown) => void;
};

/** The one call of `AtomLoads` the load helpers make; the spec builds the real `AtomLoads` over `LoadsHarness.ports`. */
export type ChildrenRequester = {
  readonly childrenRequested: (root: string, packageName: string) => void;
};

/** Spied ports whose `dryRun` and `results` calls stay pending; `model` sets what `modelOf` returns per root. */
export type LoadsHarness = {
  readonly ports: AtomLoadPorts;
  readonly modelOf: (root: string) => WorkspaceModel | null;
  readonly binaryOf: Mock<AtomLoadPorts['binaryOf']>;
  readonly dryRun: Mock<AtomLoadPorts['dryRun']>;
  readonly results: Mock<AtomLoadPorts['results']>;
  readonly log: Mock<AtomLoadPorts['log']>;
  readonly changed: Mock<AtomLoadPorts['changed']>;
  readonly dryRuns: DeferredDryRun[];
  readonly scans: DeferredScan[];
  readonly model: (root: string, model: WorkspaceModel | null) => void;
  readonly noBinary: () => void;
  readonly binary: () => void;
};
