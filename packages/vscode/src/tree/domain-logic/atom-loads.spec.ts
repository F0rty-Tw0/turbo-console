import { beforeEach, describe, expect, it } from 'vitest';

import { AtomLoads } from './atom-loads.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { BASE_SPEC_PATHS, FILE_A, FILE_B, PKG, ROOT } from '../test/common/atom-load.const.ts';
import type { LoadsHarness } from '../test/common/atom-load.type.ts';
import { loadsHarness } from '../test/utils/atom-load.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';

describe('FEATURE: atom loads of a package that is not loaded yet', () => {
  let h: LoadsHarness;
  let loads: AtomLoads;

  beforeEach(() => {
    h = loadsHarness();
    loads = new AtomLoads(h.ports, h.modelOf);
  });

  describe('GIVEN Not loaded', () => {
    beforeEach(() => {
      h.model(ROOT, atomModelOf(BASE_SPEC_PATHS));
    });

    describe('WHEN children are requested', () => {
      beforeEach(() => {
        loads.childrenRequested(ROOT, PKG);
      });

      it('THEN one dry-run of the group umbrella starts', () => {
        const request = { tasks: ['e2e-ci'], packages: [PKG], singlePackage: false };

        expect(h.dryRun).toHaveBeenCalledExactlyOnceWith(TURBO_BINARY_STUB, request, expect.any(AbortSignal));
      });

      it('THEN one scan of the group files starts', () => {
        expect(h.results).toHaveBeenCalledExactlyOnceWith(ROOT, new Set([FILE_A, FILE_B]));
      });

      it('THEN the view has no dry-run states yet', () => {
        expect(loads.view(ROOT, PKG).dryRun).toBeNull();
      });
    });

    describe('WHEN the run ends', () => {
      beforeEach(() => {
        loads.runEnded(ROOT, PKG);
      });

      it('THEN no dry-run and no scan start', () => {
        expect(h.dryRun).not.toHaveBeenCalled();
        expect(h.results).not.toHaveBeenCalled();
      });

      it('THEN the view has no data', () => {
        expect(loads.view(ROOT, PKG).dryRun).toBeNull();
      });
    });

    it('WHEN all are refreshed THEN no dry-run and no scan start', () => {
      loads.refreshAll();

      expect(h.dryRun).not.toHaveBeenCalled();
      expect(h.results).not.toHaveBeenCalled();
    });

    describe('WHEN the model refreshes with the same ids', () => {
      beforeEach(() => {
        loads.modelChanged(ROOT, atomModelOf(BASE_SPEC_PATHS));
      });

      it('THEN nothing starts', () => {
        expect(h.dryRun).not.toHaveBeenCalled();
      });

      it('THEN nothing is announced', () => {
        expect(h.changed).not.toHaveBeenCalled();
      });
    });

    describe('WHEN the model refreshes with other ids', () => {
      beforeEach(() => {
        const fewer = atomModelOf(['tests/a.spec.ts']);

        h.model(ROOT, fewer);
        loads.modelChanged(ROOT, fewer);
      });

      it('THEN nothing starts', () => {
        expect(h.dryRun).not.toHaveBeenCalled();
      });

      it('THEN nothing is announced', () => {
        expect(h.changed).not.toHaveBeenCalled();
      });
    });

    it('WHEN the model refreshes with its groups gone THEN there is no entry to drop', () => {
      h.model(ROOT, null);
      loads.modelChanged(ROOT, null);

      expect(h.changed).not.toHaveBeenCalled();
    });
  });
});
