import { describe, expect, it } from 'vitest';

import { treeDepsOf } from './tree-deps.ts';
import type { Timings } from '../../shared/common/api.type.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import type { TreeProviderDeps } from '../common/tree-node.type.ts';
import { TIMINGS_STUB } from '../test/stubs/timings.stub.ts';
import { ATOM_IDLE_PORTS } from '../test/utils/tree-ports.spec.util.ts';

describe('FEATURE: tree provider deps', () => {
  describe('GIVEN a run lookup, timings, a scripts toggle and Atomizer ports', () => {
    it('WHEN the deps are built THEN they carry the lookup, the tree-visible spans, the toggle and the ports', () => {
      const runs: TreeProviderDeps['runs'] = { get: () => undefined, runningIds: () => new Set() };
      const scripts = scriptsToggleMock();
      const treeVisible = new Map([['/ws', { start: 1, end: 2 }]]);
      const timings: Timings = { ...TIMINGS_STUB, treeVisible };

      const deps = treeDepsOf(runs, timings, scripts, ATOM_IDLE_PORTS);

      expect(deps).toStrictEqual({ runs, treeVisible, scripts, atom: ATOM_IDLE_PORTS });
    });
  });
});
