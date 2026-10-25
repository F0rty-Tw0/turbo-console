import { beforeEach, describe, expect, it } from 'vitest';

import { AtomLoads } from './atom-loads.ts';
import { BASE_SPEC_PATHS, FILE_A, OTHER_ROOT, PKG, ROOT } from '../test/common/atom-load.const.ts';
import type { LoadsHarness } from '../test/common/atom-load.type.ts';
import { dryRunAt, dryStateOf, flush, loadsHarness, toLoading } from '../test/utils/atom-load.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';

describe('FEATURE: atom loads that were replaced or belong to another root', () => {
  let h: LoadsHarness;
  let loads: AtomLoads;

  beforeEach(() => {
    h = loadsHarness();
    loads = new AtomLoads(h.ports, h.modelOf);
  });

  describe('GIVEN an aborted first load', () => {
    beforeEach(() => {
      toLoading(h, loads);
      loads.runEnded(ROOT, PKG);
    });

    describe('WHEN its dry-run settles late', () => {
      beforeEach(async () => {
        dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT')]);
        await flush();
      });

      it('THEN the result is not stored', () => {
        expect(loads.view(ROOT, PKG).dryRun).toBeNull();
      });

      it('THEN nothing is announced', () => {
        expect(h.changed).not.toHaveBeenCalled();
      });
    });

    describe('WHEN its dry-run rejects late', () => {
      beforeEach(async () => {
        dryRunAt(h, 0).reject(new Error('aborted'));
        await flush();
      });

      it('THEN nothing is logged', () => {
        expect(h.log).not.toHaveBeenCalled();
      });

      it('THEN nothing is announced', () => {
        expect(h.changed).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN the same package loading in two roots', () => {
    beforeEach(() => {
      h.model(ROOT, atomModelOf(BASE_SPEC_PATHS));
      h.model(OTHER_ROOT, atomModelOf(BASE_SPEC_PATHS));
      loads.childrenRequested(ROOT, PKG);
      loads.childrenRequested(OTHER_ROOT, PKG);
    });

    it('WHEN the run ends in one root THEN only that root reloads', () => {
      loads.runEnded(ROOT, PKG);

      const scannedRoots = h.results.mock.calls.map(([root]) => root);

      expect(scannedRoots).toStrictEqual([ROOT, OTHER_ROOT, ROOT]);
    });

    it('WHEN the run ends in one root THEN the other root keeps its data', async () => {
      dryRunAt(h, 1).resolve([dryStateOf(FILE_A, 'HIT')]);
      await flush();
      loads.runEnded(ROOT, PKG);

      expect(loads.view(OTHER_ROOT, PKG).dryRun?.get(FILE_A)).toBe('HIT');
    });
  });
});
