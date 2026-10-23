import { vi } from 'vitest';

import { memoryCacheMock } from './graph-host.mock.ts';
import type { GraphLayoutCacheEntry } from '../../common/graph-cache.type.ts';
import type { GraphPorts } from '../../common/graph.type.ts';

/** Every port a spy; the caches are an in-memory map keyed by `cacheKeyOf` and seeded with `cached`, and `openDetails`, `openAt` and `writeBytes` resolve, `readText` and `pickSaveUri` give `null`. */
export const graphPortsMock = (cached: Map<string, GraphLayoutCacheEntry> = new Map()): GraphPorts => {
  const { readCache, writeCache } = memoryCacheMock(cached);
  const openDetails = vi.fn<GraphPorts['openDetails']>().mockResolvedValue(undefined);
  const readText = vi.fn<GraphPorts['readText']>().mockResolvedValue(null);
  const openAt = vi.fn<GraphPorts['openAt']>().mockResolvedValue(undefined);
  const pickSaveUri = vi.fn<GraphPorts['pickSaveUri']>().mockResolvedValue(null);
  const writeBytes = vi.fn<GraphPorts['writeBytes']>().mockResolvedValue(undefined);
  const ports: GraphPorts = {
    post: vi.fn(),
    readCache: vi.fn(readCache),
    writeCache: vi.fn(writeCache),
    openDetails,
    readText,
    openAt,
    setPanelVisible: vi.fn(),
    log: vi.fn(),
    info: vi.fn(),
    pickSaveUri,
    writeBytes,
    showInfo: vi.fn(),
    showError: vi.fn()
  };

  return ports;
};
