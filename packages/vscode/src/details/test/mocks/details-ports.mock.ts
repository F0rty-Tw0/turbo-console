import { vi } from 'vitest';

import type { DetailsPorts } from '../../common/details.type.ts';

/** Every port a spy; `execute` resolves, the root is not stale and `dryRun` lists no states. */
export const detailsPortsMock = (): DetailsPorts => {
  const dryRun = vi.fn<DetailsPorts['dryRun']>().mockResolvedValue([]);
  const execute = vi.fn<DetailsPorts['execute']>().mockResolvedValue(undefined);
  const ports: DetailsPorts = {
    post: vi.fn(),
    dryRun,
    isStale: vi.fn(() => false),
    execute,
    setPanelVisible: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
    now: () => 0
  };

  return ports;
};
