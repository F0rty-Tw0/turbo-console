import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphTask } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphListingOf, graphTasksOf, runsMapOf } from './graph-tasks.util.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import {
  ATOM_AGGREGATE_TASK_STUB,
  ATOM_E2E_PACKAGE_STUB,
  ATOM_FILE_A_TASK_STUB,
  ATOM_FILE_B_TASK_STUB,
  ATOM_UMBRELLA_TASK_STUB,
  GRAPH_ATOM_MODEL_STUB
} from '../test/stubs/graph-atom-model.stub.ts';
import { smokeGroupTasksOf } from '../test/utils/graph-model.spec.util.ts';

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
const LISTED: string[] = [A_BUILD.id];
const UMBRELLA_ID = ATOM_UMBRELLA_TASK_STUB.id;
const FILE_A = ATOM_FILE_A_TASK_STUB.id;
const FILE_B = ATOM_FILE_B_TASK_STUB.id;
const SMOKE_TASKS = smokeGroupTasksOf('@fx/a');
const [SMOKE_UMBRELLA] = SMOKE_TASKS;

const taskNamed = (tasks: GraphTask[], id: string): GraphTask | undefined => tasks.find((task) => task.id === id);

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

describe('FEATURE: graph listing of atom groups', () => {
  describe('GIVEN a model with one Atomizer group', () => {
    const listing = graphListingOf(GRAPH_ATOM_MODEL_STUB);

    it('WHEN listed THEN the aggregate and files are absent and the umbrella is', () => {
      expect(idsOf(listing.tasks)).toStrictEqual(['//#all-e2e', '@fx/app#build', UMBRELLA_ID]);
    });

    it('WHEN listed THEN the umbrella depends on what its files depend on, never on itself', () => {
      expect(taskNamed(listing.tasks, UMBRELLA_ID)?.dependencies).toStrictEqual(['@fx/app#build']);
    });

    it('WHEN a task depends on the hidden aggregate THEN it depends on the umbrella', () => {
      expect(taskNamed(listing.tasks, '//#all-e2e')?.dependencies).toStrictEqual([UMBRELLA_ID]);
    });

    it('WHEN listed THEN atomGroups holds the group, files in specPath order', () => {
      const files = [
        { id: FILE_A, specPath: 'tests/a.spec.ts', isLive: false },
        { id: FILE_B, specPath: 'tests/b fails.spec.ts', isLive: true }
      ];

      expect(listing.atomGroups).toStrictEqual([{ umbrellaId: UMBRELLA_ID, files }]);
    });

    it('WHEN graphTasksOf is asked THEN it is the listing tasks', () => {
      expect(graphTasksOf(GRAPH_ATOM_MODEL_STUB)).toStrictEqual(listing.tasks);
    });
  });

  describe('GIVEN an umbrella with no file tasks', () => {
    const pkg = packageOf('@fx/e2e', [ATOM_UMBRELLA_TASK_STUB, ATOM_AGGREGATE_TASK_STUB]);
    const listing = graphListingOf(modelOf(pkg));

    it('WHEN listed THEN its aggregate stays listed', () => {
      expect(idsOf(listing.tasks)).toStrictEqual([UMBRELLA_ID, ATOM_AGGREGATE_TASK_STUB.id]);
    });

    it('WHEN listed THEN atomGroups is empty', () => {
      expect(listing.atomGroups).toStrictEqual([]);
    });
  });

  describe('GIVEN two groups in two packages', () => {
    it('WHEN listed THEN atomGroups is sorted by umbrella id', () => {
      const smoke = packageOf('@fx/a', SMOKE_TASKS);

      const listing = graphListingOf(modelOf(ATOM_E2E_PACKAGE_STUB, smoke));

      expect(listing.atomGroups.map((group) => group.umbrellaId)).toStrictEqual([SMOKE_UMBRELLA.id, UMBRELLA_ID]);
    });
  });

  describe('GIVEN two groups in one package, each with its own aggregate', () => {
    const [umbrella, file] = smokeGroupTasksOf(ATOM_E2E_PACKAGE_STUB.name);
    const smokeAggregate: TaskNode = {
      ...TASK_NODE_STUB,
      id: `${ATOM_E2E_PACKAGE_STUB.name}#smoke--all`,
      name: 'smoke--all',
      kind: 'atom-aggregate',
      atom: umbrella.atom,
      dependencies: [file.id]
    };
    const smokeUmbrella: TaskNode = { ...umbrella, dependencies: [smokeAggregate.id] };
    const tasks = [...ATOM_E2E_PACKAGE_STUB.tasks, smokeUmbrella, file, smokeAggregate];
    const listing = graphListingOf(modelOf(packageOf(ATOM_E2E_PACKAGE_STUB.name, tasks)));

    it('WHEN listed THEN both aggregates are absent and both umbrellas are', () => {
      expect(idsOf(listing.tasks)).toStrictEqual([UMBRELLA_ID, smokeUmbrella.id]);
    });

    it('WHEN listed THEN the second umbrella folds only its own aggregate', () => {
      expect(taskNamed(listing.tasks, smokeUmbrella.id)?.dependencies).toStrictEqual([]);
    });
  });

  describe('GIVEN a file that depends on an outside task which depends on another file of the group', () => {
    const fileG: TaskNode = { ...ATOM_FILE_A_TASK_STUB, dependencies: [] };
    const outside: TaskNode = { ...TASK_NODE_STUB, id: '@fx/app#serve', name: 'serve', dependencies: [fileG.id] };
    const fileF: TaskNode = { ...ATOM_FILE_B_TASK_STUB, dependencies: [outside.id] };
    const e2e = packageOf(ATOM_E2E_PACKAGE_STUB.name, [ATOM_UMBRELLA_TASK_STUB, ATOM_AGGREGATE_TASK_STUB, fileG, fileF]);
    const listing = graphListingOf(modelOf(e2e, packageOf('@fx/app', [outside])));

    it('WHEN listed THEN the umbrella depends on the outside task only', () => {
      expect(taskNamed(listing.tasks, UMBRELLA_ID)?.dependencies).toStrictEqual([outside.id]);
    });

    it('WHEN listed THEN the outside task depends on the umbrella only', () => {
      expect(taskNamed(listing.tasks, outside.id)?.dependencies).toStrictEqual([UMBRELLA_ID]);
    });
  });
});

describe('FEATURE: graph runs map', () => {
  describe('GIVEN a run of a file of a listed group', () => {
    it('WHEN the map is built over the run ids THEN it holds that state by file id', () => {
      const get = lookupOf(runOf(ROOT, FILE_A, 'passed'));

      const runs = runsMapOf(ROOT, [...LISTED, FILE_A], get);

      expect(runs).toStrictEqual({ [FILE_A]: 'passed' });
    });
  });

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

  describe('GIVEN runs of the same id under two roots', () => {
    it('WHEN the map is built for /other THEN it holds the /other state only', () => {
      const get = lookupOf(runOf(ROOT, 'a#build', 'running'), runOf('/other', 'a#build', 'failed'));

      const runs = runsMapOf('/other', LISTED, get);

      expect(runs).toStrictEqual({ 'a#build': 'failed' });
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
