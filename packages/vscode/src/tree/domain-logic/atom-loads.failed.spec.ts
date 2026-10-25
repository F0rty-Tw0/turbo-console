import type { AtomResult } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { AtomLoads } from './atom-loads.ts';
import { BASE_SPEC_PATHS, FILE_A, PKG, ROOT } from '../test/common/atom-load.const.ts';
import type { LoadsHarness } from '../test/common/atom-load.type.ts';
import { ATOM_RESULT_STUB } from '../test/stubs/atom-load.stub.ts';
import { dryRunAt, flush, loadsHarness, scanAt, toFailed, toLoading } from '../test/utils/atom-load.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';

describe('FEATURE: atom loads of a package whose load failed', () => {
  let h: LoadsHarness;
  let loads: AtomLoads;

  beforeEach(() => {
    h = loadsHarness();
    loads = new AtomLoads(h.ports, h.modelOf);
  });

  describe('GIVEN Failed', () => {
    beforeEach(async () => {
      await toFailed(h, loads);
      h.changed.mockClear();
    });

    it('WHEN children are requested THEN no retry starts', () => {
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(1);
    });

    it('WHEN the run ends THEN it loads again', () => {
      loads.runEnded(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN all are refreshed THEN it loads again', () => {
      loads.refreshAll();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });

    describe('WHEN the model refreshes with the same ids', () => {
      beforeEach(() => {
        loads.modelChanged(ROOT, atomModelOf(BASE_SPEC_PATHS));
      });

      it('THEN it stays Failed and nothing is announced', () => {
        expect(h.changed).not.toHaveBeenCalled();
      });

      it('THEN nothing starts', () => {
        expect(h.dryRun).toHaveBeenCalledTimes(1);
      });
    });

    describe('WHEN the model refreshes with other ids', () => {
      beforeEach(() => {
        const fewer = atomModelOf(['tests/a.spec.ts']);

        h.model(ROOT, fewer);
        loads.modelChanged(ROOT, fewer);
      });

      it('THEN it is Not loaded', () => {
        expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, PKG);
      });

      it('THEN a children request starts a load', () => {
        loads.childrenRequested(ROOT, PKG);

        expect(h.dryRun).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('GIVEN a dry-run that rejects and a scan that resolves', () => {
    beforeEach(async () => {
      toLoading(h, loads);
      dryRunAt(h, 0).reject(new Error('turbo exploded'));
      scanAt(h, 0).resolve(new Map<string, AtomResult>([[FILE_A, ATOM_RESULT_STUB]]));
      await flush();
    });

    it('WHEN the view is read THEN it has no dry-run states', () => {
      expect(loads.view(ROOT, PKG).dryRun).toBeNull();
    });

    it('WHEN the view is read THEN it carries the results', () => {
      expect(loads.view(ROOT, PKG).results?.get(FILE_A)).toStrictEqual(ATOM_RESULT_STUB);
    });

    it('WHEN the log is read THEN it holds one dry-run line', () => {
      expect(h.log).toHaveBeenCalledExactlyOnceWith('atoms /ws @fx/e2e: dry-run failed: turbo exploded');
    });

    it('WHEN children are requested THEN it is Loaded and starts nothing', () => {
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(1);
    });
  });

  describe('GIVEN a scan result map holding a failed file', () => {
    it('WHEN the scan settles THEN the view carries that result', async () => {
      const failed: AtomResult = { outcome: 'failed', durationMs: 7900, endedAt: 1 };

      toLoading(h, loads);
      scanAt(h, 0).resolve(new Map<string, AtomResult>([[FILE_A, failed]]));
      await flush();

      expect(loads.view(ROOT, PKG).results?.get(FILE_A)).toStrictEqual(failed);
    });
  });
});
