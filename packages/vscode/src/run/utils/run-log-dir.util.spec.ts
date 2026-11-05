import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runLogDirOf } from './run-log-dir.util.ts';

describe('FEATURE: the turbo log folder of a root', () => {
  describe('GIVEN a workspace root', () => {
    it('WHEN the folder is made THEN it is .turbo/turbo-console under the root', () => {
      expect(runLogDirOf('/ws')).toBe(join('/ws', '.turbo', 'turbo-console'));
    });
  });
});
