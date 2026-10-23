import { describe, expect, it } from 'vitest';

import { taskLayoutKeyOf } from './elk-task-graph.util.ts';
import { choiceOf, droppedNoticeOf, matchesTaskSearch, requestOf, taskDepthOf } from './task-choice.util.ts';
import type { ShownSet } from '../common/shown-set.type.ts';
import { GRAPH_TASK_STUB, TASK_CHAIN_STUB } from '../test/stubs/graph-task.stub.ts';

/** `web#build` and the `api#build` it needs, listed in the reverse of the stub's order. */
const SHOWN_SET: ShownSet = { ids: ['web#build', 'api#build'], hiddenCount: 0, droppedIds: [] };

describe('FEATURE: task choice rules', () => {
  describe('GIVEN the chain api#build, web#build and web#lint', () => {
    it('WHEN known and unknown ids are asked for THEN only the known ones are chosen and the rest counted', () => {
      const choice = choiceOf(TASK_CHAIN_STUB, ['web#build', 'zzz#none', 'api#build']);

      expect(choice).toStrictEqual({ chosen: ['web#build', 'api#build'], dropped: 1 });
    });

    it('WHEN an id is asked for twice THEN it is chosen once and nothing is dropped', () => {
      const choice = choiceOf(TASK_CHAIN_STUB, ['web#build', 'web#build']);

      expect(choice).toStrictEqual({ chosen: ['web#build'], dropped: 0 });
    });

    it('WHEN only unknown ids are asked for THEN nothing is chosen', () => {
      const choice = choiceOf(TASK_CHAIN_STUB, ['zzz#none']);

      expect(choice).toStrictEqual({ chosen: [], dropped: 1 });
    });
  });

  describe('GIVEN a Dependents depth field text', () => {
    it.each([
      ['0', 0],
      ['5', 5]
    ])('WHEN it is %s THEN the depth is %d', (text, depth) => {
      expect(taskDepthOf(text)).toBe(depth);
    });

    it.each(['', '6', '-1', '1.5', 'x'])('WHEN it is "%s" THEN it is no depth', (text) => {
      expect(taskDepthOf(text)).toBeNull();
    });
  });

  describe('GIVEN the task a#build', () => {
    it.each(['BUI', 'a#b', ''])('WHEN the search is "%s" THEN it matches', (search) => {
      expect(matchesTaskSearch(GRAPH_TASK_STUB, search)).toBe(true);
    });

    it('WHEN the search is lint THEN it does not match', () => {
      expect(matchesTaskSearch(GRAPH_TASK_STUB, 'lint')).toBe(false);
    });
  });

  describe('GIVEN the shown set web#build and api#build', () => {
    it('WHEN the request is made THEN it holds those tasks in the task list order under their layout key', () => {
      const request = requestOf(TASK_CHAIN_STUB, SHOWN_SET);
      const ids = request.tasks.map((task) => task.id);

      expect(ids).toStrictEqual(['api#build', 'web#build']);
      expect(request.key).toBe(taskLayoutKeyOf(TASK_CHAIN_STUB, request.shown));
    });
  });

  describe('GIVEN a count of dropped chosen ids', () => {
    it('WHEN it is 0 THEN there is no notice', () => {
      expect(droppedNoticeOf(0)).toBeNull();
    });

    it('WHEN it is 2 THEN the notice says 2 chosen tasks no longer exist', () => {
      expect(droppedNoticeOf(2)).toBe('2 chosen tasks no longer exist');
    });
  });
});
