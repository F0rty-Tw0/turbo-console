import type { PackageNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphHostMessage } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { showPackageModules } from './show-package-modules.ts';
import type { Coordinator } from '../../roots/common/coordinator.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { viewMock } from '../../shared/test/mocks/panel-view.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { GraphOpener, OpenGraphPanel, RootPickPorts, ShowTaskGraphDeps } from '../common/graph-panel.type.ts';
import { GRAPH_OPEN_FAILED_TEXT, MODULES_PICK_PLACEHOLDER } from '../common/graph.const.ts';
import { GRAPH_LOADED_STUB, GRAPH_MODEL_STUB } from '../test/stubs/graph-model.stub.ts';

const PACKAGE_ROW = { kind: 'pkg', root: '/ws', packageName: 'web' };
const ROOT_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '' };
const SINGLE_PACKAGE_MODEL: WorkspaceModel = { ...GRAPH_MODEL_STUB, singlePackage: true, packages: [ROOT_PACKAGE] };
const PACKAGE_ITEMS = [
  { label: 'web', description: 'apps/web', root: '/ws', value: 'web' },
  { label: 'a', description: 'packages/a', root: '/ws', value: 'a' },
  { label: '@org/x', description: 'packages/libs/x', root: '/ws', value: '@org/x' }
];

type Fixture = {
  readonly deps: ShowTaskGraphDeps;
  readonly store: RootStore;
  readonly ensureLoaded: Mock<Coordinator['ensureLoaded']>;
  readonly pickOne: Mock<RootPickPorts['pickOne']>;
  readonly open: Mock<GraphOpener['open']>;
  readonly show: Mock<OpenGraphPanel['session']['show']>;
};

const panelOf = (show: Mock<OpenGraphPanel['session']['show']>): OpenGraphPanel => {
  const session: OpenGraphPanel['session'] = { receive: vi.fn(), show, dispose: vi.fn() };
  const { view } = viewMock<GraphHostMessage>(true);
  const panel: OpenGraphPanel = { root: '/ws', view, session, posted: [] };

  return panel;
};

const portsOf = (pickOne: Mock<RootPickPorts['pickOne']>): RootPickPorts => {
  const ports: RootPickPorts = {
    activeFile: () => '/ws/package.json',
    rootOf: () => '/ws',
    pick: vi.fn(),
    pickMany: vi.fn(),
    pickOne,
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    scriptsShown: () => false
  };

  return ports;
};

const fixtureOf = (): Fixture => {
  const store = new RootStore();
  const ensureLoaded = vi.fn<Coordinator['ensureLoaded']>().mockResolvedValue(undefined);
  const base = coordinatorMock();
  const coordinator: Coordinator = { ...base, ensureLoaded };
  const make = (): Coordinator => coordinator;
  const pickOne = vi.fn<RootPickPorts['pickOne']>().mockResolvedValue(undefined);
  const show = vi.fn<OpenGraphPanel['session']['show']>();
  const open = vi.fn<GraphOpener['open']>().mockReturnValue(panelOf(show));

  store.set([ROOT_FOLDER_STUB], make);
  store.apply('/ws', GRAPH_LOADED_STUB);

  const panels: ShowTaskGraphDeps['panels'] = { open };
  const deps: ShowTaskGraphDeps = { roots: store, ports: portsOf(pickOne), panels };
  const fixture: Fixture = { deps, store, ensureLoaded, pickOne, open, show };

  return fixture;
};

const throwingOpen = (): never => {
  throw new Error('ENOENT: index.html');
};

describe('FEATURE: the Show Package Modules command', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = fixtureOf();
  });

  describe('GIVEN a package row', () => {
    it('WHEN a package row runs it THEN that root opens and showModules names the package', async () => {
      await showPackageModules(PACKAGE_ROW, fixture.deps);

      expect(fixture.open).toHaveBeenCalledExactlyOnceWith('/ws');
      expect(fixture.show).toHaveBeenCalledExactlyOnceWith({ type: 'showModules', name: 'web' });
      expect(fixture.pickOne).not.toHaveBeenCalled();
    });

    it('WHEN the panel cannot be opened THEN the error is logged and the user told to see Output', async () => {
      fixture.open.mockImplementation(throwingOpen);

      await showPackageModules(PACKAGE_ROW, fixture.deps);

      expect(fixture.deps.ports.log).toHaveBeenCalledExactlyOnceWith('ENOENT: index.html');
      expect(fixture.deps.ports.error).toHaveBeenCalledExactlyOnceWith(GRAPH_OPEN_FAILED_TEXT);
    });
  });

  describe('GIVEN the palette on a root of three packages', () => {
    it('WHEN it runs THEN the pick lists every package in model order with its path beside it', async () => {
      await showPackageModules(undefined, fixture.deps);

      expect(fixture.pickOne).toHaveBeenCalledExactlyOnceWith(PACKAGE_ITEMS, MODULES_PICK_PLACEHOLDER);
    });

    it('WHEN a is picked THEN showModules names a', async () => {
      fixture.pickOne.mockResolvedValue('a');

      await showPackageModules(undefined, fixture.deps);

      expect(fixture.show).toHaveBeenCalledExactlyOnceWith({ type: 'showModules', name: 'a' });
    });

    it('WHEN it runs THEN the root is loaded before the pick', async () => {
      await showPackageModules(undefined, fixture.deps);

      const [loadedAt] = fixture.ensureLoaded.mock.invocationCallOrder;
      const [pickedAt] = fixture.pickOne.mock.invocationCallOrder;

      expect(loadedAt).toBeLessThan(pickedAt ?? 0);
    });

    it('WHEN the pick is cancelled THEN nothing opens', async () => {
      await showPackageModules(undefined, fixture.deps);

      expect(fixture.open).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the palette on a single-package root', () => {
    it('WHEN it runs THEN nothing is asked and showModules names //', async () => {
      fixture.store.apply('/ws', { ...GRAPH_LOADED_STUB, model: SINGLE_PACKAGE_MODEL });

      await showPackageModules(undefined, fixture.deps);

      expect(fixture.pickOne).not.toHaveBeenCalled();
      expect(fixture.show).toHaveBeenCalledExactlyOnceWith({ type: 'showModules', name: '//' });
    });
  });
});
