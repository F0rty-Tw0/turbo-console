import { describe, expect, it } from 'vitest';

import { umbrellaSizeOf } from './atom-size.util.ts';
import { taskLayoutKeyOf } from './elk-task-graph.util.ts';
import { choiceOf, droppedNoticeOf, matchesTaskSearch, packageTaskIdsOf, requestOf, taskDepthOf } from './task-choice.util.ts';
import type { NodeSizer, UmbrellaSizers } from '../common/graph-page.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { ShownSet } from '../common/shown-set.type.ts';
import { GRAPH_TASK_STUB, ROOT_BUILD_STUB, TASK_CHAIN_STUB } from '../test/stubs/graph-task.stub.ts';

/** `web#build` and the `api#build` it needs, listed in the reverse of the stub's order. */
const SHOWN_SET: ShownSet = { ids: ['web#build', 'api#build'], hiddenCount: 0, droppedIds: [] };

const sizer: NodeSizer = (text) => {
  const size: NodeSize = { width: text.length * 10, height: 32 };

  return size;
};

const SIZERS: UmbrellaSizers = { name: sizer, counts: sizer };

const NO_COUNTS = new Map<string, number>();

/** `web#build` stands for an umbrella of ten files; `api#build` and `web#lint` are plain tasks. */
const UMBRELLA_COUNTS = new Map([['web#build', 10]]);

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
      expect(matchesTaskSearch(GRAPH_TASK_STUB, search, null)).toBe(true);
    });

    it('WHEN the search is lint THEN it does not match', () => {
      expect(matchesTaskSearch(GRAPH_TASK_STUB, 'lint', null)).toBe(false);
    });
  });

  describe('GIVEN the task //#build of a root labelled single-app', () => {
    it('WHEN the search is single THEN it matches the label', () => {
      expect(matchesTaskSearch(ROOT_BUILD_STUB, 'single', 'single-app')).toBe(true);
    });

    it('WHEN the search is single and the root has no label THEN it does not match', () => {
      expect(matchesTaskSearch(ROOT_BUILD_STUB, 'single', null)).toBe(false);
    });

    it('WHEN the search is // THEN it still matches through the id', () => {
      expect(matchesTaskSearch(ROOT_BUILD_STUB, '//', 'single-app')).toBe(true);
    });
  });

  describe('GIVEN the shown set web#build and api#build', () => {
    it('WHEN the request is made THEN it holds those tasks in the task list order under their layout key', () => {
      const request = requestOf(TASK_CHAIN_STUB, SHOWN_SET, NO_COUNTS, SIZERS);
      const ids = request.tasks.map((task) => task.id);

      expect(ids).toStrictEqual(['api#build', 'web#build']);
      expect(request.key).toBe(taskLayoutKeyOf(TASK_CHAIN_STUB, request.shown, NO_COUNTS));
    });

    it('WHEN a shown umbrella’s file count changes THEN the key changes', () => {
      const ten = requestOf(TASK_CHAIN_STUB, SHOWN_SET, UMBRELLA_COUNTS, SIZERS);
      const eleven = requestOf(TASK_CHAIN_STUB, SHOWN_SET, new Map([['web#build', 11]]), SIZERS);

      expect(eleven.key).not.toBe(ten.key);
    });

    it('WHEN a shown task is an umbrella THEN its key differs from today’s', () => {
      const request = requestOf(TASK_CHAIN_STUB, SHOWN_SET, UMBRELLA_COUNTS, SIZERS);

      expect(request.key).not.toBe(taskLayoutKeyOf(TASK_CHAIN_STUB, request.shown, NO_COUNTS));
    });

    it('WHEN a shown task is an umbrella THEN sizes holds umbrellaSizeOf for it and no other id', () => {
      const request = requestOf(TASK_CHAIN_STUB, SHOWN_SET, UMBRELLA_COUNTS, SIZERS);

      expect([...request.sizes]).toStrictEqual([['web#build', umbrellaSizeOf(SIZERS, 'build', 10)]]);
    });

    it('WHEN the only umbrella is not shown THEN the key is today’s key', () => {
      const request = requestOf(TASK_CHAIN_STUB, SHOWN_SET, new Map([['web#lint', 10]]), SIZERS);
      const drawn = TASK_CHAIN_STUB.filter((task) => request.shown.has(task.id));

      expect(request.key).toBe(taskLayoutKeyOf(drawn, request.shown, NO_COUNTS));
    });

    it('WHEN the only umbrella is not shown THEN no task has a size', () => {
      const request = requestOf(TASK_CHAIN_STUB, SHOWN_SET, new Map([['web#lint', 10]]), SIZERS);

      expect(request.sizes.size).toBe(0);
    });
  });

  describe('GIVEN the chain api#build, web#build and web#lint by package', () => {
    it.each([
      { name: 'web', expected: ['web#build', 'web#lint'] },
      { name: 'api', expected: ['api#build'] },
      { name: 'docs', expected: [] },
      { name: '__proto__', expected: [] }
    ])('WHEN the tasks of $name are read THEN they are $expected', ({ name, expected }) => {
      const ids = packageTaskIdsOf(TASK_CHAIN_STUB, name);

      expect(ids).toStrictEqual(expected);
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
