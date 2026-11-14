import { vi } from 'vitest';

import { memoryCacheMock } from './graph-host.mock.ts';
import type { GraphLayoutCacheEntry } from '../../common/graph-cache.type.ts';
import type { GraphPorts } from '../../common/graph.type.ts';
import { GRAPH_WALL_NOW } from '../common/graph-ports.const.ts';
import { importScanOf } from '../utils/import-scan.spec.util.ts';

/** Every port a spy; the caches are an in-memory map keyed by `cacheKeyOf` and seeded with `cached`, and `openDetails`, `openAt` and `writeBytes` resolve, `readText` and `pickSaveUri` give `null`, `realPath` gives its input, `scanImports` resolves an empty scan, `wallNow` gives `GRAPH_WALL_NOW`. */
export const graphPortsMock = (cached: Map<string, GraphLayoutCacheEntry> = new Map()): GraphPorts => {
  const { readCache, writeCache } = memoryCacheMock(cached);
  const openDetails = vi.fn<GraphPorts['openDetails']>().mockResolvedValue(undefined);
  const readText = vi.fn<GraphPorts['readText']>().mockResolvedValue(null);
  const realPath = vi.fn<GraphPorts['realPath']>(async (path) => Promise.resolve(path));
  const openAt = vi.fn<GraphPorts['openAt']>().mockResolvedValue(undefined);
  const scanImports = vi.fn<GraphPorts['scanImports']>().mockResolvedValue(importScanOf([]));
  const pickSaveUri = vi.fn<GraphPorts['pickSaveUri']>().mockResolvedValue(null);
  const writeBytes = vi.fn<GraphPorts['writeBytes']>().mockResolvedValue(undefined);
  const executeCommand = vi.fn<GraphPorts['executeCommand']>().mockResolvedValue(undefined);
  const ports: GraphPorts = {
    post: vi.fn(),
    readCache: vi.fn(readCache),
    writeCache: vi.fn(writeCache),
    openDetails,
    readText,
    realPath,
    openAt,
    scanImports,
    setPanelVisible: vi.fn(),
    log: vi.fn(),
    info: vi.fn(),
    pickSaveUri,
    writeBytes,
    showInfo: vi.fn(),
    showError: vi.fn(),
    executeCommand,
    wallNow: vi.fn<GraphPorts['wallNow']>(() => GRAPH_WALL_NOW)
  };

  return ports;
};
