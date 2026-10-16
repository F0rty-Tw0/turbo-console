import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { DetailsPanels } from './details-panels.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import { NOT_PACKAGE_TEXT } from '../../run/common/picker.const.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { binaryMessageOf } from '../../tree/utils/root-rows.util.ts';
import { OPEN_FAILED_TEXT } from '../common/details.const.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { PanelsDeps } from '../common/panel.type.ts';
import type { HostFakes } from '../test/common/panel-fakes.type.ts';
import { hostMock, viewMock } from '../test/mocks/panel-host.mock.ts';
import { DETAILS_LOADED_STUB, DETAILS_MODEL_STUB } from '../test/stubs/details-model.stub.ts';
import { A_MANIFEST, BARE_FOLDER, OTHER_FOLDER, deferEnsureLoaded } from '../test/utils/panels-setup.spec.util.ts';

const WS_A: PanelKey = { root: '/ws', packageName: 'a' };
const OTHER_A: PanelKey = { root: '/other', packageName: 'a' };
const WS_WEB: PanelKey = { root: '/ws', packageName: 'web' };
const GONE: PanelKey = { root: '/ws', packageName: 'gone' };
const NO_PACKAGES = { ...DETAILS_MODEL_STUB, packages: [] };
const EMPTY_LOADED = { ...DETAILS_LOADED_STUB, model: NO_PACKAGES };

describe('FEATURE: details panel registry', () => {
  let store: RootStore;
  let fakes: HostFakes;
  let setPanelVisible: Mock<PanelsDeps['setPanelVisible']>;
  let panels: DetailsPanels;

  beforeEach(() => {
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB, OTHER_FOLDER, BARE_FOLDER], coordinatorMock);
    store.apply('/ws', DETAILS_LOADED_STUB);
    store.apply('/other', DETAILS_LOADED_STUB);
    fakes = hostMock();
    setPanelVisible = vi.fn<PanelsDeps['setPanelVisible']>();
    panels = new DetailsPanels({ roots: store, runs: new RunStore(), host: fakes.host, setPanelVisible });
  });

  describe('GIVEN a loaded root', () => {
    it('WHEN a package opens THEN one shown panel exists for it, titled with the package name', async () => {
      await panels.open(WS_A);

      expect(fakes.open).toHaveBeenCalledExactlyOnceWith('Package Details: a');
      expect(panels.api().panels()).toStrictEqual([{ ...WS_A, visible: true }]);
    });

    it('WHEN an open package opens again THEN its tab is revealed and no second panel is created', async () => {
      const first = await panels.open(WS_A);

      const second = await panels.open(WS_A);

      expect(second).toBe(first);
      expect(fakes.open).toHaveBeenCalledOnce();
      expect(fakes.views[0]?.reveal).toHaveBeenCalledOnce();
    });

    it('WHEN the same package name opens in two roots THEN there are two panels (Review Focus 3)', async () => {
      const first = await panels.open(WS_A);

      const second = await panels.open(OTHER_A);

      expect(second).not.toBe(first);
      expect(fakes.open).toHaveBeenCalledTimes(2);
      expect(panels.api().panels()).toHaveLength(2);
    });

    it('WHEN a panel is created THEN its id for the root session is root + NUL + package name', async () => {
      await panels.open(WS_A);

      expect(setPanelVisible).toHaveBeenCalledExactlyOnceWith('/ws', '/ws\0a', true);
    });
  });

  describe('GIVEN an open still waiting for the root to load', () => {
    it('WHEN a second open of the same key arrives THEN one panel is created and both resolve to it', async () => {
      const loaded = deferEnsureLoaded(store, '/ws');
      const first = panels.open(WS_A);
      const second = panels.open(WS_A);

      loaded.resolve(undefined);
      const opened = await Promise.all([first, second]);

      expect(fakes.open).toHaveBeenCalledOnce();
      expect(opened[0]).not.toBeNull();
      expect(opened[1]).toBe(opened[0]);
    });

    it('WHEN the root leaves the workspace before the load resolves THEN no panel is created', async () => {
      const loaded = deferEnsureLoaded(store, '/ws');
      const opening = panels.open(WS_A);

      store.set([OTHER_FOLDER], coordinatorMock);
      loaded.resolve(undefined);

      await expect(opening).resolves.toBeNull();
      expect(fakes.open).not.toHaveBeenCalled();
    });

    it('WHEN the package leaves the model before the load resolves THEN no panel is created', async () => {
      const loaded = deferEnsureLoaded(store, '/ws');
      const opening = panels.open(WS_A);

      store.apply('/ws', EMPTY_LOADED);
      loaded.resolve(undefined);

      await expect(opening).resolves.toBeNull();
      expect(fakes.open).not.toHaveBeenCalled();
    });

    it('WHEN the package is not in the model at all THEN no panel is created', async () => {
      const opened = await panels.open(GONE);

      expect(opened).toBeNull();
      expect(fakes.open).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a file to open', () => {
    it('WHEN it is the manifest of a package THEN that package opens', async () => {
      const opened = await panels.openFile(A_MANIFEST);

      expect(opened?.key).toStrictEqual(WS_A);
      expect(fakes.info).not.toHaveBeenCalled();
    });

    it('WHEN there is no file (palette with no argument) THEN nothing opens and the refusal text shows', async () => {
      const opened = await panels.openFile(null);

      expect(opened).toBeNull();
      expect(fakes.open).not.toHaveBeenCalled();
      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
    });

    it('WHEN the file is no package manifest THEN nothing opens and the refusal text shows', async () => {
      const opened = await panels.openFile('/ws/packages/none/package.json');

      expect(opened).toBeNull();
      expect(fakes.open).not.toHaveBeenCalled();
      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
    });

    it('WHEN the root kept its model through a binary error THEN the panel opens and no refusal shows', async () => {
      store.apply('/ws', LOAD_FAILURE_STUB);

      const opened = await panels.openFile(A_MANIFEST);

      expect(opened?.key).toStrictEqual(WS_A);
      expect(fakes.info).not.toHaveBeenCalled();
    });

    it('WHEN the root is in a binary error with no model THEN nothing opens and the binary text shows', async () => {
      store.apply('/bare', LOAD_FAILURE_STUB);

      const opened = await panels.openFile(`${BARE_FOLDER.root}/packages/a/package.json`);

      expect(opened).toBeNull();
      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(MESSAGE_TEXTS[binaryMessageOf(LOAD_FAILURE_STUB.error.kind)]);
    });

    it('WHEN the root has no model THEN nothing opens and the refusal text shows', async () => {
      const opened = await panels.openFile(`${BARE_FOLDER.root}/packages/a/package.json`);

      expect(opened).toBeNull();
      expect(fakes.open).not.toHaveBeenCalled();
      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
    });

    it('WHEN the file is in no workspace folder THEN nothing opens and the refusal text shows', async () => {
      const opened = await panels.openFile('/elsewhere/packages/a/package.json');

      expect(opened).toBeNull();
      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(NOT_PACKAGE_TEXT);
    });
  });

  describe('GIVEN a shown panel that reported shown', () => {
    const hiddenReports = (): unknown[] => setPanelVisible.mock.calls.filter((call) => !call[2]);

    beforeEach(async () => {
      await panels.open(WS_A);
    });

    it('WHEN the user closes the tab THEN it reports hidden exactly once and leaves the registry', () => {
      fakes.views[0]?.close();
      fakes.views[0]?.close();

      expect(hiddenReports()).toHaveLength(1);
      expect(panels.api().panels()).toStrictEqual([]);
    });

    it('WHEN its root leaves the workspace THEN pruning reports hidden exactly once and disposes the tab', () => {
      store.set([OTHER_FOLDER], coordinatorMock);

      panels.pruneRoots();

      expect(hiddenReports()).toHaveLength(1);
      expect(fakes.views[0]?.dispose).toHaveBeenCalled();
      expect(panels.api().panels()).toStrictEqual([]);
    });

    it('WHEN the registry is disposed THEN every panel reports hidden once and closes', async () => {
      await panels.open(OTHER_A);

      panels.dispose();

      expect(hiddenReports()).toHaveLength(2);
      expect(panels.api().panels()).toStrictEqual([]);
    });
  });

  describe('GIVEN a panel that fails while it is built', () => {
    it('WHEN a listener throws after it reported shown THEN it reports hidden once and the half-made panel is disposed', async () => {
      const failing = viewMock(true, {
        onViewState: () => {
          throw new Error('listener failed');
        }
      });

      fakes.queue(failing);

      const opened = await panels.open(WS_A);

      expect(opened).toBeNull();
      expect(setPanelVisible.mock.calls.map((call) => call[2])).toStrictEqual([true, false]);
      expect(failing.dispose).toHaveBeenCalled();
      expect(panels.api().panels()).toStrictEqual([]);
    });

    it('WHEN the page cannot be built THEN no panel is made, the detail is logged and an error shows', async () => {
      fakes.open.mockImplementationOnce(() => {
        throw new Error('unfilled webview slot: {{scriptUri}}');
      });

      const opened = await panels.open(WS_A);

      expect(opened).toBeNull();
      expect(fakes.log.mock.calls[0]?.[0]).toContain('unfilled webview slot');
      expect(fakes.error).toHaveBeenCalledExactlyOnceWith(OPEN_FAILED_TEXT);
      expect(setPanelVisible).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN panels in two roots', () => {
    it('WHEN one root leaves the workspace THEN pruning disposes its panels only', async () => {
      await panels.open(WS_A);
      await panels.open(OTHER_A);
      await panels.open(WS_WEB);
      store.set([ROOT_FOLDER_STUB], coordinatorMock);

      panels.pruneRoots();

      const api = panels.api();
      const open = api.panels();
      const roots = open.map((info) => info.root);

      expect(roots).toStrictEqual(['/ws', '/ws']);
    });
  });
});
