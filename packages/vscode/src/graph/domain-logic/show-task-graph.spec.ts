import type { WorkspaceModel } from '@turbo-console/core';
import type { GraphHostMessage } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { showTaskGraph } from './show-task-graph.ts';
import type { Coordinator, Roots } from '../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { viewMock } from '../../shared/test/mocks/panel-view.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphOpener, OpenGraphPanel, RootPickPorts } from '../common/graph-panel.type.ts';
import { GRAPH_LOADED_STUB, GRAPH_MODEL_STUB } from '../test/stubs/graph-model.stub.ts';

const OTHER_FOLDER = { root: '/other', name: 'other' };
const SINGLE_PACKAGE_TEXT = 'This is a single-package repo, so there is no task graph';
const OPEN_FAILED_TEXT = 'Could not open the Package Graph. See Output.';
const PLACEHOLDER = 'Choose tasks to show';
const SINGLE_PACKAGE_MODEL: WorkspaceModel = { ...GRAPH_MODEL_STUB, singlePackage: true };
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
  readonly showTasks: Mock<OpenGraphPanel['session']['showTasks']>;
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
    log: vi.fn()
  };

  return ports;
};

const panelOf = (showTasks: Mock<OpenGraphPanel['session']['showTasks']>): OpenGraphPanel => {
  const session: OpenGraphPanel['session'] = { receive: vi.fn(), showTasks, dispose: vi.fn() };
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
  const showTasks = vi.fn<OpenGraphPanel['session']['showTasks']>();
  const open = vi.fn<GraphOpener['open']>().mockReturnValue(panelOf(showTasks));

  store.set([ROOT_FOLDER_STUB, OTHER_FOLDER], make);
  store.apply('/ws', GRAPH_LOADED_STUB);
  store.apply('/other', GRAPH_LOADED_STUB);

  const panels: Fixture['panels'] = { open };
  const fixture: Fixture = { ports: portsOf(pickMany), pickMany, panels, open, showTasks, coordinators, store };

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

      expect(fixture.showTasks).toHaveBeenCalledExactlyOnceWith(['web#build', 'a#build']);
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
      expect(fixture.showTasks).toHaveBeenCalledExactlyOnceWith(['web#build']);
    });
  });

  describe('GIVEN a single-package root', () => {
    beforeEach(() => {
      fixture.store.apply('/ws', { ...GRAPH_LOADED_STUB, model: SINGLE_PACKAGE_MODEL });
    });

    it('WHEN the command runs THEN the user is told and nothing opens', async () => {
      await runWith(undefined, fixture);

      expect(fixture.ports.info).toHaveBeenCalledExactlyOnceWith(SINGLE_PACKAGE_TEXT);
      expect(fixture.pickMany).not.toHaveBeenCalled();
      expect(fixture.open).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a root that has no model after loading', () => {
    it('WHEN the command runs THEN the panel opens for its error screen and no request is made', async () => {
      const failed = new RootStore();

      failed.set([ROOT_FOLDER_STUB], () => coordinatorMock());

      await runWith(undefined, fixture, failed);

      expect(fixture.open).toHaveBeenCalledExactlyOnceWith('/ws');
      expect(fixture.pickMany).not.toHaveBeenCalled();
      expect(fixture.showTasks).not.toHaveBeenCalled();
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

      expect(fixture.showTasks).not.toHaveBeenCalled();
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
