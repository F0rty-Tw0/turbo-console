import type { GraphHostMessage } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { graphPortsOf } from './graph-panel-ports.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import type { ViewFake } from '../../shared/test/common/panel-fakes.type.ts';
import { viewMock } from '../../shared/test/mocks/panel-view.mock.ts';
import type { GraphPanelsDeps } from '../common/graph-panel.type.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import type { GraphHostFakes } from '../test/common/graph.type.ts';
import { graphHostMock } from '../test/mocks/graph-host.mock.ts';
import { GRAPH_HASH_STUB, GRAPH_STATE_STUB, POSITIONS_STUB } from '../test/stubs/graph-model.stub.ts';

const STATE_POSTED: GraphHostMessage = { type: 'state', state: GRAPH_STATE_STUB };
const ENTRY = { hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB };

const throwingSend = (): never => {
  throw new Error('webview is disposed');
};

describe('FEATURE: the ports of one graph panel', () => {
  let fakes: GraphHostFakes;
  let view: ViewFake<GraphHostMessage>;
  let posted: GraphHostMessage[];
  let setPanelVisible: Mock<GraphPanelsDeps['setPanelVisible']>;
  let openDetails: Mock<GraphPanelsDeps['openDetails']>;
  let ports: GraphPorts;

  beforeEach(() => {
    fakes = graphHostMock();
    view = viewMock<GraphHostMessage>();
    posted = [];
    setPanelVisible = vi.fn<GraphPanelsDeps['setPanelVisible']>();
    openDetails = vi.fn<GraphPanelsDeps['openDetails']>().mockResolvedValue(undefined);

    const deps: GraphPanelsDeps = { roots: new RootStore(), host: fakes.host, setPanelVisible, openDetails, runs: new RunStore() };

    ports = graphPortsOf(deps, '/ws', posted, view.view);
  });

  describe('GIVEN the editor effects of the host', () => {
    it('WHEN the ports are built THEN readText and openAt are the host ones', () => {
      expect(ports.readText).toBe(fakes.host.readText);
      expect(ports.openAt).toBe(fakes.host.openAt);
    });

    it('WHEN the ports are built THEN the four save ports are the host ones', () => {
      expect(ports.pickSaveUri).toBe(fakes.host.pickSaveUri);
      expect(ports.writeBytes).toBe(fakes.host.writeBytes);
      expect(ports.showInfo).toBe(fakes.host.showInfo);
      expect(ports.showError).toBe(fakes.host.showError);
    });
  });

  describe('GIVEN a state to post', () => {
    it('WHEN it is posted THEN it is recorded and sent to the view', () => {
      ports.post(STATE_POSTED);

      expect(posted).toStrictEqual([STATE_POSTED]);
      expect(view.send).toHaveBeenCalledExactlyOnceWith(STATE_POSTED);
    });

    it('WHEN the view send throws THEN the post does not throw and the failure is logged', () => {
      view.send.mockImplementation(throwingSend);

      ports.post(STATE_POSTED);

      expect(fakes.log).toHaveBeenCalledExactlyOnceWith('webview is disposed');
    });
  });

  describe('GIVEN the panel root', () => {
    it('WHEN Details opens for a package THEN the registry opens that root and package', async () => {
      await ports.openDetails('web');

      expect(openDetails).toHaveBeenCalledExactlyOnceWith({ root: '/ws', packageName: 'web' });
    });

    it('WHEN the panel reports shown THEN the root session hears the graph panel id', () => {
      ports.setPanelVisible(true);

      expect(setPanelVisible).toHaveBeenCalledExactlyOnceWith('/ws', 'graph\0/ws', true);
    });

    it('WHEN the panel reports hidden THEN the root session hears false', () => {
      ports.setPanelVisible(false);

      expect(setPanelVisible).toHaveBeenCalledExactlyOnceWith('/ws', 'graph\0/ws', false);
    });
  });

  describe('GIVEN the host effects', () => {
    it('WHEN an entry is written and read back THEN it goes through the host cache', () => {
      ports.writeCache('/ws', 'folders', ENTRY);

      expect(ports.readCache('/ws', 'folders')).toStrictEqual(ENTRY);
    });

    it('WHEN a failure is logged THEN it goes to the host log', () => {
      ports.log('boom');

      expect(fakes.log).toHaveBeenCalledExactlyOnceWith('boom');
    });

    it('WHEN an info line is logged THEN it goes to the host info', () => {
      ports.info('graph layout elk 12 ms');

      expect(fakes.info).toHaveBeenCalledExactlyOnceWith('graph layout elk 12 ms');
    });
  });
});
