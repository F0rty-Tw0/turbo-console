import type { AtomResult } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { AtomLoads } from './atom-loads.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { FILE_A, OTHER_ROOT, PKG, ROOT } from '../test/common/atom-loads.const.ts';
import type { LoadsHarness } from '../test/common/atom-loads.type.ts';
import { ATOM_RESULT_STUB, BASE_MODEL_STUB } from '../test/stubs/atom-loads.stub.ts';
import {
  dryRunAt,
  dryStateOf,
  flush,
  loadsHarness,
  scanAt,
  toFailed,
  toLoaded,
  toLoading
} from '../test/utils/atom-loads.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';

const loadsOf = (h: LoadsHarness): AtomLoads => new AtomLoads(h.ports, h.modelOf);

describe('FEATURE: atom loads of a package that settled', () => {
  describe('GIVEN Loaded', () => {
    it('WHEN children are requested THEN it is ignored', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      await toLoaded(h, loads);
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(1);
    });

    it('WHEN the run ends THEN it loads again and the old maps stay visible', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      await toLoaded(h, loads);
      loads.runEnded(ROOT, PKG);

      const view = loads.view(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(2);
      expect(view.dryRun?.get(FILE_A)).toBe('HIT');
      expect(view.results?.get(FILE_A)).toStrictEqual(ATOM_RESULT_STUB);
    });

    it('WHEN all are refreshed THEN it loads again and the old maps stay visible', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      await toLoaded(h, loads);
      loads.refreshAll();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
      expect(loads.view(ROOT, PKG).dryRun?.get(FILE_A)).toBe('HIT');
    });

    it('WHEN all are refreshed THEN two loaded packages in two roots both load again', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      await toLoaded(h, loads);
      h.model(OTHER_ROOT, BASE_MODEL_STUB);
      loads.childrenRequested(OTHER_ROOT, PKG);
      dryRunAt(h, 1).resolve([]);
      scanAt(h, 1).resolve(new Map());
      await flush();
      loads.refreshAll();

      expect(h.dryRun).toHaveBeenCalledTimes(4);
    });

    it('WHEN the model refreshes with the same ids in a new object THEN the data stays and nothing starts', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);
      const same = atomModelOf(['tests/a.spec.ts', 'tests/b fails.spec.ts']);

      await toLoaded(h, loads);
      h.model(ROOT, same);
      loads.modelChanged(ROOT, same);

      expect(loads.view(ROOT, PKG).dryRun?.get(FILE_A)).toBe('HIT');
      expect(h.dryRun).toHaveBeenCalledTimes(1);
    });

    it('WHEN the model refreshes with other ids THEN it is Not loaded and the package is announced', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);
      const fewer = atomModelOf(['tests/a.spec.ts']);

      await toLoaded(h, loads);
      h.changed.mockClear();
      h.model(ROOT, fewer);
      loads.modelChanged(ROOT, fewer);

      const view = loads.view(ROOT, PKG);

      expect(view.dryRun).toBeNull();
      expect(view.results).toBeNull();
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, PKG);
    });

    it('WHEN the model refreshes with other ids while the store still holds the old model THEN it is Not loaded', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);
      const fewer = atomModelOf(['tests/a.spec.ts']);

      await toLoaded(h, loads);
      h.changed.mockClear();
      loads.modelChanged(ROOT, fewer);

      expect(loads.view(ROOT, PKG).dryRun).toBeNull();
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, PKG);
    });

    it('WHEN the model refreshes with its groups gone THEN it is Not loaded and the package is announced', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      await toLoaded(h, loads);
      h.changed.mockClear();
      loads.modelChanged(ROOT, null);

      expect(loads.view(ROOT, PKG).results).toBeNull();
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, PKG);
    });

    it('WHEN the binary is gone and the run ends THEN the entry stays as it is', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      await toLoaded(h, loads);
      h.noBinary();
      loads.runEnded(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(1);
      expect(loads.view(ROOT, PKG).dryRun?.get(FILE_A)).toBe('HIT');
    });
  });

  describe('GIVEN Failed', () => {
    it('WHEN children are requested THEN it is ignored', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      await toFailed(h, loads);
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(1);
    });

    it('WHEN the run ends THEN it loads again', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      await toFailed(h, loads);
      loads.runEnded(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN all are refreshed THEN it loads again', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      await toFailed(h, loads);
      loads.refreshAll();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN the model refreshes with the same ids THEN it stays Failed and starts nothing', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      await toFailed(h, loads);
      loads.modelChanged(ROOT, BASE_MODEL_STUB);
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(1);
    });

    it('WHEN the model refreshes with other ids THEN it is Not loaded and a children request starts a load', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);
      const fewer = atomModelOf(['tests/a.spec.ts']);

      await toFailed(h, loads);
      h.model(ROOT, fewer);
      loads.modelChanged(ROOT, fewer);
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN one part fails and the other is OK', () => {
    it('WHEN the dry-run rejects and the scan resolves THEN it is Loaded with results only and one dry-run log line', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      toLoading(h, loads);
      dryRunAt(h, 0).reject(new Error('turbo exploded'));
      scanAt(h, 0).resolve(new Map<string, AtomResult>([[FILE_A, ATOM_RESULT_STUB]]));
      await flush();
      loads.childrenRequested(ROOT, PKG);

      const view = loads.view(ROOT, PKG);

      expect(view.dryRun).toBeNull();
      expect(view.results?.get(FILE_A)).toStrictEqual(ATOM_RESULT_STUB);
      expect(h.dryRun).toHaveBeenCalledTimes(1);
      expect(h.log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('dry-run'));
    });
  });

  describe('GIVEN a scan result map', () => {
    it('WHEN it holds a failed file THEN the view carries that result', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);
      const failed: AtomResult = { outcome: 'failed', durationMs: 7900, endedAt: 1 };

      toLoading(h, loads);
      scanAt(h, 0).resolve(new Map<string, AtomResult>([[FILE_A, failed]]));
      await flush();

      expect(loads.view(ROOT, PKG).results?.get(FILE_A)).toStrictEqual(failed);
    });
  });

  describe('GIVEN no turbo binary', () => {
    it('WHEN children are requested THEN nothing starts and nothing is logged, and a request once the binary exists starts a load', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      h.model(ROOT, BASE_MODEL_STUB);
      h.noBinary();
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).not.toHaveBeenCalled();
      expect(h.log).not.toHaveBeenCalled();

      h.binary();
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledExactlyOnceWith(TURBO_BINARY_STUB, expect.anything(), expect.any(AbortSignal));
    });
  });

  describe('GIVEN a package without Atomizer groups', () => {
    it('WHEN children are requested THEN nothing starts', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      h.model(ROOT, atomModelOf([]));
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a root whose model is not loaded', () => {
    it('WHEN children are requested THEN nothing starts', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a pending load', () => {
    it('WHEN the loads are disposed THEN the load aborts and its late result fires nothing', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      toLoading(h, loads);
      loads.dispose();
      dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT')]);
      await flush();

      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
      expect(h.changed).not.toHaveBeenCalled();
      expect(loads.view(ROOT, PKG).dryRun).toBeNull();
    });
  });
});
