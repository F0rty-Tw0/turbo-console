import type { Mocked } from 'vitest';
import { vi } from 'vitest';

import type { Bridge } from '../../../bridge/common/bridge.type.ts';

/** A bridge whose every call is a spy and whose saved state is empty. */
export const bridgeMock = (): Mocked<Bridge> => {
  const bridge: Mocked<Bridge> = {
    ready: vi.fn<Bridge['ready']>(),
    post: vi.fn<Bridge['post']>(),
    onMessage: vi.fn<Bridge['onMessage']>(),
    savedState: vi.fn<Bridge['savedState']>(() => null),
    saveState: vi.fn<Bridge['saveState']>()
  };

  return bridge;
};
