import { describe, expect, it } from 'vitest';

import { AtomLoads } from './atom-loads.ts';
import { BASE_SPEC_PATHS, PKG } from '../test/common/atom-load.const.ts';
import { dryRunAt, flush, loadsHarness } from '../test/utils/atom-load.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';

const HOSTILE_ROOT = '/ws\n2026-10-25 forged entry';

describe('FEATURE: atom loads log lines', () => {
  describe('GIVEN a root whose path holds a line break', () => {
    it('WHEN its dry-run fails THEN the logged line is one entry with the break indented', async () => {
      const h = loadsHarness();
      const loads = new AtomLoads(h.ports, h.modelOf);

      h.model(HOSTILE_ROOT, atomModelOf(BASE_SPEC_PATHS));
      loads.childrenRequested(HOSTILE_ROOT, PKG);
      dryRunAt(h, 0).reject(new Error('boom'));
      await flush();

      expect(h.log).toHaveBeenCalledExactlyOnceWith(`atoms /ws\n    2026-10-25 forged entry ${PKG}: dry-run failed: boom`);
    });
  });
});
