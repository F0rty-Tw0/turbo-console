import type { GraphHostMessage } from '@turbo-console/webview-ui';
import { vi } from 'vitest';

import type { ViewFake } from '../../../details/test/common/panel-fakes.type.ts';
import { viewMock } from '../../../details/test/mocks/panel-host.mock.ts';
import type { GraphLayoutCacheEntry } from '../../common/graph-cache.type.ts';
import type { GraphHost } from '../../common/graph-panel.type.ts';
import type { GraphHostFakes } from '../common/graph.type.ts';

/** Every host effect a spy; `open` hands out shown views and the layout cache is an in-memory map. */
export const graphHostMock = (): GraphHostFakes => {
  const views: ViewFake<GraphHostMessage>[] = [];
  const cached = new Map<string, GraphLayoutCacheEntry>();
  const open = vi.fn<GraphHost['open']>(() => {
    const fake = viewMock<GraphHostMessage>();

    views.push(fake);

    return fake.view;
  });
  const readCache = (root: string): GraphLayoutCacheEntry | null => cached.get(root) ?? null;
  const writeCache = (root: string, entry: GraphLayoutCacheEntry): void => {
    cached.set(root, entry);
  };
  const log = vi.fn<GraphHost['log']>();
  const host: GraphHost = { open, readCache, writeCache, log };
  const fakes: GraphHostFakes = { host, open, views, cached, log };

  return fakes;
};
