import type { DryRunRequest, DryRunState, TurboBinary, WorkspaceModel } from '@turbo-console/core';
import { vi } from 'vitest';

import { dryRunAt, dryStateOf, flush } from './atom-load.spec.util.ts';
import { fakeClock } from './prediction-clock.spec.util.ts';
import { buildModelOf } from './prediction-model.spec.util.ts';
import type { RootChange } from '../../../roots/common/coordinator.type.ts';
import { TURBO_BINARY_STUB } from '../../../roots/test/stubs/root.stub.ts';
import type { PredictionLoadPorts } from '../../common/prediction.type.ts';
import { ROOT } from '../common/atom-load.const.ts';
import type { DeferredDryRun } from '../common/atom-load.type.ts';
import { ID_A, NOW_0, PKG_A } from '../common/prediction-load.const.ts';
import type { PredictionDriver, PredictionHarness, PredictionState } from '../common/prediction-load.type.ts';

const dryRunPortOf = (dryRuns: DeferredDryRun[]): PredictionLoadPorts['dryRun'] => {
  const port = async (binary: TurboBinary, request: DryRunRequest, signal: AbortSignal): Promise<DryRunState[]> => {
    const { promise, resolve, reject } = Promise.withResolvers<DryRunState[]>();

    dryRuns.push({ binary, request, signal, resolve, reject });

    return promise;
  };

  return port;
};

/** `PredictionLoads` ports over spies: `dryRun` calls stay pending, timers fire by hand, `now` starts at `NOW_0`. */
export const predictionHarness = (): PredictionHarness => {
  const clock = fakeClock();
  const dryRuns: DeferredDryRun[] = [];
  const models = new Map<string, WorkspaceModel | null>();
  let hasBinary = true;
  let now = NOW_0;
  const dryRunPort = dryRunPortOf(dryRuns);
  const binaryOf = vi.fn<PredictionLoadPorts['binaryOf']>(() => (hasBinary ? TURBO_BINARY_STUB : null));
  const dryRun = vi.fn<PredictionLoadPorts['dryRun']>(dryRunPort);
  const log = vi.fn<PredictionLoadPorts['log']>();
  const changed = vi.fn<PredictionLoadPorts['changed']>();
  const modelOf = (root: string): WorkspaceModel | null => models.get(root) ?? null;
  const readNow = (): number => now;
  const ports: PredictionLoadPorts = {
    binaryOf,
    dryRun,
    modelOf,
    after: clock.after,
    cancel: clock.cancel,
    now: readNow,
    log,
    changed
  };
  const setNow = (ms: number): void => {
    now = ms;
  };
  const model = (root: string, next: WorkspaceModel | null): void => {
    models.set(root, next);
  };
  const noBinary = (): void => {
    hasBinary = false;
  };
  const binary = (): void => {
    hasBinary = true;
  };
  const harness: PredictionHarness = {
    ...clock,
    ports,
    dryRun,
    dryRuns,
    log,
    changed,
    setNow,
    model,
    noBinary,
    binary
  };

  return harness;
};

/** `PKG_A` of `ROOT` driven into `state`: queued after the show, loading once the window is over, then settled OK or rejected. */
export const toState = async (h: PredictionHarness, store: PredictionDriver, state: PredictionState): Promise<void> => {
  h.model(ROOT, buildModelOf([PKG_A]));
  store.toggled(true);
  store.packageShown(ROOT, PKG_A);

  if (state === 'queued') return;

  h.fire();

  if (state === 'loading') return;

  if (state === 'loaded') dryRunAt(h, 0).resolve([dryStateOf(ID_A, 'HIT')]);

  if (state === 'failed') dryRunAt(h, 0).reject(new Error('boom'));

  await flush();
};

/** A model change of `root` from `before` to `after`, without errors. */
export const changeOf = (before: WorkspaceModel | null, after: WorkspaceModel | null, root = ROOT): RootChange => {
  const change: RootChange = { root, before, after, errorBefore: null, errorAfter: null };

  return change;
};
