import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphHostMessage } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { showAllTaskGraphs } from './show-all-task-graphs.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { viewMock } from '../../shared/test/mocks/panel-view.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { GraphOpener, OpenGraphPanel, RootPickPorts, ShowTaskGraphDeps } from '../common/graph-panel.type.ts';
import { GRAPH_LOADED_STUB, GRAPH_MODEL_STUB } from '../test/stubs/graph-model.stub.ts';
import { taskGraphItemsOf } from '../utils/graph-task-items.util.ts';
import { graphTasksOf } from '../utils/graph-tasks.util.ts';

const ROOT = '/ws';
const PICK_TASKS = 'Pick tasks…';
const SHOW_ALL_301 = 'Show all 301';
const WARNING_301 = 'This workspace has 301 tasks. Drawing more than 300 can be slow.';
const SINGLE_PACKAGE_TEXT = 'This is a single-package repo, so there is no task graph';

type Fixture = {
  readonly deps: ShowTaskGraphDeps;
  readonly store: RootStore;
  readonly warn: Mock<RootPickPorts['warn']>;
  readonly pickMany: Mock<RootPickPorts['pickMany']>;
  readonly info: Mock<RootPickPorts['info']>;
  readonly open: Mock<GraphOpener['open']>;
  readonly show: Mock<OpenGraphPanel['session']['show']>;
};

const modelOf = (count: number): WorkspaceModel => {
  const taskOf = (index: number): TaskNode => {
    const task: TaskNode = { ...TASK_NODE_STUB, id: `p#t${index}`, name: `t${index}` };

    return task;
  };
  const tasks = Array.from({ length: count }, (_, index) => taskOf(index));
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name: 'p', path: 'packages/p', tasks };
  const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [pkg], edges: [] };

  return model;
};

const panelOf = (show: Mock<OpenGraphPanel['session']['show']>): OpenGraphPanel => {
  const session: OpenGraphPanel['session'] = { receive: vi.fn(), show, dispose: vi.fn() };
  const { view } = viewMock<GraphHostMessage>(true);
  const panel: OpenGraphPanel = { root: ROOT, view, session, posted: [] };

  return panel;
};

const fixtureOf = (): Fixture => {
  const store = new RootStore();
  const warn = vi.fn<RootPickPorts['warn']>().mockResolvedValue(undefined);
  const pickMany = vi.fn<RootPickPorts['pickMany']>().mockResolvedValue(undefined);
  const info = vi.fn<RootPickPorts['info']>();
  const show = vi.fn<OpenGraphPanel['session']['show']>();
  const open = vi.fn<GraphOpener['open']>().mockReturnValue(panelOf(show));
  const ports: RootPickPorts = {
    activeFile: () => '/ws/package.json',
    rootOf: () => ROOT,
    pick: vi.fn(),
    pickMany,
    info,
    error: vi.fn(),
    warn,
    log: vi.fn()
  };
  const panels: ShowTaskGraphDeps['panels'] = { open };
  const deps: ShowTaskGraphDeps = { roots: store, ports, panels };

  store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
  store.apply(ROOT, GRAPH_LOADED_STUB);

  const fixture: Fixture = { deps, store, warn, pickMany, info, open, show };

  return fixture;
};

const withTasks = (fixture: Fixture, count: number): void => {
  fixture.store.apply(ROOT, { ...GRAPH_LOADED_STUB, model: modelOf(count) });
};

const idsOf = (count: number): string[] => Array.from({ length: count }, (_, index) => `p#t${index}`).toSorted();

describe('FEATURE: the Show All Task Graphs command', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = fixtureOf();
  });

  describe('GIVEN a model', () => {
    it('WHEN the command runs THEN the ids shown equal the picker item values, in order', async () => {
      const items = taskGraphItemsOf(graphTasksOf(GRAPH_MODEL_STUB), ROOT);
      const values = items.map((item) => item.value);

      await showAllTaskGraphs(fixture.deps);

      expect(fixture.open).toHaveBeenCalledExactlyOnceWith(ROOT);
      expect(fixture.show).toHaveBeenCalledExactlyOnceWith({ type: 'showTasks', taskIds: values });
      expect(values).toStrictEqual(['@org/x#build', 'a#build', 'web#build', 'web#lint']);
    });
  });

  describe('GIVEN 300 tasks', () => {
    it('WHEN the command runs THEN there is no warning and all 300 ids are shown', async () => {
      withTasks(fixture, 300);

      await showAllTaskGraphs(fixture.deps);

      expect(fixture.warn).not.toHaveBeenCalled();
      expect(fixture.show).toHaveBeenCalledExactlyOnceWith({ type: 'showTasks', taskIds: idsOf(300) });
    });
  });

  describe('GIVEN 301 tasks', () => {
    beforeEach(() => {
      withTasks(fixture, 301);
    });

    it('WHEN the command runs THEN the warning has the text and both buttons', async () => {
      await showAllTaskGraphs(fixture.deps);

      expect(fixture.warn).toHaveBeenCalledExactlyOnceWith(WARNING_301, [SHOW_ALL_301, PICK_TASKS]);
    });

    it('WHEN the answer is Show all 301 THEN all 301 ids are shown and nothing is picked', async () => {
      fixture.warn.mockResolvedValue(SHOW_ALL_301);

      await showAllTaskGraphs(fixture.deps);

      expect(fixture.show).toHaveBeenCalledExactlyOnceWith({ type: 'showTasks', taskIds: idsOf(301) });
      expect(fixture.pickMany).not.toHaveBeenCalled();
    });

    it('WHEN the warning is dismissed THEN nothing opens', async () => {
      fixture.warn.mockResolvedValue(undefined);

      await showAllTaskGraphs(fixture.deps);

      expect(fixture.open).not.toHaveBeenCalled();
      expect(fixture.pickMany).not.toHaveBeenCalled();
    });

    it('WHEN the answer is Pick tasks… THEN the picker opens with the same items and its picks are shown', async () => {
      const items = taskGraphItemsOf(graphTasksOf(modelOf(301)), ROOT);

      fixture.warn.mockResolvedValue(PICK_TASKS);
      fixture.pickMany.mockResolvedValue(['p#t5']);

      await showAllTaskGraphs(fixture.deps);

      expect(fixture.pickMany).toHaveBeenCalledExactlyOnceWith(items, 'Choose tasks to show');
      expect(fixture.show).toHaveBeenCalledExactlyOnceWith({ type: 'showTasks', taskIds: ['p#t5'] });
    });

    it('WHEN the answer is Pick tasks… and the picker is cancelled THEN nothing opens', async () => {
      fixture.warn.mockResolvedValue(PICK_TASKS);

      await showAllTaskGraphs(fixture.deps);

      expect(fixture.open).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a single-package root', () => {
    it('WHEN the command runs THEN the user is told and nothing opens', async () => {
      const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, singlePackage: true };

      fixture.store.apply(ROOT, { ...GRAPH_LOADED_STUB, model });

      await showAllTaskGraphs(fixture.deps);

      expect(fixture.info).toHaveBeenCalledExactlyOnceWith(SINGLE_PACKAGE_TEXT);
      expect(fixture.open).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a root with no model', () => {
    it('WHEN the command runs THEN the panel opens alone', async () => {
      const failed = new RootStore();

      failed.set([ROOT_FOLDER_STUB], () => coordinatorMock());

      await showAllTaskGraphs({ ...fixture.deps, roots: failed });

      expect(fixture.open).toHaveBeenCalledExactlyOnceWith(ROOT);
      expect(fixture.show).not.toHaveBeenCalled();
    });
  });
});
