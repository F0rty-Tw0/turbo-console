import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailsPanels } from './details-panels.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { NOT_PACKAGE_TEXT } from '../../run/common/picker.const.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { HostFakes } from '../test/common/panel-fakes.type.ts';
import { hostMock } from '../test/mocks/panel-host.mock.ts';
import { A_PACKAGE_STUB, DETAILS_LOADED_STUB, DETAILS_MODEL_STUB } from '../test/stubs/details-model.stub.ts';
import { deferEnsureLoaded } from '../test/utils/panels-setup.spec.util.ts';

const WS_A: PanelKey = { root: '/ws', packageName: 'a' };
const GONE: PanelKey = { root: '/ws', packageName: 'gone' };
const NO_PACKAGES = { ...DETAILS_MODEL_STUB, packages: [] };
const EMPTY_LOADED = { ...DETAILS_LOADED_STUB, model: NO_PACKAGES };
const ODD_NAME = 'a\nb‮c';
const ODD_KEY: PanelKey = { root: '/ws', packageName: ODD_NAME };
const ODD_PACKAGE = { ...A_PACKAGE_STUB, name: ODD_NAME };
const ODD_MODEL = { ...DETAILS_MODEL_STUB, packages: [ODD_PACKAGE] };
const ODD_LOADED = { ...DETAILS_LOADED_STUB, model: ODD_MODEL };

describe('FEATURE: opening a details panel', () => {
  let store: RootStore;
  let fakes: HostFakes;
  let panels: DetailsPanels;

  beforeEach(() => {
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply('/ws', DETAILS_LOADED_STUB);
    fakes = hostMock();
    panels = new DetailsPanels({ roots: store, runs: new RunStore(), host: fakes.host, setPanelVisible: vi.fn() });
  });

  describe('GIVEN an open still waiting for the root to load', () => {
    it('WHEN a second open of the same key arrives THEN the tab is revealed once', async () => {
      const loaded = deferEnsureLoaded(store, '/ws');
      const first = panels.open(WS_A);
      const second = panels.open(WS_A);

      loaded.resolve(undefined);
      await Promise.all([first, second]);

      expect(fakes.views[0]?.reveal).toHaveBeenCalledOnce();
    });

    it('WHEN the registry is disposed before the load resolves THEN no panel is built and no message shows', async () => {
      const loaded = deferEnsureLoaded(store, '/ws');
      const opening = panels.open(WS_A);

      panels.dispose();
      loaded.resolve(undefined);

      await expect(opening).resolves.toBeNull();
      expect(fakes.open).not.toHaveBeenCalled();
      expect(fakes.info).not.toHaveBeenCalled();
    });

    it('WHEN its root is removed before the load resolves THEN no panel is built and no message shows', async () => {
      const loaded = deferEnsureLoaded(store, '/ws');
      const opening = panels.open(WS_A);

      store.set([], coordinatorMock);
      loaded.resolve(undefined);

      await expect(opening).resolves.toBeNull();
      expect(fakes.open).not.toHaveBeenCalled();
      expect(fakes.info).not.toHaveBeenCalled();
    });

    it('WHEN the reload drops the package before the load resolves THEN no panel is built and the refusal text shows', async () => {
      const loaded = deferEnsureLoaded(store, '/ws');
      const opening = panels.open(WS_A);

      store.apply('/ws', EMPTY_LOADED);
      loaded.resolve(undefined);

      await expect(opening).resolves.toBeNull();
      expect(fakes.open).not.toHaveBeenCalled();
      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
    });
  });

  describe('GIVEN a key that was opened before', () => {
    it('WHEN its panel was closed and it opens again THEN a second view is created', async () => {
      await panels.open(WS_A);
      fakes.views[0]?.close();

      const reopened = await panels.open(WS_A);

      expect(reopened).not.toBeNull();
      expect(fakes.open).toHaveBeenCalledTimes(2);
    });

    it('WHEN its open was refused and the package then appears THEN the next open succeeds', async () => {
      store.apply('/ws', EMPTY_LOADED);
      await panels.open(WS_A);
      store.apply('/ws', DETAILS_LOADED_STUB);

      const reopened = await panels.open(WS_A);

      expect(reopened).not.toBeNull();
      expect(fakes.open).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a package that is no longer in the model', () => {
    it('WHEN its row opens THEN no panel is made and the refusal text shows', async () => {
      const opened = await panels.open(GONE);

      expect(opened).toBeNull();
      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
    });
  });

  describe('GIVEN a package name with a line break and a bidi control', () => {
    it('WHEN its panel opens THEN the title is the cleaned name', async () => {
      store.apply('/ws', ODD_LOADED);

      await panels.open(ODD_KEY);

      expect(fakes.open).toHaveBeenCalledExactlyOnceWith('Package Details: a bc');
    });
  });
});
