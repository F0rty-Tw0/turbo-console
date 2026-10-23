import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphTask } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphTasksOf, runsMapOf } from './graph-tasks.util.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';

const P_BUILD: TaskNode = { ...TASK_NODE_STUB, id: 'p#build', dependencies: ['p#dev', 'p#f'] };
const P_DEV: TaskNode = { ...TASK_NODE_STUB, id: 'p#dev', name: 'dev', command: 'vite', isTurboTask: false };
const P_BLANK: TaskNode = { ...TASK_NODE_STUB, id: 'p#blank', name: 'blank', command: null, isTurboTask: false };
const P_FILE: TaskNode = { ...TASK_NODE_STUB, id: 'p#f', name: 'f', kind: 'atom-file' };
const P_TASKS: TaskNode[] = [P_BUILD, P_DEV, P_BLANK, P_FILE];

const packageOf = (name: string, tasks: TaskNode[]): PackageNode => {
  const node: PackageNode = { ...PACKAGE_NODE_STUB, name, tasks };

  return node;
};

const modelOf = (...packages: PackageNode[]): WorkspaceModel => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages };

  return model;
};

const idsOf = (tasks: GraphTask[]): string[] => tasks.map((task) => task.id);

const runOf = (root: string, taskId: string, state: RunEntry['state']): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, root, taskId, state };

  return entry;
};

const lookupOf = (...entries: RunEntry[]): RunLookup => {
  const byKey = new Map(entries.map((entry) => [`${entry.root}\0${entry.taskId}`, entry]));

  return (root, taskId) => byKey.get(`${root}\0${taskId}`);
};

const ROOT = '/ws';
const A_BUILD: GraphTask = {
  id: 'a#build',
  packageName: 'a',
  name: 'build',
  command: 'tsc',
  isRunnable: true,
  dependencies: []
};
const LISTED: GraphTask[] = [A_BUILD];

describe('FEATURE: graph task list', () => {
  describe('GIVEN a package with a turbo task, two scripts and an atom-file task', () => {
    const tasks = graphTasksOf(modelOf(packageOf('p', P_TASKS)));

    it('THEN the ids are sorted and the atom-file task is absent', () => {
      expect(idsOf(tasks)).toStrictEqual(['p#blank', 'p#build', 'p#dev']);
    });

    it('THEN a script with a body is runnable', () => {
      expect(tasks.find((task) => task.id === 'p#dev')).toMatchObject({ command: 'vite', isRunnable: true });
    });

    it('THEN a script without a body is listed but not runnable', () => {
      expect(tasks.find((task) => task.id === 'p#blank')).toMatchObject({ command: null, isRunnable: false });
    });

    it('THEN the dependencies keep the listed ids only', () => {
      expect(tasks.find((task) => task.id === 'p#build')?.dependencies).toStrictEqual(['p#dev']);
    });
  });

  describe('GIVEN two packages whose ids are in reverse order', () => {
    it('WHEN the list is built THEN it is sorted by id', () => {
      const z = packageOf('z', [{ ...TASK_NODE_STUB, id: 'z#build' }]);
      const a = packageOf('a', [{ ...TASK_NODE_STUB, id: 'a#build' }]);

      const tasks = graphTasksOf(modelOf(z, a));

      expect(idsOf(tasks)).toStrictEqual(['a#build', 'z#build']);
    });
  });

  describe('GIVEN a task whose dependencies are in reverse order', () => {
    it('WHEN the list is built THEN the dependencies are sorted', () => {
      const build: TaskNode = { ...TASK_NODE_STUB, id: 'p#build', dependencies: ['p#z', 'p#a'] };
      const a: TaskNode = { ...TASK_NODE_STUB, id: 'p#a', name: 'a' };
      const z: TaskNode = { ...TASK_NODE_STUB, id: 'p#z', name: 'z' };

      const tasks = graphTasksOf(modelOf(packageOf('p', [build, a, z])));

      expect(tasks.find((task) => task.id === 'p#build')?.dependencies).toStrictEqual(['p#a', 'p#z']);
    });
  });

  describe('GIVEN a dependency that names an id of no package', () => {
    it('WHEN the list is built THEN it is dropped', () => {
      const build: TaskNode = { ...TASK_NODE_STUB, id: 'p#build', dependencies: ['gone#build'] };

      const tasks = graphTasksOf(modelOf(packageOf('p', [build])));

      expect(tasks[0]?.dependencies).toStrictEqual([]);
    });
  });
});

describe('FEATURE: graph runs map', () => {
  describe('GIVEN a run of a listed task under the root', () => {
    it('WHEN the map is built THEN it holds that state by id', () => {
      const get = lookupOf(runOf(ROOT, 'a#build', 'running'));

      const runs = runsMapOf(ROOT, LISTED, get);

      expect(runs).toStrictEqual({ 'a#build': 'running' });
    });
  });

  describe('GIVEN a run of the same id under another root', () => {
    it('WHEN the map is built THEN it is empty', () => {
      const get = lookupOf(runOf('/other', 'a#build', 'running'));

      const runs = runsMapOf(ROOT, LISTED, get);

      expect(runs).toStrictEqual({});
    });
  });

  describe('GIVEN a run of an id that is not listed', () => {
    it('WHEN the map is built THEN it is absent', () => {
      const get = lookupOf(runOf(ROOT, 'gone#build', 'running'));

      const runs = runsMapOf(ROOT, LISTED, get);

      expect(runs).toStrictEqual({});
    });
  });

  describe('GIVEN no runs', () => {
    it('WHEN the map is built THEN it is empty', () => {
      const runs = runsMapOf(ROOT, LISTED, lookupOf());

      expect(runs).toStrictEqual({});
    });
  });
});
