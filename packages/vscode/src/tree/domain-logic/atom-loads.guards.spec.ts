import { beforeEach, describe, expect, it } from 'vitest';

import { AtomLoads } from './atom-loads.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { BASE_SPEC_PATHS, FILE_A, PKG, ROOT } from '../test/common/atom-load.const.ts';
import type { LoadsHarness } from '../test/common/atom-load.type.ts';
import { dryRunAt, dryStateOf, flush, loadsHarness, toLoading } from '../test/utils/atom-load.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';

describe('FEATURE: atom loads that have nothing to load or are disposed', () => {
  let h: LoadsHarness;
  let loads: AtomLoads;

  beforeEach(() => {
    h = loadsHarness();
    loads = new AtomLoads(h.ports, h.modelOf);
  });

  describe('GIVEN no turbo binary', () => {
    beforeEach(() => {
      h.model(ROOT, atomModelOf(BASE_SPEC_PATHS));
      h.noBinary();
      loads.childrenRequested(ROOT, PKG);
    });

    it('WHEN children are requested THEN nothing starts', () => {
      expect(h.dryRun).not.toHaveBeenCalled();
    });

    it('WHEN children are requested THEN nothing is logged', () => {
      expect(h.log).not.toHaveBeenCalled();
    });

    it('WHEN the binary exists and children are requested again THEN a load starts', () => {
      h.binary();
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledExactlyOnceWith(TURBO_BINARY_STUB, expect.anything(), expect.any(AbortSignal));
    });
  });

  describe('GIVEN a package without Atomizer groups', () => {
    it('WHEN children are requested THEN nothing starts', () => {
      h.model(ROOT, atomModelOf([]));
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a root whose model is not loaded', () => {
    it('WHEN children are requested THEN nothing starts', () => {
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a pending load that was disposed', () => {
    beforeEach(async () => {
      toLoading(h, loads);
      loads.dispose();
      dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT')]);
      await flush();
    });

    it('WHEN its late result arrives THEN the load was aborted', () => {
      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
    });

    it('WHEN its late result arrives THEN nothing is announced', () => {
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN its late result arrives THEN the view has no data', () => {
      expect(loads.view(ROOT, PKG).dryRun).toBeNull();
    });
  });
});
