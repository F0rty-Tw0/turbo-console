import type { AffectedResult, TurboBinary } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sharedLoadsOf } from './shared-loads.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { ScriptsToggleFake } from '../../shared/test/common/scripts-toggle-fake.type.ts';
import { outputMock } from '../../shared/test/mocks/output.mock.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import type { AffectedListener } from '../common/affected.type.ts';
import type { SharedLoads } from '../common/shared-loads.type.ts';
import { ROOT } from '../test/common/atom-load.const.ts';
import { PKG_A } from '../test/common/prediction-load.const.ts';
import type { ReadDryRun } from '../test/common/prediction-load.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { loadedOf } from '../test/utils/atom-tree.spec.util.ts';
import { buildModelOf } from '../test/utils/prediction-model.spec.util.ts';

type QueryOptions = { readonly signal?: AbortSignal | undefined };

type ReadAffected = (binary: TurboBinary, options?: QueryOptions) => Promise<AffectedResult>;

type TogglePair = { readonly prediction: ScriptsToggleFake; readonly affected: ScriptsToggleFake };

type Built = { readonly loads: SharedLoads; readonly both: TogglePair };

const mocks = vi.hoisted(() => {
  const fns = { readAffected: vi.fn<ReadAffected>(), readDryRun: vi.fn<ReadDryRun>() };

  return fns;
});

vi.mock('@turbo-console/core', async (original) => {
  const actual = await original<object>();
  const mocked = { ...actual, readAffected: mocks.readAffected, readDryRun: mocks.readDryRun };

  return mocked;
});

describe('FEATURE: shared loads follow the affected toggle', () => {
  const signals: AbortSignal[] = [];
  let store: RootStore;

  const build = (prediction: boolean, affected: boolean): Built => {
    const both: TogglePair = { prediction: scriptsToggleMock(prediction), affected: scriptsToggleMock(affected) };
    const loads = sharedLoadsOf(store, outputMock(), both.prediction, both.affected);
    const built: Built = { loads, both };

    return built;
  };

  beforeEach(() => {
    vi.stubEnv('TURBO_SCM_BASE', '');
    vi.stubEnv('TURBO_SCM_HEAD', '');
    mocks.readAffected.mockReset();
    mocks.readDryRun.mockReset();
    signals.length = 0;
    mocks.readAffected.mockImplementation(async (_binary, options) => {
      if (options?.signal) signals.push(options.signal);

      return new Promise<AffectedResult>(() => undefined);
    });
    mocks.readDryRun.mockImplementation(async () => new Promise(() => undefined));
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply(ROOT, loadedOf(buildModelOf([PKG_A])));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('GIVEN the affected toggle off at build', () => {
    it('WHEN a root is shown THEN readAffected is not called', () => {
      build(false, false).loads.affected.rootShown(ROOT);

      expect(mocks.readAffected).not.toHaveBeenCalled();
    });

    it('WHEN toggle.set(true) and a root is shown THEN readAffected is called once', async () => {
      const { loads, both } = build(false, false);

      await both.affected.set(true);
      loads.affected.rootShown(ROOT);

      expect(mocks.readAffected).toHaveBeenCalledOnce();
    });

    it('WHEN the toggle flips on THEN no affected listener is told', async () => {
      const { loads, both } = build(false, false);
      const listener = vi.fn<AffectedListener>();

      loads.affected.onDidChange(listener);
      await both.affected.set(true);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the affected toggle stored on at build', () => {
    it('WHEN a root is shown THEN readAffected is called once with the root binary', () => {
      build(false, true).loads.affected.rootShown(ROOT);

      expect(mocks.readAffected).toHaveBeenCalledOnce();
    });

    it('WHEN toggle.set(false) with a live query THEN the query signal is aborted', async () => {
      const { loads, both } = build(false, true);

      loads.affected.rootShown(ROOT);
      await both.affected.set(false);

      expect(signals[0]?.aborted).toBe(true);
    });

    it('WHEN loads.dispose() runs with a live query THEN the query is aborted', () => {
      const { loads } = build(false, true);

      loads.affected.rootShown(ROOT);
      loads.dispose();

      expect(signals[0]?.aborted).toBe(true);
    });
  });

  describe('GIVEN only one of the two toggles on', () => {
    it('WHEN only prediction is on and a root is shown THEN readAffected is not called', () => {
      build(true, false).loads.affected.rootShown(ROOT);

      expect(mocks.readAffected).not.toHaveBeenCalled();
    });

    it('WHEN only affected is on and a package is shown THEN no dry run starts', () => {
      vi.useFakeTimers();

      const { loads } = build(false, true);

      loads.prediction.packageShown(ROOT, PKG_A);
      vi.advanceTimersByTime(1_000);
      vi.useRealTimers();

      expect(mocks.readDryRun).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN built loads', () => {
    it('WHEN loads.dispose() runs THEN both toggles have no listener left', () => {
      const { loads, both } = build(true, true);

      loads.dispose();

      expect(both.prediction.listeners.size).toBe(0);
      expect(both.affected.listeners.size).toBe(0);
    });

    it('WHEN loads.dispose() ran THEN a later flip of either toggle starts nothing', async () => {
      const { loads, both } = build(false, false);

      loads.dispose();
      await both.affected.set(true);
      await both.prediction.set(true);
      loads.affected.rootShown(ROOT);

      expect(mocks.readAffected).not.toHaveBeenCalled();
    });
  });
});
