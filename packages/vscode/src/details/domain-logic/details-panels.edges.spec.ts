import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailsPanels } from './details-panels.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { flushSettles } from '../../roots/test/utils/deferred-ports.spec.util.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { NO_BINARY_TEXT, POSTED_MAX } from '../common/details.const.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { PanelsDeps } from '../common/panel.type.ts';
import type { HostFakes } from '../test/common/panel-fakes.type.ts';
import { hostMock, viewMock } from '../test/mocks/panel-host.mock.ts';
import { DETAILS_LOADED_STUB } from '../test/stubs/details-model.stub.ts';
import { dryRunCallOf, ensureLoadedOf, lastSentOf, receiveTimes, withoutBinary } from '../test/utils/panels-setup.spec.util.ts';

const WS_A: PanelKey = { root: '/ws', packageName: 'a' };
const READY = { type: 'ready' };
const DISPOSED = 'webview is disposed';

describe('FEATURE: details panel edges', () => {
  let store: RootStore;
  let fakes: HostFakes;
  let deps: PanelsDeps;
  let panels: DetailsPanels;

  beforeEach(() => {
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply('/ws', DETAILS_LOADED_STUB);
    fakes = hostMock();
    deps = { roots: store, runs: new RunStore(), host: fakes.host, setPanelVisible: vi.fn() };
    panels = new DetailsPanels(deps);
  });

  describe('GIVEN a panel whose webview refuses messages', () => {
    it('WHEN a send throws THEN the post does not throw and the error is logged', async () => {
      const failing = viewMock(true, {
        send: () => {
          throw new Error(DISPOSED);
        }
      });

      fakes.queue(failing);
      await panels.open(WS_A);
      await panels.api().whenIdle('/ws', 'a');

      await expect(panels.api().receive('/ws', 'a', READY)).resolves.toBeUndefined();

      expect(fakes.log.mock.calls[0]?.[0]).toContain(DISPOSED);
    });

    it('WHEN a send rejects after dispose THEN the rejection is logged and nothing is left unhandled', async () => {
      const failing = viewMock(true, { send: async () => Promise.reject(new Error(DISPOSED)) });

      fakes.queue(failing);
      await panels.open(WS_A);
      await panels.api().whenIdle('/ws', 'a');

      await panels.api().receive('/ws', 'a', READY);

      await vi.waitFor(() => {
        expect(fakes.log.mock.calls[0]?.[0]).toContain(DISPOSED);
      });
    });
  });

  describe('GIVEN a panel whose session start or messages fail', () => {
    it('WHEN the root load rejects in start THEN the rejection is logged and whenIdle still settles', async () => {
      ensureLoadedOf(store, '/ws').mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('load blew up'));
      await panels.open(WS_A);

      await expect(panels.api().whenIdle('/ws', 'a')).resolves.toBeUndefined();

      expect(fakes.log.mock.calls[0]?.[0]).toContain('load blew up');
    });

    it('WHEN the page posts garbage THEN it is dropped and logged, and nothing throws', async () => {
      await panels.open(WS_A);

      fakes.views[0]?.message(null);

      await vi.waitFor(() => {
        expect(fakes.log.mock.calls[0]?.[0]).toContain('Dropped a webview message');
      });
    });

    it('WHEN the page posts ready THEN the session sends the state', async () => {
      await panels.open(WS_A);
      await panels.api().whenIdle('/ws', 'a');

      fakes.views[0]?.message(READY);

      await vi.waitFor(() => {
        expect(fakes.views[0]?.send).toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN the panel API', () => {
    it('WHEN whenIdle is called right after open THEN it waits for the session start', async () => {
      const started = Promise.withResolvers<undefined>();

      ensureLoadedOf(store, '/ws').mockResolvedValueOnce(undefined).mockReturnValueOnce(started.promise);
      await panels.open(WS_A);
      const settled = vi.fn();

      const idle = panels.api().whenIdle('/ws', 'a').then(settled);

      await flushSettles();

      expect(settled).not.toHaveBeenCalled();

      started.resolve(undefined);
      await idle;

      expect(settled).toHaveBeenCalledOnce();
    });

    it('WHEN more than the cap is posted THEN only the last ones are kept', async () => {
      await panels.open(WS_A);
      await panels.api().whenIdle('/ws', 'a');

      await receiveTimes(panels.api(), READY, POSTED_MAX + 5);

      const posted = panels.api().posted('/ws', 'a');

      expect(posted).toHaveLength(POSTED_MAX);
      expect(posted.at(-1)).toBe(lastSentOf(fakes));
    });

    it('WHEN the panel is disposed THEN its posted messages are gone', async () => {
      const opened = await panels.open(WS_A);

      await panels.api().receive('/ws', 'a', READY);

      fakes.views[0]?.close();

      expect(opened?.posted).toStrictEqual([]);
      expect(panels.api().posted('/ws', 'a')).toStrictEqual([]);
    });

    it('WHEN a panel is not open THEN receive and whenIdle reject and posted is empty', async () => {
      const api = panels.api();

      await expect(api.receive('/ws', 'a', READY)).rejects.toThrow('no open details panel');
      await expect(api.whenIdle('/ws', 'a')).rejects.toThrow('no open details panel');
      expect(api.posted('/ws', 'a')).toStrictEqual([]);
    });
  });

  describe('GIVEN the dry run of a panel', () => {
    it("WHEN it starts THEN it runs with the root's binary for this package only", async () => {
      await panels.open(WS_A);
      await panels.api().whenIdle('/ws', 'a');

      const [binary, request] = dryRunCallOf(fakes);

      expect(binary).toBe(store.get('/ws')?.state.binary);
      expect(request?.packages).toStrictEqual(['a']);
    });

    it('WHEN the root has no binary THEN no dry run spawns and the failure is logged', async () => {
      const bare = new DetailsPanels({ ...deps, roots: withoutBinary(store) });

      await bare.open(WS_A);
      await bare.api().whenIdle('/ws', 'a');

      expect(fakes.dryRun).not.toHaveBeenCalled();
      expect(fakes.log.mock.calls[0]?.[0]).toContain(NO_BINARY_TEXT);
    });
  });
});
