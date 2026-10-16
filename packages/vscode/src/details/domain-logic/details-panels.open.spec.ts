import { TurboException } from '@turbo-console/core';
import type { CachedWorkspace } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailsPanels } from './details-panels.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { RootsSession } from '../../roots/domain-logic/roots-session.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { sessionPortsWith } from '../../roots/test/utils/session-ports.spec.util.ts';
import { NOT_PACKAGE_TEXT } from '../../run/common/picker.const.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { HostFakes } from '../test/common/panel-fakes.type.ts';
import { hostMock } from '../test/mocks/panel-host.mock.ts';
import { A_PACKAGE_STUB, DETAILS_LOADED_STUB, DETAILS_MODEL_STUB } from '../test/stubs/details-model.stub.ts';
import { A_MANIFEST, deferEnsureLoaded } from '../test/utils/panels-setup.spec.util.ts';

const WS_A: PanelKey = { root: '/ws', packageName: 'a' };
const GONE: PanelKey = { root: '/ws', packageName: 'gone' };
const NO_ROOT: PanelKey = { root: '/nope', packageName: 'a' };
const NO_PACKAGES = { ...DETAILS_MODEL_STUB, packages: [] };
const EMPTY_LOADED = { ...DETAILS_LOADED_STUB, model: NO_PACKAGES };
const ODD_NAME = 'a\nb‮c';
const ODD_KEY: PanelKey = { root: '/ws', packageName: ODD_NAME };
const ODD_PACKAGE = { ...A_PACKAGE_STUB, name: ODD_NAME };
const ODD_MODEL = { ...DETAILS_MODEL_STUB, packages: [ODD_PACKAGE] };
const ODD_LOADED = { ...DETAILS_LOADED_STUB, model: ODD_MODEL };
const BINARY_GONE = new TurboException('not-found', 'no turbo');
const DETAILS_CACHE: CachedWorkspace = { model: DETAILS_MODEL_STUB, isFresh: true };

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

    it('WHEN its root is removed and added back before the load resolves THEN no panel is built and no message shows', async () => {
      const loaded = deferEnsureLoaded(store, '/ws');
      const opening = panels.open(WS_A);

      store.set([], coordinatorMock);
      store.set([ROOT_FOLDER_STUB], coordinatorMock);
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

  describe('GIVEN a root whose reload failed to find the binary and kept its model', () => {
    let roots: RootsSession;

    beforeEach(async () => {
      const resolve = vi.fn().mockResolvedValueOnce(TURBO_BINARY_STUB).mockRejectedValue(BINARY_GONE);
      const readCached = vi.fn().mockResolvedValue(DETAILS_CACHE);

      roots = new RootsSession(sessionPortsWith({ resolve, readCached }));
      roots.setRoots([ROOT_FOLDER_STUB]);
      roots.setVisible(true);
      await roots.whenIdle('/ws');
      roots.setVisible(false);
      roots.request('refresh');
      await roots.whenIdle('/ws');
      panels = new DetailsPanels({ roots: roots.store, runs: new RunStore(), host: fakes.host, setPanelVisible: vi.fn() });
    });

    afterEach(() => {
      roots.dispose();
    });

    it('WHEN a package panel opens THEN exactly one more full load runs', async () => {
      await panels.open(WS_A);
      await panels.api().whenIdle('/ws', 'a');

      const modes = roots.loads.get('/ws')?.map((record) => record.mode);

      expect(modes).toStrictEqual(['cache-first', 'full', 'full']);
    });

    it('WHEN its manifest opens a panel THEN exactly one more full load runs', async () => {
      await panels.openFile(A_MANIFEST);
      await panels.api().whenIdle('/ws', 'a');

      const modes = roots.loads.get('/ws')?.map((record) => record.mode);

      expect(modes).toStrictEqual(['cache-first', 'full', 'full']);
    });
  });

  it('GIVEN a key whose root is not in the store WHEN it opens THEN no panel is built and no message shows', async () => {
    const opened = await panels.open(NO_ROOT);

    expect(opened).toBeNull();
    expect(fakes.open).not.toHaveBeenCalled();
    expect(fakes.info).not.toHaveBeenCalled();
  });

  describe('GIVEN a package name with a line break and a bidi control', () => {
    it('WHEN its panel opens THEN the title is the cleaned name', async () => {
      store.apply('/ws', ODD_LOADED);

      await panels.open(ODD_KEY);

      expect(fakes.open).toHaveBeenCalledExactlyOnceWith('Package Details: a bc');
    });
  });
});
