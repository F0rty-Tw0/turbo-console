import { describe, expect, it } from 'vitest';

import { currentTaskOf } from './current-task.util.ts';
import { TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';

describe('FEATURE: current task of a model', () => {
  describe('GIVEN the stub model whose package a holds the build task', () => {
    it('WHEN package and task exist THEN the task is returned', () => {
      const task = currentTaskOf(WORKSPACE_MODEL_STUB, 'a', 'build');

      expect(task).toBe(TASK_NODE_STUB);
    });

    it('WHEN the package is gone THEN nothing is returned', () => {
      const task = currentTaskOf(WORKSPACE_MODEL_STUB, 'gone', 'build');

      expect(task).toBeUndefined();
    });

    it('WHEN the task is gone THEN nothing is returned', () => {
      const task = currentTaskOf(WORKSPACE_MODEL_STUB, 'a', 'gone');

      expect(task).toBeUndefined();
    });
  });
});
