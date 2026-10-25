import { beforeEach, describe, expect, it } from 'vitest';

import { AtomLoads } from './atom-loads.ts';
import { BASE_SPEC_PATHS, FILE_A, OTHER_ROOT, PKG, ROOT } from '../test/common/atom-load.const.ts';
import type { LoadsHarness } from '../test/common/atom-load.type.ts';
import { dryRunAt, dryStateOf, flush, loadsHarness } from '../test/utils/atom-load.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';

describe('FEATURE: atom loads waiting for the turbo binary', () => {
  let h: LoadsHarness;
  let loads: AtomLoads;

  beforeEach(() => {
    h = loadsHarness();
    loads = new AtomLoads(h.ports, h.modelOf);
  });

  describe('GIVEN children requested before the binary resolved', () => {
    beforeEach(() => {
      h.model(ROOT, atomModelOf(BASE_SPEC_PATHS));
      h.noBinary();
      loads.childrenRequested(ROOT, PKG);
    });

    describe('WHEN the model is published again with the binary', () => {
      beforeEach(() => {
        h.binary();
        loads.modelChanged(ROOT, atomModelOf(BASE_SPEC_PATHS));
      });

      it('THEN one load starts', () => {
        expect(h.dryRun).toHaveBeenCalledOnce();
      });

      it('THEN its settled dry run is announced', async () => {
        dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT')]);
        await flush();

        expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, PKG);
      });

      it('THEN a later model change with other ids leaves it Not loaded', () => {
        const fewer = atomModelOf(['tests/a.spec.ts']);

        h.model(ROOT, fewer);
        loads.modelChanged(ROOT, fewer);

        expect(h.dryRun).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN the model changes while the binary is still missing', () => {
      beforeEach(() => {
        loads.modelChanged(ROOT, atomModelOf(BASE_SPEC_PATHS));
      });

      it('THEN nothing starts', () => {
        expect(h.dryRun).not.toHaveBeenCalled();
      });

      it('THEN the next model change with the binary starts a load', () => {
        h.binary();
        loads.modelChanged(ROOT, atomModelOf(BASE_SPEC_PATHS));

        expect(h.dryRun).toHaveBeenCalledOnce();
      });
    });

    it('WHEN the model changes without its groups THEN a later model change with the binary starts nothing', () => {
      h.model(ROOT, atomModelOf([]));
      loads.modelChanged(ROOT, atomModelOf([]));
      h.binary();
      h.model(ROOT, atomModelOf(BASE_SPEC_PATHS));
      loads.modelChanged(ROOT, atomModelOf(BASE_SPEC_PATHS));

      expect(h.dryRun).not.toHaveBeenCalled();
    });

    it('WHEN another root model changes with the binary THEN nothing starts', () => {
      h.binary();
      loads.modelChanged(OTHER_ROOT, atomModelOf(BASE_SPEC_PATHS));

      expect(h.dryRun).not.toHaveBeenCalled();
    });

    it('WHEN the root is no longer kept THEN its model change with the binary starts nothing', () => {
      loads.rootsKept(new Set([OTHER_ROOT]));
      h.binary();
      loads.modelChanged(ROOT, atomModelOf(BASE_SPEC_PATHS));

      expect(h.dryRun).not.toHaveBeenCalled();
    });

    it('WHEN the root stays kept THEN its model change with the binary starts a load', () => {
      loads.rootsKept(new Set([ROOT]));
      h.binary();
      loads.modelChanged(ROOT, atomModelOf(BASE_SPEC_PATHS));

      expect(h.dryRun).toHaveBeenCalledOnce();
    });

    it('WHEN the loads are disposed THEN a model change with the binary starts nothing', () => {
      loads.dispose();
      h.binary();
      loads.modelChanged(ROOT, atomModelOf(BASE_SPEC_PATHS));

      expect(h.dryRun).not.toHaveBeenCalled();
    });

    it('WHEN all are refreshed with the binary THEN nothing starts', () => {
      h.binary();
      loads.refreshAll();

      expect(h.dryRun).not.toHaveBeenCalled();
    });
  });
});
