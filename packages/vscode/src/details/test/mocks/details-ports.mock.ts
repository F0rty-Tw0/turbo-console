import { vi } from 'vitest';

import type { DetailsPorts } from '../../common/details.type.ts';

/** Every port a spy; `ensureLoaded` and `execute` resolve, the root is not stale and `dryRun` lists no states. */
export const detailsPortsMock = (): DetailsPorts => {
  const dryRun = vi.fn<DetailsPorts['dryRun']>().mockResolvedValue([]);
  const ensureLoaded = vi.fn<DetailsPorts['ensureLoaded']>().mockResolvedValue(undefined);
  const execute = vi.fn<DetailsPorts['execute']>().mockResolvedValue(undefined);
  const ports: DetailsPorts = {
    post: vi.fn(),
    dryRun,
    ensureLoaded,
    isStale: vi.fn(() => false),
    execute,
    setPanelVisible: vi.fn(),
    info: vi.fn(),
    log: vi.fn()
  };

  return ports;
};
