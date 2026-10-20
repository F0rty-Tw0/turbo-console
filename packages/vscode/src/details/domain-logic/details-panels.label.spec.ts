import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailsPanels } from './details-panels.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { HostFakes, ViewFake } from '../test/common/panel-fakes.type.ts';
import { hostMock } from '../test/mocks/panel-host.mock.ts';
import { A_PACKAGE_STUB, DETAILS_LOADED_STUB, DETAILS_MODEL_STUB } from '../test/stubs/details-model.stub.ts';

const ROOT_KEY: PanelKey = { root: '/ws', packageName: '//' };

const loadedRoot = (label: string | null): typeof DETAILS_LOADED_STUB => {
  const root = { ...A_PACKAGE_STUB, name: '//', path: '', label };
  const model = { ...DETAILS_MODEL_STUB, singlePackage: true, packages: [root] };
  const loaded = { ...DETAILS_LOADED_STUB, model };

  return loaded;
};

describe('FEATURE: details panel title from the package label', () => {
  let store: RootStore;
  let fakes: HostFakes;
  let panels: DetailsPanels;

  beforeEach(() => {
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply('/ws', DETAILS_LOADED_STUB);
    fakes = hostMock();
    panels = new DetailsPanels({
      roots: store,
      runs: new RunStore(),
      scripts: scriptsToggleMock(),
      host: fakes.host,
      setPanelVisible: vi.fn()
    });
  });

  describe('GIVEN the single-package // node with a label', () => {
    it('WHEN its panel opens THEN the tab reads the label while the panel stays keyed by //', async () => {
      store.apply('/ws', loadedRoot('single-app'));

      await panels.open(ROOT_KEY);

      expect(fakes.open).toHaveBeenCalledExactlyOnceWith('Package Details: single-app');
      expect(panels.api().panels()).toStrictEqual([{ ...ROOT_KEY, visible: true }]);
    });

    it('WHEN the label is scoped THEN the title keeps the full text', async () => {
      store.apply('/ws', loadedRoot('@acme/app'));

      await panels.open(ROOT_KEY);

      expect(fakes.open).toHaveBeenCalledExactlyOnceWith('Package Details: @acme/app');
    });

    it('WHEN the label holds a line break and a bidi control THEN the title is the cleaned label', async () => {
      store.apply('/ws', loadedRoot('a\nb\u202ec'));

      await panels.open(ROOT_KEY);

      expect(fakes.open).toHaveBeenCalledExactlyOnceWith('Package Details: a bc');
    });
  });

  describe('GIVEN the root manifest of a single-package root', () => {
    it('WHEN Package Details opens from the editor THEN the // panel opens with the label title', async () => {
      store.apply('/ws', loadedRoot('single-app'));

      await panels.openFile('/ws/package.json');

      expect(fakes.open).toHaveBeenCalledExactlyOnceWith('Package Details: single-app');
      expect(panels.api().panels()).toStrictEqual([{ ...ROOT_KEY, visible: true }]);
    });
  });

  describe('GIVEN an open // panel whose model changes', () => {
    const viewOf = (): ViewFake => {
      const [view] = fakes.views;

      if (view === undefined) throw new Error('no panel was opened');

      return view;
    };

    beforeEach(async () => {
      store.apply('/ws', loadedRoot('single-app'));
      await panels.open(ROOT_KEY);
    });

    it('WHEN the label is renamed THEN the tab title follows', () => {
      store.apply('/ws', loadedRoot('renamed-app'));

      expect(viewOf().setTitle).toHaveBeenLastCalledWith('Package Details: renamed-app');
    });

    it('WHEN the // package leaves the model THEN the tab keeps the last label', () => {
      store.apply('/ws', DETAILS_LOADED_STUB);

      expect(viewOf().setTitle).toHaveBeenLastCalledWith('Package Details: single-app');
    });

    it('WHEN the // package leaves the model THEN the posted state is missing with the last label', () => {
      const view = viewOf();

      view.message({ type: 'ready' });
      store.apply('/ws', DETAILS_LOADED_STUB);

      const missing = { kind: 'missing', root: '/ws', packageName: ROOT_KEY.packageName, label: 'single-app' };

      expect(view.send).toHaveBeenLastCalledWith({ type: 'state', state: missing });
    });
  });

  describe('GIVEN a monorepo package (label null)', () => {
    it('WHEN its panel opens THEN the title is unchanged', async () => {
      await panels.open({ root: '/ws', packageName: 'a' });

      expect(fakes.open).toHaveBeenCalledExactlyOnceWith('Package Details: a');
    });
  });
});
