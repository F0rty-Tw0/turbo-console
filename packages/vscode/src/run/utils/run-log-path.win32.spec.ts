import type * as nodePath from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { runLogPathOf } from './run-log-path.util.ts';

vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal<typeof nodePath>();
  const mocked = { ...actual, join: actual.win32.join };

  return mocked;
});

describe('FEATURE: the log path of one run on a platform that joins with a backslash (spec D1, D16)', () => {
  describe('GIVEN node:path joins with win32 rules', () => {
    it('WHEN its path is built THEN turbo still gets the relative path with / separators and no backslash', () => {
      const path = runLogPathOf('C:\\ws', 1700000000000, 'ab12cd34');

      expect(path.env).toBe('.turbo/turbo-console/run-1700000000000-ab12cd34.json');
    });

    it('WHEN its path is built THEN the tail reads the win32-joined file', () => {
      const path = runLogPathOf('C:\\ws', 1700000000000, 'ab12cd34');

      expect(path.file).toBe('C:\\ws\\.turbo\\turbo-console\\run-1700000000000-ab12cd34.json');
    });
  });
});
