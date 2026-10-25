import { beforeEach, describe, expect, it } from 'vitest';

import { AtomLoads } from './atom-loads.ts';
import { BASE_SPEC_PATHS, FILE_A, OTHER_ROOT, PKG, ROOT } from '../test/common/atom-load.const.ts';
import type { LoadsHarness } from '../test/common/atom-load.type.ts';
import { ATOM_RESULT_STUB } from '../test/stubs/atom-load.stub.ts';
import { dryRunAt, flush, loadsHarness, scanAt, toLoaded } from '../test/utils/atom-load.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';

describe('FEATURE: atom loads of a package that loaded', () => {
  let h: LoadsHarness;
  let loads: AtomLoads;

  beforeEach(async () => {
    h = loadsHarness();
    loads = new AtomLoads(h.ports, h.modelOf);
    await toLoaded(h, loads);
    h.changed.mockClear();
  });

  describe('GIVEN Loaded', () => {
    it('WHEN children are requested THEN no second load starts', () => {
      loads.childrenRequested(ROOT, PKG);

      expect(h.dryRun).toHaveBeenCalledTimes(1);
    });

    describe('WHEN the run ends', () => {
      beforeEach(() => {
        loads.runEnded(ROOT, PKG);
      });

      it('THEN it loads again', () => {
        expect(h.dryRun).toHaveBeenCalledTimes(2);
      });

      it('THEN the old maps stay visible', () => {
        const view = loads.view(ROOT, PKG);

        expect(view.dryRun?.get(FILE_A)).toBe('HIT');
        expect(view.results?.get(FILE_A)).toStrictEqual(ATOM_RESULT_STUB);
      });
    });

    describe('WHEN all are refreshed', () => {
      beforeEach(() => {
        loads.refreshAll();
      });

      it('THEN it loads again', () => {
        expect(h.dryRun).toHaveBeenCalledTimes(2);
      });

      it('THEN the old maps stay visible', () => {
        const view = loads.view(ROOT, PKG);

        expect(view.dryRun?.get(FILE_A)).toBe('HIT');
        expect(view.results?.get(FILE_A)).toStrictEqual(ATOM_RESULT_STUB);
      });
    });

    describe('WHEN the model refreshes with the same ids in a new object', () => {
      beforeEach(() => {
        const same = atomModelOf(BASE_SPEC_PATHS);

        h.model(ROOT, same);
        loads.modelChanged(ROOT, same);
      });

      it('THEN the data stays', () => {
        expect(loads.view(ROOT, PKG).dryRun?.get(FILE_A)).toBe('HIT');
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
        const view = loads.view(ROOT, PKG);

        expect(view.dryRun).toBeNull();
        expect(view.results).toBeNull();
      });

      it('THEN the package is announced once', () => {
        expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, PKG);
      });
    });

    describe('WHEN the model refreshes with other ids while the store still holds the old model', () => {
      beforeEach(() => {
        loads.modelChanged(ROOT, atomModelOf(['tests/a.spec.ts']));
      });

      it('THEN it is Not loaded', () => {
        expect(loads.view(ROOT, PKG).dryRun).toBeNull();
      });

      it('THEN the package is announced once', () => {
        expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, PKG);
      });
    });

    describe('WHEN the model refreshes with its groups gone', () => {
      beforeEach(() => {
        loads.modelChanged(ROOT, null);
      });

      it('THEN it is Not loaded', () => {
        expect(loads.view(ROOT, PKG).results).toBeNull();
      });

      it('THEN the package is announced once', () => {
        expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, PKG);
      });
    });

    describe('WHEN the binary is gone and the run ends', () => {
      beforeEach(() => {
        h.noBinary();
        loads.runEnded(ROOT, PKG);
      });

      it('THEN no load starts', () => {
        expect(h.dryRun).toHaveBeenCalledTimes(1);
      });

      it('THEN the entry stays as it is', () => {
        expect(loads.view(ROOT, PKG).dryRun?.get(FILE_A)).toBe('HIT');
      });
    });
  });

  describe('GIVEN two loaded packages in two roots', () => {
    beforeEach(async () => {
      h.model(OTHER_ROOT, atomModelOf(BASE_SPEC_PATHS));
      loads.childrenRequested(OTHER_ROOT, PKG);
      dryRunAt(h, 1).resolve([]);
      scanAt(h, 1).resolve(new Map());
      await flush();
    });

    it('WHEN all are refreshed THEN both load again', () => {
      loads.refreshAll();

      expect(h.dryRun).toHaveBeenCalledTimes(4);
    });
  });
});
