import { describe, expect, it } from 'vitest';

import { currentTaskOf } from './current-task.util.ts';
import { BUILD_TASK_STUB, DETAILS_MODEL_STUB } from '../test/stubs/details-model.stub.ts';

describe('FEATURE: the current node of a task', () => {
  describe('GIVEN a model that holds the package and the task', () => {
    it('WHEN asked THEN the node is returned', () => {
      expect(currentTaskOf(DETAILS_MODEL_STUB, 'a', 'a#build')).toBe(BUILD_TASK_STUB);
    });
  });

  describe('GIVEN a task, a package or a model that is gone', () => {
    it.each([
      ['task', DETAILS_MODEL_STUB, 'a', 'a#gone'],
      ['package', DETAILS_MODEL_STUB, 'gone', 'a#build'],
      ['model', null, 'a', 'a#build']
    ])('WHEN the %s is gone THEN there is no node', (_name, model, packageName, taskId) => {
      expect(currentTaskOf(model, packageName, taskId)).toBeUndefined();
    });
  });
});
