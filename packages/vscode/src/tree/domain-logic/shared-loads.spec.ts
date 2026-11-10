import type { DryRunState } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sharedLoadsOf } from './shared-loads.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { ScriptsToggleFake } from '../../shared/test/common/scripts-toggle-fake.type.ts';
import { outputMock } from '../../shared/test/mocks/output.mock.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import { PREDICTION_BATCH_MS } from '../common/prediction.const.ts';
import type { SharedLoads } from '../common/shared-loads.type.ts';
import { ROOT } from '../test/common/atom-load.const.ts';
import { PKG_A } from '../test/common/prediction-load.const.ts';
import type { ReadDryRun } from '../test/common/prediction-load.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { loadedOf } from '../test/utils/atom-tree.spec.util.ts';
import { buildModelOf } from '../test/utils/prediction-model.spec.util.ts';

const readDryRunMock = vi.hoisted(() => vi.fn<ReadDryRun>());

vi.mock('@turbo-console/core', async (original) => {
  const actual = await original<object>();
  const mocked = { ...actual, readDryRun: readDryRunMock };

  return mocked;
});

describe('FEATURE: shared loads', () => {
  const signals: AbortSignal[] = [];
  let store: RootStore;

  const build = (toggle: ScriptsToggleFake): SharedLoads => {
    const loads = sharedLoadsOf(store, outputMock(), toggle);

    return loads;
  };

  const pendingDryRun: ReadDryRun = async (_binary, _request, options) => {
    if (options?.signal) signals.push(options.signal);

    return new Promise<DryRunState[]>(() => undefined);
  };

  const showPackage = (loads: SharedLoads): void => {
    loads.prediction.packageShown(ROOT, PKG_A);
    vi.advanceTimersByTime(PREDICTION_BATCH_MS);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    readDryRunMock.mockReset();
    signals.length = 0;
    readDryRunMock.mockImplementation(pendingDryRun);
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply(ROOT, loadedOf(buildModelOf([PKG_A])));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN the toggle off at build', () => {
    it('WHEN a package is shown and 300 ms pass THEN readDryRun is not called', () => {
      showPackage(build(scriptsToggleMock(false)));

      expect(readDryRunMock).not.toHaveBeenCalled();
    });

    it('WHEN toggle.set(true), a package is shown and 300 ms pass THEN readDryRun is called once', async () => {
      const toggle = scriptsToggleMock(false);
      const loads = build(toggle);

      await toggle.set(true);
      showPackage(loads);

      expect(readDryRunMock).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN the toggle stored on at build', () => {
    it('WHEN a package is shown and 300 ms pass THEN readDryRun is called once with that package', () => {
      showPackage(build(scriptsToggleMock(true)));

      const request = readDryRunMock.mock.calls[0]?.[1];

      expect(readDryRunMock).toHaveBeenCalledOnce();
      expect(request).toMatchObject({ packages: [PKG_A] });
    });

    it('WHEN toggle.set(false) with a live run THEN the run signal is aborted', async () => {
      const toggle = scriptsToggleMock(true);

      showPackage(build(toggle));
      await toggle.set(false);

      expect(signals[0]?.aborted).toBe(true);
    });

    it('WHEN prediction.dispose() runs with a live run THEN the run is aborted', () => {
      const loads = build(scriptsToggleMock(true));

      showPackage(loads);
      loads.prediction.dispose();

      expect(signals[0]?.aborted).toBe(true);
    });

    it('WHEN prediction.dispose() runs THEN the toggle has no listener left', () => {
      const toggle = scriptsToggleMock(true);

      build(toggle).prediction.dispose();

      expect(toggle.listeners.size).toBe(0);
    });

    it('WHEN prediction.dispose() ran THEN a later toggle flip starts nothing', async () => {
      const toggle = scriptsToggleMock(false);
      const loads = build(toggle);

      loads.prediction.dispose();
      await toggle.set(true);
      showPackage(loads);

      expect(readDryRunMock).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a built pair of loads', () => {
    it('WHEN the view of an unknown package is read THEN it has no groups', () => {
      const loads = build(scriptsToggleMock(false));

      expect(loads.atoms.view(ROOT, 'unknown').groups).toStrictEqual([]);
    });
  });
});
