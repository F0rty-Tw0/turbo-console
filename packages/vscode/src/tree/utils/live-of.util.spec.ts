import { describe, expect, it, vi } from 'vitest';

import { liveOf } from './live-of.util.ts';
import type { LiveIds } from '../../run/common/run.type.ts';
import { rowContextOf } from '../test/utils/row-context.spec.util.ts';

describe('FEATURE: the live ids a view reads', () => {
  describe('GIVEN scripts are hidden', () => {
    it('WHEN asked for a root THEN it is the run store answer for that root', () => {
      const held: ReadonlySet<string> = new Set(['s#lint']);
      const live = vi.fn<LiveIds>(() => held);
      const context = rowContextOf('list', undefined, false, { scriptsShown: false, live });

      expect(liveOf(context, '/ws')).toBe(held);
      expect(live).toHaveBeenCalledExactlyOnceWith('/ws');
    });
  });

  describe('GIVEN scripts are shown', () => {
    it('WHEN asked for a root THEN the run store is not asked and the set is empty', () => {
      const live = vi.fn<LiveIds>(() => new Set(['s#lint']));
      const context = rowContextOf('list', undefined, false, { scriptsShown: true, live });

      expect(liveOf(context, '/ws').size).toBe(0);
      expect(live).not.toHaveBeenCalled();
    });
  });
});
