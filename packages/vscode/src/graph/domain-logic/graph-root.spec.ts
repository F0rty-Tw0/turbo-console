import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { graphRootOf } from './graph-root.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { RootPickPorts } from '../common/graph-panel.type.ts';
import { GRAPH_LOADED_STUB } from '../test/stubs/graph-model.stub.ts';

const OTHER_FOLDER = { root: '/other', name: 'other' };
const NO_ROOT_TEXT = 'Turbo Console: no Turborepo workspace found';

type PortSpies = {
  readonly ports: RootPickPorts;
  readonly pick: Mock<RootPickPorts['pick']>;
  readonly info: Mock<RootPickPorts['info']>;
};

const portsMock = (activeFile: string | null, rootOf: string | null, picked: string | undefined): PortSpies => {
  const pick = vi.fn<RootPickPorts['pick']>().mockResolvedValue(picked);
  const info = vi.fn<RootPickPorts['info']>();
  const ports: RootPickPorts = { activeFile: () => activeFile, rootOf: () => rootOf, pick, info, error: vi.fn(), log: vi.fn() };
  const spies: PortSpies = { ports, pick, info };

  return spies;
};

describe('FEATURE: the root the graph opens for', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
  });

  describe('GIVEN two roots', () => {
    beforeEach(() => {
      store.set([ROOT_FOLDER_STUB, OTHER_FOLDER], () => coordinatorMock());
      store.apply('/ws', GRAPH_LOADED_STUB);
    });

    it('WHEN the active file is in a root THEN that root is used and nothing is asked', async () => {
      const spies = portsMock('/ws/a/package.json', '/ws', undefined);

      const root = await graphRootOf(store, spies.ports);

      expect(root).toBe('/ws');
      expect(spies.pick).not.toHaveBeenCalled();
      expect(spies.info).not.toHaveBeenCalled();
    });

    it('WHEN the active file is in a folder with no store entry THEN the user picks from both folders', async () => {
      const spies = portsMock('/bare/package.json', '/bare', '/other');

      const root = await graphRootOf(store, spies.ports);

      expect(root).toBe('/other');
      expect(spies.pick).toHaveBeenCalledExactlyOnceWith([ROOT_FOLDER_STUB, OTHER_FOLDER]);
    });

    it('WHEN there is no active file and the user picks a folder THEN that root is used', async () => {
      const spies = portsMock(null, null, '/other');

      const root = await graphRootOf(store, spies.ports);

      expect(root).toBe('/other');
    });

    it('WHEN the user cancels the pick THEN there is no root and no message', async () => {
      const spies = portsMock(null, null, undefined);

      const root = await graphRootOf(store, spies.ports);

      expect(root).toBeNull();
      expect(spies.info).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN one root', () => {
    it('WHEN the active file is outside every root THEN the only root is used and nothing is picked', async () => {
      store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
      const spies = portsMock('/elsewhere/package.json', null, undefined);

      const root = await graphRootOf(store, spies.ports);

      expect(root).toBe('/ws');
      expect(spies.pick).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN no roots', () => {
    it('WHEN the graph is asked for THEN there is no root and the user is told once', async () => {
      const spies = portsMock(null, null, undefined);

      const root = await graphRootOf(store, spies.ports);

      expect(root).toBeNull();
      expect(spies.info).toHaveBeenCalledExactlyOnceWith(NO_ROOT_TEXT);
    });
  });
});
