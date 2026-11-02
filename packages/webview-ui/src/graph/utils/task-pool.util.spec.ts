import { describe, expect, it } from 'vitest';

import { taskPoolOf } from './task-pool.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const taskWith = (id: string, isTurboTask: boolean): GraphTask => {
  const base = taskOf(id, []);
  const task: GraphTask = { ...base, isTurboTask };

  return task;
};

const TURBO = taskWith('app#build', true);

const SCRIPT = taskWith('app#dev', false);

const ROOT_GEN = taskWith('//#gen', true);

describe('FEATURE: taskPoolOf', () => {
  describe('GIVEN a script and a turbo task', () => {
    it('WHEN scripts are hidden THEN only the turbo task is in the pool', () => {
      expect(taskPoolOf([SCRIPT, TURBO], false)).toStrictEqual([TURBO]);
    });

    it('WHEN scripts are shown THEN both are in the pool, order kept', () => {
      expect(taskPoolOf([SCRIPT, TURBO], true)).toStrictEqual([SCRIPT, TURBO]);
    });
  });

  describe('GIVEN a root //#gen turbo task', () => {
    it.each([false, true])('WHEN scriptsShown is %s THEN it is in the pool', (scriptsShown) => {
      expect(taskPoolOf([ROOT_GEN], scriptsShown)).toStrictEqual([ROOT_GEN]);
    });
  });
});
