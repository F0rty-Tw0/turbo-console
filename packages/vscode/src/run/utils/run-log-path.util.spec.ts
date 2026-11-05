import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runLogPathOf } from './run-log-path.util.ts';
import { RUN_LOG_FILE_PATTERN } from '../common/run-log-tail.const.ts';

describe('FEATURE: the log path of one run (spec D1, D16)', () => {
  describe('GIVEN root /ws and a run launched at 1700000000000 with id ab12cd34', () => {
    it('WHEN its path is built THEN turbo gets .turbo/turbo-console/run-1700000000000-ab12cd34.json, relative, with / separators', () => {
      const path = runLogPathOf('/ws', 1700000000000, 'ab12cd34');

      expect(path.env).toBe('.turbo/turbo-console/run-1700000000000-ab12cd34.json');
    });

    it('WHEN its path is built THEN the tail reads join(/ws, .turbo, turbo-console, run-1700000000000-ab12cd34.json)', () => {
      const path = runLogPathOf('/ws', 1700000000000, 'ab12cd34');

      expect(path.file).toBe(join('/ws', '.turbo', 'turbo-console', 'run-1700000000000-ab12cd34.json'));
    });

    it('WHEN its path is built THEN its file name matches RUN_LOG_FILE_PATTERN, so the day-old sweep finds it', () => {
      const path = runLogPathOf('/ws', 1700000000000, 'ab12cd34');

      expect(path.env.split('/').at(-1)).toMatch(RUN_LOG_FILE_PATTERN);
    });
  });

  it.each([
    ['another launch time', 1700000000001, 'ab12cd34'],
    ['another id (two windows, same millisecond)', 1700000000000, 'ffffffff']
  ])('GIVEN two runs of one task with %s WHEN their paths are built THEN the paths differ', (_title, launchedAt, id) => {
    const first = runLogPathOf('/ws', 1700000000000, 'ab12cd34');

    const second = runLogPathOf('/ws', launchedAt, id);

    expect(second).not.toStrictEqual(first);
  });
});
