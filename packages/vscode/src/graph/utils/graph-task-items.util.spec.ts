import { ROOT_TASKS_TITLE } from '@turbo-console/webview-ui';
import type { GraphTask } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { taskGraphItemsOf } from './graph-task-items.util.ts';
import { GRAPH_TASKS_STUB } from '../test/stubs/graph-model.stub.ts';

describe('FEATURE: the Show Task Graph picker items', () => {
  describe('GIVEN the tasks of a workspace', () => {
    it('WHEN the items are made THEN each has the task name, its package, the root and its id as the value', () => {
      const items = taskGraphItemsOf(GRAPH_TASKS_STUB, '/ws', null);

      expect(items).toStrictEqual([
        { label: 'build', description: '@org/x', root: '/ws', value: '@org/x#build' },
        { label: 'build', description: 'a', root: '/ws', value: 'a#build' },
        { label: 'build', description: 'web', root: '/ws', value: 'web#build' },
        { label: 'lint', description: 'web', root: '/ws', value: 'web#lint' }
      ]);
    });
  });

  describe('GIVEN a single-package root label', () => {
    it('WHEN the items are made THEN every description is the label', () => {
      const items = taskGraphItemsOf(GRAPH_TASKS_STUB, '/ws', 'single-app');

      expect(items.map((item) => item.description)).toStrictEqual(['single-app', 'single-app', 'single-app', 'single-app']);
    });
  });

  describe('GIVEN a task of the root package //', () => {
    const ROOT_GEN: GraphTask = {
      id: '//#gen',
      packageName: '//',
      name: 'gen',
      command: 'gen',
      isRunnable: true,
      isTurboTask: true,
      dependencies: []
    };

    it('WHEN the items are made THEN the description is the root title', () => {
      const [item] = taskGraphItemsOf([ROOT_GEN], '/ws', null);

      expect(item?.description).toBe(ROOT_TASKS_TITLE);
    });

    it('WHEN the root has a single-package label THEN the description keeps the label', () => {
      const [item] = taskGraphItemsOf([ROOT_GEN], '/ws', 'My repo');

      expect(item?.description).toBe('My repo');
    });
  });

  describe('GIVEN no tasks', () => {
    it('WHEN the items are made THEN the list is empty', () => {
      expect(taskGraphItemsOf([], '/ws', null)).toStrictEqual([]);
    });
  });
});
