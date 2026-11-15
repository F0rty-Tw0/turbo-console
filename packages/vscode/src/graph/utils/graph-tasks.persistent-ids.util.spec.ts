import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { persistentIdsOf } from './graph-tasks.util.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';

const packageOf = (name: string, tasks: TaskNode[]): PackageNode => {
  const node: PackageNode = { ...PACKAGE_NODE_STUB, name, tasks };

  return node;
};

const taskNamed = (id: string, isPersistent: boolean): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id, name: id.slice(id.indexOf('#') + 1), persistent: isPersistent };

  return task;
};

describe('FEATURE: persistent ids of a model', () => {
  describe('GIVEN web#dev persistent and web#build not', () => {
    it('WHEN taken THEN only web#dev', () => {
      const web = packageOf('web', [taskNamed('web#build', false), taskNamed('web#dev', true)]);
      const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [web] };

      const ids = persistentIdsOf(model);

      expect([...ids]).toStrictEqual(['web#dev']);
    });
  });

  describe('GIVEN a persistent root task //#dev', () => {
    it('WHEN taken THEN //#dev is among them', () => {
      const root = packageOf('//', [taskNamed('//#dev', true)]);
      const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [root] };

      const ids = persistentIdsOf(model);

      expect([...ids]).toStrictEqual(['//#dev']);
    });
  });

  describe('GIVEN a persistent atom file', () => {
    it('WHEN taken THEN it is not listed', () => {
      const persistentFile = taskNamed('web#f', true);
      const file: TaskNode = { ...persistentFile, kind: 'atom-file' };
      const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [packageOf('web', [file])] };

      const ids = persistentIdsOf(model);

      expect(ids.size).toBe(0);
    });
  });
});
