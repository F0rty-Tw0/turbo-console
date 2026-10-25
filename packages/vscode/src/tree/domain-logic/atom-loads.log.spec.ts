import { describe, expect, it } from 'vitest';

import { AtomLoads } from './atom-loads.ts';
import { PKG } from '../test/common/atom-loads.const.ts';
import { BASE_MODEL_STUB } from '../test/stubs/atom-loads.stub.ts';
import { dryRunAt, flush, loadsHarness } from '../test/utils/atom-loads.spec.util.ts';

const HOSTILE_ROOT = '/ws\n2026-10-25 forged entry';

describe('FEATURE: atom loads log lines', () => {
  describe('GIVEN a root whose path holds a line break', () => {
    it('WHEN its dry-run fails THEN the logged line is one entry with the break indented', async () => {
      const h = loadsHarness();
      const loads = new AtomLoads(h.ports, h.modelOf);

      h.model(HOSTILE_ROOT, BASE_MODEL_STUB);
      loads.childrenRequested(HOSTILE_ROOT, PKG);
      dryRunAt(h, 0).reject(new Error('boom'));
      await flush();

      expect(h.log).toHaveBeenCalledExactlyOnceWith(`atoms /ws\n    2026-10-25 forged entry ${PKG}: dry-run failed: boom`);
    });
  });
});
