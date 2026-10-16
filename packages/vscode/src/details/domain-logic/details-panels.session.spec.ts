import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailsPanels } from './details-panels.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { HostFakes } from '../test/common/panel-fakes.type.ts';
import { hostMock, viewMock } from '../test/mocks/panel-host.mock.ts';
import { DETAILS_LOADED_STUB } from '../test/stubs/details-model.stub.ts';
import { markStale } from '../test/utils/panels-setup.spec.util.ts';

const WS_A: PanelKey = { root: '/ws', packageName: 'a' };
const RUN_BUILD = { type: 'run', taskId: 'a#build' };
const BUILD_ROW = { kind: 'task', root: '/ws', key: 'a#build', packageName: 'a' };

describe('FEATURE: the editor effects of a details panel session', () => {
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

  describe('GIVEN a started panel', () => {
    beforeEach(async () => {
      await panels.open(WS_A);
      await panels.api().whenIdle('/ws', 'a');
    });

    it('WHEN the page runs one of its tasks THEN the editor runs that task of this root and package', async () => {
      await panels.api().receive('/ws', 'a', RUN_BUILD);

      expect(fakes.execute).toHaveBeenCalledExactlyOnceWith('turboConsole.runTask', BUILD_ROW);
    });

    it('WHEN the root is in a binary error and the page runs a task THEN the editor shows the binary text and runs nothing', async () => {
      store.apply('/ws', LOAD_FAILURE_STUB);

      await panels.api().receive('/ws', 'a', RUN_BUILD);

      expect(fakes.info).toHaveBeenCalledExactlyOnceWith(MESSAGE_TEXTS['binary-not-found']);
      expect(fakes.execute).not.toHaveBeenCalled();
    });

    it('WHEN handling a page message throws THEN the error is logged and nothing is left unhandled', async () => {
      store.apply('/ws', LOAD_FAILURE_STUB);
      fakes.info.mockImplementation(() => {
        throw new Error('info failed');
      });

      fakes.views[0]?.message(RUN_BUILD);

      await vi.waitFor(() => {
        expect(fakes.log.mock.calls[0]?.[0]).toContain('info failed');
      });
    });
  });

  describe('GIVEN a hidden panel whose root has a skipped reload pending', () => {
    beforeEach(async () => {
      fakes.queue(viewMock(false));
      await panels.open(WS_A);
      await panels.api().whenIdle('/ws', 'a');
      markStale(store, '/ws');
    });

    it('WHEN it is shown THEN no dry run starts', async () => {
      fakes.views[0]?.show(true);
      await panels.api().whenIdle('/ws', 'a');

      expect(fakes.dryRun).not.toHaveBeenCalled();
    });

    it('WHEN it is shown and the root then reports a store event THEN the deferred dry run starts', async () => {
      fakes.views[0]?.show(true);

      store.apply('/ws', DETAILS_LOADED_STUB);
      await panels.api().whenIdle('/ws', 'a');

      expect(fakes.dryRun).toHaveBeenCalledOnce();
    });
  });
});
