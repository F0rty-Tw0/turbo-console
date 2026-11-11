import { describe, expect, it } from 'vitest';

import { AFFECTED_FILE_REASONS, AFFECTED_LEVELS, AFFECTED_WORDS } from './affected.const.ts';

describe('FEATURE: affected words', () => {
  describe('GIVEN the consts', () => {
    it('THEN the words are affected / affected via dependency and the levels are task level / package level', () => {
      expect(AFFECTED_WORDS).toStrictEqual({ changed: 'affected', dependency: 'affected via dependency' });
      expect(AFFECTED_LEVELS).toStrictEqual({ task: 'task level', package: 'package level' });
    });

    it('THEN the file reasons are the three turbo file-change names', () => {
      expect([...AFFECTED_FILE_REASONS]).toStrictEqual(['TaskFileChanged', 'TaskGlobalFileChanged', 'TaskGlobalDepsChanged']);
    });
  });
});
