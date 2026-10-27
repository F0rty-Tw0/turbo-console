import type { GraphHostMessage, LayoutGrouping } from '@turbo-console/webview-ui';
import { describe, expect, it, vi } from 'vitest';

import { graphApiOf } from './graph-api.ts';
import { viewMock } from '../../shared/test/mocks/panel-view.mock.ts';
import type { GraphLayoutCacheEntry } from '../common/graph-cache.type.ts';
import type { GraphHost, OpenGraphPanel } from '../common/graph-panel.type.ts';
import { GRAPH_HASH_STUB, GRAPH_STATE_STUB, POSITIONS_STUB } from '../test/stubs/graph-model.stub.ts';
import { cacheKeyOf } from '../utils/graph-cache.util.ts';

const STATE_POSTED: GraphHostMessage = { type: 'state', state: GRAPH_STATE_STUB };
const READY = { type: 'ready' };
const ENTRY = { hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB };

const panelOf = (root: string, visible: boolean): OpenGraphPanel => {
  const receive = vi.fn<OpenGraphPanel['session']['receive']>().mockResolvedValue(undefined);
  const session: OpenGraphPanel['session'] = { receive, show: vi.fn(), dispose: vi.fn() };
  const { view } = viewMock<GraphHostMessage>(visible);
  const posted = [STATE_POSTED];
  const panel: OpenGraphPanel = { root, view, session, posted };

  return panel;
};

const panelsOf = (panels: OpenGraphPanel[]): Map<string, OpenGraphPanel> => {
  const entries = panels.map((panel): [string, OpenGraphPanel] => [panel.root, panel]);

  return new Map(entries);
};

const readCacheOf = (entries: Record<string, GraphLayoutCacheEntry>): GraphHost['readCache'] => {
  const read = (root: string, grouping: LayoutGrouping): GraphLayoutCacheEntry | null => entries[cacheKeyOf(root, grouping)] ?? null;

  return read;
};

const noCache: GraphHost['readCache'] = () => null;

describe('FEATURE: the graph test API', () => {
  describe('GIVEN a shown and a hidden panel', () => {
    it('WHEN the panels are listed THEN each root comes with its visibility', () => {
      const api = graphApiOf(panelsOf([panelOf('/ws', true), panelOf('/other', false)]), noCache);

      expect(api.panels()).toStrictEqual([
        { root: '/ws', visible: true },
        { root: '/other', visible: false }
      ]);
    });
  });

  describe('GIVEN an open panel with a posted state', () => {
    it('WHEN its posted messages are read THEN they are a copy of the panel record', () => {
      const panel = panelOf('/ws', true);
      const api = graphApiOf(panelsOf([panel]), noCache);

      const posted = api.posted('/ws');

      posted.length = 0;

      expect(panel.posted).toStrictEqual([STATE_POSTED]);
    });

    it('WHEN a message is received for its root THEN its session receives it', async () => {
      const panel = panelOf('/ws', true);
      const api = graphApiOf(panelsOf([panel]), noCache);

      await api.receive('/ws', READY);

      expect(panel.session.receive).toHaveBeenCalledExactlyOnceWith(READY);
    });
  });

  describe('GIVEN no panel for a root', () => {
    it('WHEN its posted messages are read THEN they are empty', () => {
      const api = graphApiOf(panelsOf([]), noCache);

      expect(api.posted('/ws')).toStrictEqual([]);
    });

    it('WHEN a message is received for it THEN the call rejects', async () => {
      const api = graphApiOf(panelsOf([]), noCache);

      await expect(api.receive('/ws', READY)).rejects.toThrow('no open graph panel for /ws');
    });
  });

  describe('GIVEN the layout cache', () => {
    it.each<LayoutGrouping>(['flat', 'folders'])('WHEN a root has a %s entry THEN that cached hash is the entry hash', (grouping) => {
      const api = graphApiOf(panelsOf([]), readCacheOf({ [cacheKeyOf('/ws', grouping)]: ENTRY }));

      expect(api.cachedHash('/ws', grouping)).toBe(GRAPH_HASH_STUB);
    });

    it('WHEN a root has only a folders entry THEN its flat cached hash is null', () => {
      const api = graphApiOf(panelsOf([]), readCacheOf({ [cacheKeyOf('/ws', 'folders')]: ENTRY }));

      expect(api.cachedHash('/ws', 'flat')).toBeNull();
    });

    it('WHEN a root has no entry THEN its cached hash is null', () => {
      const api = graphApiOf(panelsOf([]), noCache);

      expect(api.cachedHash('/ws', 'flat')).toBeNull();
    });
  });
});
