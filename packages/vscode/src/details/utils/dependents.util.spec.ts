import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { dependentsOf } from './dependents.util.ts';
import {
  A_PACKAGE_STUB,
  DETAILS_MODEL_STUB,
  FILE_TASK_STUB,
  TEST_TASK_STUB,
  WEB_PACKAGE_STUB
} from '../test/stubs/details-model.stub.ts';

describe('FEATURE: task dependents', () => {
  describe('GIVEN a model whose tasks depend on each other across packages', () => {
    it('WHEN inverted THEN a task lists the tasks that depend on it, sorted', () => {
      const dependents = dependentsOf(DETAILS_MODEL_STUB);

      expect(dependents.get('a#build')).toStrictEqual(['a#test', 'web#build']);
    });

    it('WHEN inverted THEN a task nothing depends on has no entry', () => {
      const dependents = dependentsOf(DETAILS_MODEL_STUB);

      expect(dependents.has('web#build')).toBe(false);
    });

    it('WHEN inverted THEN a chain lists only its direct dependents', () => {
      const dependents = dependentsOf(DETAILS_MODEL_STUB);

      expect(dependents.get('a#test')).toStrictEqual(['a#check']);
    });
  });

  describe('GIVEN packages listed in reverse order', () => {
    it('WHEN inverted THEN the ids are still sorted', () => {
      const model: WorkspaceModel = { ...DETAILS_MODEL_STUB, packages: [WEB_PACKAGE_STUB, A_PACKAGE_STUB] };

      const dependents = dependentsOf(model);

      expect(dependents.get('a#build')).toStrictEqual(['a#test', 'web#build']);
    });
  });

  describe('GIVEN an atom-file task that depends on another task', () => {
    it('WHEN inverted THEN the file task is not a dependent, since no card shows it', () => {
      const dependents = dependentsOf(DETAILS_MODEL_STUB);

      expect(dependents.get('a#build')).not.toContain(FILE_TASK_STUB.id);
    });
  });

  describe('GIVEN a task with a dependency that is not in the model', () => {
    it('WHEN inverted THEN the dependency still lists the task', () => {
      const orphan: TaskNode = { ...TEST_TASK_STUB, id: 'b#test', dependencies: ['gone#build'] };
      const pkg: PackageNode = { ...A_PACKAGE_STUB, tasks: [orphan] };
      const model: WorkspaceModel = { ...DETAILS_MODEL_STUB, packages: [pkg] };

      const dependents = dependentsOf(model);

      expect(dependents.get('gone#build')).toStrictEqual(['b#test']);
    });
  });

  describe('GIVEN a model with no packages', () => {
    it('WHEN inverted THEN the map is empty', () => {
      const model: WorkspaceModel = { ...DETAILS_MODEL_STUB, packages: [] };

      const dependents = dependentsOf(model);

      expect(dependents.size).toBe(0);
    });
  });
});
