import type { GraphHostMessage } from '@turbo-console/webview-ui';
import { vi } from 'vitest';

import type { EditorPanelView } from '../../../shared/common/panel-view.type.ts';
import type { ViewFake } from '../../../shared/test/common/panel-fakes.type.ts';
import { viewMock } from '../../../shared/test/mocks/panel-view.mock.ts';
import type { GraphLayoutCacheEntry } from '../../common/graph-cache.type.ts';
import type { GraphHost } from '../../common/graph-panel.type.ts';
import type { GraphHostFakes } from '../common/graph.type.ts';

/** Every host effect a spy; `open` hands out shown views and the layout cache is an in-memory map. */
export const graphHostMock = (): GraphHostFakes => {
  const views: ViewFake<GraphHostMessage>[] = [];
  const cached = new Map<string, GraphLayoutCacheEntry>();
  const openView = (): EditorPanelView<GraphHostMessage> => {
    const fake = viewMock<GraphHostMessage>();

    views.push(fake);

    return fake.view;
  };
  const open = vi.fn<GraphHost['open']>(openView);
  const readCache = (root: string): GraphLayoutCacheEntry | null => cached.get(root) ?? null;
  const writeCache = (root: string, entry: GraphLayoutCacheEntry): void => {
    cached.set(root, entry);
  };
  const readText = vi.fn<GraphHost['readText']>();
  const openAt = vi.fn<GraphHost['openAt']>();
  const log = vi.fn<GraphHost['log']>();
  const info = vi.fn<GraphHost['info']>();
  const host: GraphHost = { open, readCache, writeCache, readText, openAt, log, info };
  const fakes: GraphHostFakes = { host, open, views, cached, readText, openAt, log, info };

  return fakes;
};
