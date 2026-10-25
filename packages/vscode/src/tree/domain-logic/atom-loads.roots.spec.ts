import { describe, expect, it } from 'vitest';

import { AtomLoads } from './atom-loads.ts';
import { FILE_A, OTHER_ROOT, PKG, ROOT } from '../test/common/atom-loads.const.ts';
import { BASE_MODEL_STUB } from '../test/stubs/atom-loads.stub.ts';
import { dryRunAt, dryStateOf, flush, loadsHarness, toLoaded, toLoading } from '../test/utils/atom-loads.spec.util.ts';

describe('FEATURE: atom loads of roots that are gone', () => {
  describe('GIVEN a loading package in a root that is no longer kept', () => {
    it('WHEN the kept roots are set THEN its load aborts', () => {
      const h = loadsHarness();
      const loads = new AtomLoads(h.ports, h.modelOf);

      toLoading(h, loads);
      loads.rootsKept(new Set([OTHER_ROOT]));

      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
    });

    it('WHEN the kept roots are set THEN nothing is announced', () => {
      const h = loadsHarness();
      const loads = new AtomLoads(h.ports, h.modelOf);

      toLoading(h, loads);
      loads.rootsKept(new Set([OTHER_ROOT]));

      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN the kept roots are set THEN its late result is dropped', async () => {
      const h = loadsHarness();
      const loads = new AtomLoads(h.ports, h.modelOf);

      toLoading(h, loads);
      loads.rootsKept(new Set([OTHER_ROOT]));
      dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT')]);
      await flush();

      expect(loads.view(ROOT, PKG).dryRun).toBeNull();
    });
  });

  describe('GIVEN a loaded package in a root that is no longer kept', () => {
    it('WHEN the kept roots are set and the root returns THEN a children request starts a new load', async () => {
      const h = loadsHarness();
      const loads = new AtomLoads(h.ports, h.modelOf);

      await toLoaded(h, loads);
      loads.rootsKept(new Set([OTHER_ROOT]));
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN a loaded package in a root that stays kept', () => {
    it('WHEN the kept roots are set THEN its data stays', async () => {
      const h = loadsHarness();
      const loads = new AtomLoads(h.ports, h.modelOf);

      await toLoaded(h, loads);
      h.model(OTHER_ROOT, BASE_MODEL_STUB);
      loads.rootsKept(new Set([ROOT, OTHER_ROOT]));

      expect(loads.view(ROOT, PKG).dryRun?.get(FILE_A)).toBe('HIT');
    });
  });
});
