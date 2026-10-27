import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphHostMessage } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { showTaskGraph } from './show-task-graph.ts';
import type { Coordinator, Roots } from '../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { LOADED_MODEL_STUB } from '../../roots/test/stubs/root.stub.ts';
import { viewMock } from '../../shared/test/mocks/panel-view.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { GraphOpener, OpenGraphPanel, RootPickPorts } from '../common/graph-panel.type.ts';
import { GRAPH_ATOM_MODEL_STUB } from '../test/stubs/graph-atom-model.stub.ts';
import { GRAPH_LOADED_STUB, GRAPH_MODEL_STUB } from '../test/stubs/graph-model.stub.ts';

const OTHER_FOLDER = { root: '/other', name: 'other' };
const OPEN_FAILED_TEXT = 'Could not open the Package Graph. See Output.';
const PLACEHOLDER = 'Choose tasks to show';
const ROOT_BUILD_TASK: TaskNode = { ...TASK_NODE_STUB, id: '//#build', name: 'build' };
const ROOT_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '', label: 'single-app', tasks: [ROOT_BUILD_TASK] };
const SINGLE_PACKAGE_MODEL: WorkspaceModel = { ...GRAPH_MODEL_STUB, singlePackage: true, packages: [ROOT_PACKAGE] };
const TASK_ITEMS = [
  { label: 'build', description: '@org/x', root: '/ws', value: '@org/x#build' },
  { label: 'build', description: 'a', root: '/ws', value: 'a#build' },
  { label: 'build', description: 'web', root: '/ws', value: 'web#build' },
  { label: 'lint', description: 'web', root: '/ws', value: 'web#lint' }
];
const TASK_ROW = { kind: 'task', root: '/other', key: 'web#build', packageName: 'web' };

type Fixture = {
  readonly ports: RootPickPorts;
  readonly pickMany: Mock<RootPickPorts['pickMany']>;
  readonly panels: Pick<GraphOpener, 'open'>;
  readonly open: Mock<GraphOpener['open']>;
  readonly show: Mock<OpenGraphPanel['session']['show']>;
  readonly coordinators: Map<string, Coordinator>;
  readonly store: RootStore;
};

const portsOf = (pickMany: Mock<RootPickPorts['pickMany']>): RootPickPorts => {
  const ports: RootPickPorts = {
    activeFile: () => '/ws/package.json',
    rootOf: () => '/ws',
    pick: vi.fn(),
    pickMany,
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn()
  };

  return ports;
};

const panelOf = (show: Mock<OpenGraphPanel['session']['show']>): OpenGraphPanel => {
  const session: OpenGraphPanel['session'] = { receive: vi.fn(), show, dispose: vi.fn() };
  const { view } = viewMock<GraphHostMessage>(true);
  const panel: OpenGraphPanel = { root: '/ws', view, session, posted: [] };

  return panel;
};

const fixtureOf = (): Fixture => {
  const store = new RootStore();
  const coordinators = new Map<string, Coordinator>();
  const make = (folder: RootFolder): Coordinator => {
    const coordinator = coordinatorMock();

    coordinators.set(folder.root, coordinator);

    return coordinator;
  };
  const pickMany = vi.fn<RootPickPorts['pickMany']>().mockResolvedValue(undefined);
  const show = vi.fn<OpenGraphPanel['session']['show']>();
  const open = vi.fn<GraphOpener['open']>().mockReturnValue(panelOf(show));

  store.set([ROOT_FOLDER_STUB, OTHER_FOLDER], make);
  store.apply('/ws', GRAPH_LOADED_STUB);
  store.apply('/other', GRAPH_LOADED_STUB);

  const panels: Fixture['panels'] = { open };
  const fixture: Fixture = { ports: portsOf(pickMany), pickMany, panels, open, show, coordinators, store };

  return fixture;
};

const runWith = async (arg: unknown, fixture: Fixture, roots: Roots = fixture.store): Promise<void> => {
  const { ports, panels } = fixture;

  await showTaskGraph(arg, { roots, ports, panels });
};

const throwingOpen = (): never => {
  throw new Error('ENOENT: index.html');
};

describe('FEATURE: the Show Task Graph command', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = fixtureOf();
  });

  describe('GIVEN no argument', () => {
    it('WHEN the picks are web#build and a#build THEN the panel session gets them', async () => {
      fixture.pickMany.mockResolvedValue(['web#build', 'a#build']);

      await runWith(undefined, fixture);

      expect(fixture.show).toHaveBeenCalledExactlyOnceWith({ type: 'showTasks', taskIds: ['web#build', 'a#build'] });
    });

    it('WHEN the picks are made THEN the panel opens for the active root', async () => {
      fixture.pickMany.mockResolvedValue(['web#build']);

      await runWith(undefined, fixture);

      expect(fixture.open).toHaveBeenCalledExactlyOnceWith('/ws');
    });

    it('WHEN the picker is shown THEN it lists every task with the placeholder, after the root loaded', async () => {
      await runWith(undefined, fixture);

      expect(fixture.pickMany).toHaveBeenCalledExactlyOnceWith(TASK_ITEMS, PLACEHOLDER);
      expect(fixture.coordinators.get('/ws')?.ensureLoaded).toHaveBeenCalledOnce();
    });

    it('WHEN the model holds an atom group THEN the picker has the umbrella and no aggregate or file item', async () => {
      fixture.store.apply('/ws', { ...LOADED_MODEL_STUB, model: GRAPH_ATOM_MODEL_STUB });

      await runWith(undefined, fixture);

      const items = fixture.pickMany.mock.calls[0]?.[0] ?? [];

      expect(items.map((item) => item.value)).toStrictEqual(['//#all-e2e', '@fx/app#build', '@fx/e2e#e2e-ci']);
    });

    it('WHEN the user cancels THEN nothing opens', async () => {
      await runWith(undefined, fixture);

      expect(fixture.open).not.toHaveBeenCalled();
    });

    it('WHEN the user picks nothing THEN nothing opens', async () => {
      fixture.pickMany.mockResolvedValue([]);

      await runWith(undefined, fixture);

      expect(fixture.open).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a task row', () => {
    it('WHEN the command runs THEN the picker is skipped and that row opens on its own root', async () => {
      await runWith(TASK_ROW, fixture);

      expect(fixture.pickMany).not.toHaveBeenCalled();
      expect(fixture.open).toHaveBeenCalledExactlyOnceWith('/other');
      expect(fixture.show).toHaveBeenCalledExactlyOnceWith({ type: 'showTasks', taskIds: ['web#build'] });
    });
  });

  describe('GIVEN a single-package root', () => {
    beforeEach(() => {
      fixture.store.apply('/ws', { ...GRAPH_LOADED_STUB, model: SINGLE_PACKAGE_MODEL });
    });

    it('WHEN the command runs THEN the picker lists the tasks with the label and no info is shown', async () => {
      await runWith(undefined, fixture);

      expect(fixture.pickMany).toHaveBeenCalledWith(
        [{ label: 'build', description: 'single-app', root: '/ws', value: '//#build' }],
        PLACEHOLDER
      );
      expect(fixture.ports.info).not.toHaveBeenCalled();
    });

    it('WHEN the command runs from a // task row THEN the panel opens on that task', async () => {
      await runWith({ ...TASK_ROW, root: '/ws', key: '//#build', packageName: '//' }, fixture);

      expect(fixture.open).toHaveBeenCalledExactlyOnceWith('/ws');
      expect(fixture.show).toHaveBeenCalledExactlyOnceWith({ type: 'showTasks', taskIds: ['//#build'] });
    });
  });

  describe('GIVEN a task row whose root has no model', () => {
    it('WHEN the command runs THEN the panel opens on that task', async () => {
      const failed = new RootStore();

      failed.set([ROOT_FOLDER_STUB], () => coordinatorMock());

      await runWith({ ...TASK_ROW, root: '/ws' }, fixture, failed);

      expect(fixture.open).toHaveBeenCalledExactlyOnceWith('/ws');
      expect(fixture.show).toHaveBeenCalledExactlyOnceWith({ type: 'showTasks', taskIds: ['web#build'] });
    });
  });

  describe('GIVEN a root that has no model after loading', () => {
    it('WHEN the command runs THEN the panel opens for its error screen and no request is made', async () => {
      const failed = new RootStore();

      failed.set([ROOT_FOLDER_STUB], () => coordinatorMock());

      await runWith(undefined, fixture, failed);

      expect(fixture.open).toHaveBeenCalledExactlyOnceWith('/ws');
      expect(fixture.pickMany).not.toHaveBeenCalled();
      expect(fixture.show).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN no root resolves', () => {
    it('WHEN the command runs THEN nothing is asked and nothing opens', async () => {
      const empty = new RootStore();

      await runWith(undefined, fixture, empty);

      expect(fixture.ports.info).toHaveBeenCalledOnce();
      expect(fixture.pickMany).not.toHaveBeenCalled();
      expect(fixture.open).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the store has no panel for the root', () => {
    it('WHEN the picks are made THEN no request is made and nothing throws', async () => {
      fixture.pickMany.mockResolvedValue(['web#build']);
      fixture.open.mockReturnValue(null);

      await runWith(undefined, fixture);

      expect(fixture.show).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a panel that cannot be opened', () => {
    beforeEach(() => {
      fixture.pickMany.mockResolvedValue(['web#build']);
      fixture.open.mockImplementation(throwingOpen);
    });

    it('WHEN the command runs THEN the failure is logged and the user is told to see Output', async () => {
      await runWith(undefined, fixture);

      expect(fixture.ports.log).toHaveBeenCalledExactlyOnceWith('ENOENT: index.html');
      expect(fixture.ports.error).toHaveBeenCalledExactlyOnceWith(OPEN_FAILED_TEXT);
    });

    it('WHEN the command runs THEN it resolves', async () => {
      await expect(runWith(undefined, fixture)).resolves.toBeUndefined();
    });
  });
});
