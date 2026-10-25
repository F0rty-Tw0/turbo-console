import { beforeEach, describe, expect, it } from 'vitest';

import { AtomLoads } from './atom-loads.ts';
import { BASE_SPEC_PATHS, FILE_A, FILE_B, PKG, ROOT } from '../test/common/atom-load.const.ts';
import type { LoadsHarness } from '../test/common/atom-load.type.ts';
import { ATOM_RESULT_STUB } from '../test/stubs/atom-load.stub.ts';
import { dryRunAt, dryStateOf, flush, loadsHarness, scanAt, toLoading } from '../test/utils/atom-load.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';

describe('FEATURE: atom loads of a package that is loading', () => {
  let h: LoadsHarness;
  let loads: AtomLoads;

  beforeEach(() => {
    h = loadsHarness();
    loads = new AtomLoads(h.ports, h.modelOf);
    toLoading(h, loads);
  });

  describe('GIVEN Loading', () => {
    it('WHEN children are requested THEN no second dry-run and no second scan start', () => {
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(1);
      expect(h.results).toHaveBeenCalledTimes(1);
    });

    describe('WHEN the dry-run settles first', () => {
      beforeEach(async () => {
        dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT'), dryStateOf(FILE_B, 'deferred')]);
        await flush();
      });

      it('THEN its states show in the view', () => {
        const { dryRun } = loads.view(ROOT, PKG);

        expect(dryRun?.get(FILE_A)).toBe('HIT');
        expect(dryRun?.get(FILE_B)).toBe('deferred');
      });

      it('THEN the results stay null', () => {
        expect(loads.view(ROOT, PKG).results).toBeNull();
      });

      it('THEN the package is announced once', () => {
        expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, PKG);
      });
    });

    describe('WHEN the last part settles', () => {
      beforeEach(async () => {
        dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT')]);
        scanAt(h, 0).resolve(new Map([[FILE_A, ATOM_RESULT_STUB]]));
        await flush();
      });

      it('THEN the view carries the dry-run states', () => {
        expect(loads.view(ROOT, PKG).dryRun?.get(FILE_A)).toBe('HIT');
      });

      it('THEN the view carries the results', () => {
        expect(loads.view(ROOT, PKG).results?.get(FILE_A)).toStrictEqual(ATOM_RESULT_STUB);
      });
    });

    describe('WHEN both parts reject', () => {
      beforeEach(async () => {
        dryRunAt(h, 0).reject(new Error('dry boom'));
        scanAt(h, 0).reject(new Error('scan boom'));
        await flush();
      });

      it('THEN one log line per part is written', () => {
        expect(h.log).toHaveBeenCalledTimes(2);
      });

      it('THEN a children request starts nothing', () => {
        loads.childrenRequested(ROOT, PKG);

        expect(h.dryRun).toHaveBeenCalledTimes(1);
      });
    });

    describe('WHEN the run ends', () => {
      beforeEach(() => {
        loads.runEnded(ROOT, PKG);
      });

      it('THEN the first load aborts', () => {
        expect(dryRunAt(h, 0).signal.aborted).toBe(true);
      });

      it('THEN a second load starts', () => {
        expect(h.dryRun).toHaveBeenCalledTimes(2);
      });
    });

    describe('WHEN all are refreshed', () => {
      beforeEach(() => {
        loads.refreshAll();
      });

      it('THEN the first load aborts', () => {
        expect(dryRunAt(h, 0).signal.aborted).toBe(true);
      });

      it('THEN a second load starts', () => {
        expect(h.dryRun).toHaveBeenCalledTimes(2);
      });
    });

    describe('WHEN the model refreshes with the same ids', () => {
      beforeEach(() => {
        const same = atomModelOf(BASE_SPEC_PATHS);

        h.model(ROOT, same);
        loads.modelChanged(ROOT, same);
      });

      it('THEN the pending load is not aborted', () => {
        expect(dryRunAt(h, 0).signal.aborted).toBe(false);
      });

      it('THEN no second load starts', () => {
        expect(h.dryRun).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('GIVEN a Loading package whose model refreshed with other ids', () => {
    beforeEach(() => {
      const fewer = atomModelOf(['tests/a.spec.ts']);

      h.model(ROOT, fewer);
      loads.modelChanged(ROOT, fewer);
    });

    it('WHEN the load is read THEN it was aborted', () => {
      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
    });

    it('WHEN the announcements are read THEN the package was announced', () => {
      expect(h.changed).toHaveBeenCalledWith(ROOT, PKG);
    });

    it('WHEN children are requested THEN a new load starts', () => {
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });
  });
});
