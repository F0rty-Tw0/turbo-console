import { describe, expect, it } from 'vitest';

import { taskPoolOf } from './task-pool.util.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

const TURBO = taskOf('app#build', []);

const SCRIPT = scriptOf('app#dev', []);

const ROOT_GEN = taskOf('//#gen', []);

describe('FEATURE: taskPoolOf', () => {
  describe('GIVEN a script and a turbo task', () => {
    it('WHEN scripts are hidden THEN only the turbo task is in the pool', () => {
      const pool = taskPoolOf([SCRIPT, TURBO], false);

      expect(pool).toStrictEqual([TURBO]);
    });

    it('WHEN scripts are shown THEN both are in the pool, order kept', () => {
      const pool = taskPoolOf([SCRIPT, TURBO], true);

      expect(pool).toStrictEqual([SCRIPT, TURBO]);
    });
  });

  describe('GIVEN a root //#gen turbo task', () => {
    it.each([false, true])('WHEN scriptsShown is %s THEN it is in the pool', (scriptsShown) => {
      const pool = taskPoolOf([ROOT_GEN], scriptsShown);

      expect(pool).toStrictEqual([ROOT_GEN]);
    });
  });
});
