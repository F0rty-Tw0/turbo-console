import { vi } from 'vitest';

import type { GraphLayoutCacheEntry } from '../../common/graph-cache.type.ts';
import type { GraphPorts } from '../../common/graph.type.ts';

/** Every port a spy; the cache is an in-memory map seeded with `cached`, and `openDetails` and `openAt` resolve, `readText` gives `null`. */
export const graphPortsMock = (cached: Map<string, GraphLayoutCacheEntry> = new Map()): GraphPorts => {
  const readCache = (root: string): GraphLayoutCacheEntry | null => cached.get(root) ?? null;
  const writeCache = (root: string, entry: GraphLayoutCacheEntry): void => {
    cached.set(root, entry);
  };
  const openDetails = vi.fn<GraphPorts['openDetails']>().mockResolvedValue(undefined);
  const readText = vi.fn<GraphPorts['readText']>().mockResolvedValue(null);
  const openAt = vi.fn<GraphPorts['openAt']>().mockResolvedValue(undefined);
  const ports: GraphPorts = {
    post: vi.fn(),
    readCache: vi.fn(readCache),
    writeCache: vi.fn(writeCache),
    openDetails,
    readText,
    openAt,
    setPanelVisible: vi.fn(),
    log: vi.fn(),
    info: vi.fn()
  };

  return ports;
};
