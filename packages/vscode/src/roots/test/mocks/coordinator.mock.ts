import { vi } from 'vitest';

import type { Coordinator } from '../../common/coordinator.type.ts';

export const coordinatorMock = (): Coordinator => {
  const coordinator: Coordinator = {
    request: vi.fn(),
    show: vi.fn(),
    firstChildren: vi.fn(),
    ensureLoaded: vi.fn(),
    whenSettled: vi.fn(),
    isStale: vi.fn(),
    dispose: vi.fn()
  };

  return coordinator;
};
