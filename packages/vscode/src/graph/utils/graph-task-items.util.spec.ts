import { describe, expect, it } from 'vitest';

import { taskGraphItemsOf } from './graph-task-items.util.ts';
import { GRAPH_TASKS_STUB } from '../test/stubs/graph-model.stub.ts';

describe('FEATURE: the Show Task Graph picker items', () => {
  describe('GIVEN the tasks of a workspace', () => {
    it('WHEN the items are made THEN each has the task name, its package, the root and its id as the value', () => {
      const items = taskGraphItemsOf(GRAPH_TASKS_STUB, '/ws');

      expect(items).toStrictEqual([
        { label: 'build', description: '@org/x', root: '/ws', value: '@org/x#build' },
        { label: 'build', description: 'a', root: '/ws', value: 'a#build' },
        { label: 'build', description: 'web', root: '/ws', value: 'web#build' },
        { label: 'lint', description: 'web', root: '/ws', value: 'web#lint' }
      ]);
    });
  });

  describe('GIVEN no tasks', () => {
    it('WHEN the items are made THEN the list is empty', () => {
      expect(taskGraphItemsOf([], '/ws')).toStrictEqual([]);
    });
  });
});
