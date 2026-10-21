import type { GraphHostMessage } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { GraphPanels } from './graph-panels.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { POSTED_MAX } from '../../shared/common/panel.const.ts';
import type { ViewFake } from '../../shared/test/common/panel-fakes.type.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphPanelsDeps } from '../common/graph-panel.type.ts';
import type { GraphHostFakes } from '../test/common/graph.type.ts';
import { graphHostMock } from '../test/mocks/graph-host.mock.ts';
import { GRAPH_HASH_STUB, GRAPH_LOADED_STUB, GRAPH_STATE_STUB, POSITIONS_STUB } from '../test/stubs/graph-model.stub.ts';

const OTHER_FOLDER = { root: '/other', name: 'other' };
const READY = { type: 'ready' };
const STATE_POSTED: GraphHostMessage = { type: 'state', state: GRAPH_STATE_STUB };

const viewAt = (fakes: GraphHostFakes, index: number): ViewFake<GraphHostMessage> => {
  const view = fakes.views[index];

  if (view === undefined) throw new Error(`view ${index} was not opened`);

  return view;
};

describe('FEATURE: graph panel registry', () => {
  let store: RootStore;
  let fakes: GraphHostFakes;
  let setPanelVisible: Mock<GraphPanelsDeps['setPanelVisible']>;
  let panels: GraphPanels;

  beforeEach(() => {
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB, OTHER_FOLDER], () => coordinatorMock());
    store.apply('/ws', GRAPH_LOADED_STUB);
    store.apply('/other', GRAPH_LOADED_STUB);
    fakes = graphHostMock();
    setPanelVisible = vi.fn<GraphPanelsDeps['setPanelVisible']>();
    const openDetails = vi.fn<GraphPanelsDeps['openDetails']>().mockResolvedValue(undefined);

    panels = new GraphPanels({ roots: store, host: fakes.host, setPanelVisible, openDetails });
  });

  describe('GIVEN a loaded root', () => {
    it('WHEN the graph opens THEN one shown panel exists, titled with the folder name, and the root hears it shown', () => {
      panels.open('/ws');

      expect(fakes.open).toHaveBeenCalledExactlyOnceWith('Package Graph — ws');
      expect(panels.api().panels()).toStrictEqual([{ root: '/ws', visible: true }]);
      expect(setPanelVisible).toHaveBeenCalledExactlyOnceWith('/ws', 'graph\0/ws', true);
    });

    it('WHEN it opens again THEN the same panel is revealed and no second one is made', () => {
      const first = panels.open('/ws');

      const second = panels.open('/ws');

      expect(second).toBe(first);
      expect(fakes.open).toHaveBeenCalledOnce();
      expect(viewAt(fakes, 0).reveal).toHaveBeenCalledOnce();
    });

    it('WHEN two roots open THEN there are two panels', () => {
      panels.open('/ws');
      panels.open('/other');

      expect(fakes.open).toHaveBeenCalledTimes(2);
      expect(panels.api().panels()).toHaveLength(2);
    });

    it('WHEN the page sends ready THEN the state is posted and recorded', () => {
      panels.open('/ws');

      viewAt(fakes, 0).message(READY);

      expect(panels.api().posted('/ws')).toStrictEqual([STATE_POSTED]);
      expect(viewAt(fakes, 0).send).toHaveBeenCalledExactlyOnceWith(STATE_POSTED);
    });

    it('WHEN the page sends ready more than the cap THEN only the last POSTED_MAX messages are kept', () => {
      panels.open('/ws');

      for (let sent = 0; sent <= POSTED_MAX; sent += 1) viewAt(fakes, 0).message(READY);

      expect(panels.api().posted('/ws')).toHaveLength(POSTED_MAX);
    });

    it('WHEN the view send rejects THEN the failure is logged and nothing throws', async () => {
      panels.open('/ws');
      viewAt(fakes, 0).send.mockRejectedValue(new Error('disposed'));

      viewAt(fakes, 0).message(READY);
      await vi.waitFor(() => {
        expect(fakes.log).toHaveBeenCalled();
      });

      expect(fakes.log.mock.calls[0]?.[0]).toContain('disposed');
    });

    it('WHEN the cached hash is read before and after an accepted positions message THEN it is null, then the state hash', async () => {
      panels.open('/ws');
      const before = panels.api().cachedHash('/ws');

      await panels.api().receive('/ws', { type: 'positions', hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB });

      expect(before).toBeNull();
      expect(panels.api().cachedHash('/ws')).toBe(GRAPH_HASH_STUB);
    });
  });

  describe('GIVEN no panel is open', () => {
    it('WHEN the graph opens for a root the store does not hold THEN null comes back and no panel is made', () => {
      const opened = panels.open('/gone');

      expect(opened).toBeNull();
      expect(fakes.open).not.toHaveBeenCalled();
    });

    it('WHEN the test API receives for a root THEN it rejects', async () => {
      await expect(panels.api().receive('/ws', READY)).rejects.toThrow('no open graph panel');
    });
  });

  describe('GIVEN open panels', () => {
    it('WHEN a root leaves the store and roots are pruned THEN its view is disposed and the other stays listed', () => {
      panels.open('/ws');
      panels.open('/other');
      store.set([ROOT_FOLDER_STUB], () => coordinatorMock());

      panels.pruneRoots();

      expect(viewAt(fakes, 1).dispose).toHaveBeenCalledOnce();
      expect(panels.api().panels()).toStrictEqual([{ root: '/ws', visible: true }]);
    });

    it('WHEN the user closes a tab THEN the panel leaves the registry and the root hears it hidden once', () => {
      panels.open('/ws');

      viewAt(fakes, 0).close();

      expect(panels.api().panels()).toStrictEqual([]);
      expect(setPanelVisible).toHaveBeenLastCalledWith('/ws', 'graph\0/ws', false);
      expect(setPanelVisible).toHaveBeenCalledTimes(2);
    });

    it('WHEN the registry is disposed THEN every view is disposed', () => {
      panels.open('/ws');
      panels.open('/other');

      panels.dispose();

      expect(viewAt(fakes, 0).dispose).toHaveBeenCalledOnce();
      expect(viewAt(fakes, 1).dispose).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a host that cannot open a panel', () => {
    it('WHEN the graph opens THEN the error propagates and no panel is listed', () => {
      fakes.open.mockImplementationOnce(() => {
        throw new Error('ENOENT');
      });

      expect(() => panels.open('/ws')).toThrow('ENOENT');
      expect(panels.api().panels()).toStrictEqual([]);
    });
  });
});
