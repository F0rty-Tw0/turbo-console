import { describe, expect, it } from 'vitest';

import { AtomLoads } from './atom-loads.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { FILE_A, FILE_B, OTHER_ROOT, PKG, ROOT } from '../test/common/atom-loads.const.ts';
import type { LoadsHarness } from '../test/common/atom-loads.type.ts';
import { BASE_MODEL_STUB } from '../test/stubs/atom-loads.stub.ts';
import { dryRunAt, dryStateOf, flush, loadsHarness, scanAt, toLoading } from '../test/utils/atom-loads.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';

const loadsOf = (h: LoadsHarness): AtomLoads => new AtomLoads(h.ports, h.modelOf);

describe('FEATURE: atom loads of a package that is not loaded yet or is loading', () => {
  describe('GIVEN Not loaded', () => {
    it('WHEN children are requested THEN one dry-run and one scan start, state Loading', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);
      const request = { tasks: ['e2e-ci'], packages: [PKG], singlePackage: false };

      h.model(ROOT, BASE_MODEL_STUB);
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledExactlyOnceWith(TURBO_BINARY_STUB, request, expect.any(AbortSignal));
      expect(h.results).toHaveBeenCalledExactlyOnceWith(ROOT, new Set([FILE_A, FILE_B]));
      expect(loads.view(ROOT, PKG).dryRun).toBeNull();
    });

    it('WHEN the run ends THEN it is ignored', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      h.model(ROOT, BASE_MODEL_STUB);
      loads.runEnded(ROOT, PKG);

      expect(h.dryRun).not.toHaveBeenCalled();
      expect(h.results).not.toHaveBeenCalled();
      expect(loads.view(ROOT, PKG).dryRun).toBeNull();
    });

    it('WHEN all are refreshed THEN it is ignored', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      h.model(ROOT, BASE_MODEL_STUB);
      loads.refreshAll();

      expect(h.dryRun).not.toHaveBeenCalled();
      expect(h.results).not.toHaveBeenCalled();
    });

    it('WHEN the model refreshes with the same ids THEN it stays and starts nothing', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      h.model(ROOT, BASE_MODEL_STUB);
      loads.modelChanged(ROOT, BASE_MODEL_STUB);

      expect(h.dryRun).not.toHaveBeenCalled();
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN the model refreshes with other ids THEN it stays and starts nothing', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);
      const fewer = atomModelOf(['tests/a.spec.ts']);

      h.model(ROOT, fewer);
      loads.modelChanged(ROOT, fewer);

      expect(h.dryRun).not.toHaveBeenCalled();
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN the model refreshes with its groups gone THEN there is no entry to drop', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      h.model(ROOT, null);
      loads.modelChanged(ROOT, null);

      expect(h.changed).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN Loading', () => {
    it('WHEN children are requested THEN it is ignored', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      toLoading(h, loads);
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(1);
      expect(h.results).toHaveBeenCalledTimes(1);
    });

    it('WHEN the dry-run settles first THEN its states show, the results stay null and the package is announced once', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      toLoading(h, loads);
      dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT'), dryStateOf(FILE_B, 'deferred')]);
      await flush();

      const view = loads.view(ROOT, PKG);

      expect(view.dryRun?.get(FILE_A)).toBe('HIT');
      expect(view.dryRun?.get(FILE_B)).toBe('deferred');
      expect(view.results).toBeNull();
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, PKG);
    });

    it('WHEN the last part settles THEN it is Loaded and a children request starts nothing', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      toLoading(h, loads);
      dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT')]);
      scanAt(h, 0).resolve(new Map());
      await flush();
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(1);
    });

    it('WHEN both parts reject THEN it is Failed with one log line per part', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      toLoading(h, loads);
      dryRunAt(h, 0).reject(new Error('dry boom'));
      scanAt(h, 0).reject(new Error('scan boom'));
      await flush();
      loads.childrenRequested(ROOT, PKG);

      expect(h.log).toHaveBeenCalledTimes(2);
      expect(h.dryRun).toHaveBeenCalledTimes(1);
    });

    it('WHEN the run ends THEN the first load aborts and a second starts', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      toLoading(h, loads);
      loads.runEnded(ROOT, PKG);

      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN all are refreshed THEN the first load aborts and a second starts', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      toLoading(h, loads);
      loads.refreshAll();

      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN the model refreshes with the same ids THEN the pending load is not aborted', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);
      const same = atomModelOf(['tests/a.spec.ts', 'tests/b fails.spec.ts']);

      toLoading(h, loads);
      h.model(ROOT, same);
      loads.modelChanged(ROOT, same);

      expect(dryRunAt(h, 0).signal.aborted).toBe(false);
      expect(h.dryRun).toHaveBeenCalledTimes(1);
    });

    it('WHEN the model refreshes with other ids THEN the load aborts, the package is announced and a children request starts a new one', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);
      const fewer = atomModelOf(['tests/a.spec.ts']);

      toLoading(h, loads);
      h.model(ROOT, fewer);
      loads.modelChanged(ROOT, fewer);
      loads.childrenRequested(ROOT, PKG);

      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
      expect(h.changed).toHaveBeenCalledWith(ROOT, PKG);
      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN an aborted first load', () => {
    it('WHEN its dry-run settles late THEN the result is dropped', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      toLoading(h, loads);
      loads.runEnded(ROOT, PKG);
      dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT')]);
      await flush();

      expect(loads.view(ROOT, PKG).dryRun).toBeNull();
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN its dry-run rejects late THEN nothing is logged', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      toLoading(h, loads);
      loads.runEnded(ROOT, PKG);
      dryRunAt(h, 0).reject(new Error('aborted'));
      await flush();

      expect(h.log).not.toHaveBeenCalled();
      expect(h.changed).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the same package loading in two roots', () => {
    it('WHEN the run ends in one root THEN only that root reloads', () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      h.model(ROOT, BASE_MODEL_STUB);
      h.model(OTHER_ROOT, BASE_MODEL_STUB);
      loads.childrenRequested(ROOT, PKG);
      loads.childrenRequested(OTHER_ROOT, PKG);
      loads.runEnded(ROOT, PKG);

      const scannedRoots = h.results.mock.calls.map(([root]) => root);

      expect(scannedRoots).toStrictEqual([ROOT, OTHER_ROOT, ROOT]);
    });

    it('WHEN the run ends in one root THEN the other root keeps its data', async () => {
      const h = loadsHarness();
      const loads = loadsOf(h);

      h.model(ROOT, BASE_MODEL_STUB);
      h.model(OTHER_ROOT, BASE_MODEL_STUB);
      loads.childrenRequested(ROOT, PKG);
      loads.childrenRequested(OTHER_ROOT, PKG);
      dryRunAt(h, 1).resolve([dryStateOf(FILE_A, 'HIT')]);
      await flush();
      loads.runEnded(ROOT, PKG);

      expect(loads.view(OTHER_ROOT, PKG).dryRun?.get(FILE_A)).toBe('HIT');
    });
  });
});
