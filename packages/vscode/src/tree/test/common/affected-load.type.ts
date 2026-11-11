import type { AffectedResult, TurboBinary, WorkspaceModel } from '@turbo-console/core';
import type { Mock } from 'vitest';

import type { AffectedLoadPorts } from '../../common/affected.type.ts';

/** One `readAffected` call that stays pending until the spec settles it. */
export type DeferredRead = {
  readonly binary: TurboBinary;
  readonly signal: AbortSignal;
  readonly resolve: (result: AffectedResult) => void;
  readonly reject: (error: unknown) => void;
};

/** The states a spec drives one root into; `toState` builds each one from nothing. */
export type AffectedState = 'loading' | 'loaded' | 'failed';

/** The two calls of `AffectedLoads` that `toState` makes; the spec builds the real store over `AffectedHarness.ports`. */
export type AffectedDriver = {
  readonly toggled: (shown: boolean) => void;
  readonly rootShown: (root: string) => void;
};

/** Spied ports whose `readAffected` calls stay pending until the spec settles them. */
export type AffectedHarness = {
  readonly ports: AffectedLoadPorts;
  readonly readAffected: Mock<AffectedLoadPorts['readAffected']>;
  readonly reads: DeferredRead[];
  readonly log: Mock<AffectedLoadPorts['log']>;
  readonly changed: Mock<AffectedLoadPorts['changed']>;
  readonly setNow: (ms: number) => void;
  readonly model: (root: string, model: WorkspaceModel | null) => void;
  readonly noBinary: () => void;
  readonly binary: () => void;
};
