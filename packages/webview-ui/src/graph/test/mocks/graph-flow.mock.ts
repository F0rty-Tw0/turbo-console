import type { Mocked } from 'vitest';
import { vi } from 'vitest';

import type { FlowControl } from '../../common/flow.type.ts';

export const flowControlMock = (): Mocked<FlowControl> => {
  const flow: Mocked<FlowControl> = {
    highlightChanged: vi.fn<FlowControl['highlightChanged']>(),
    moved: vi.fn<FlowControl['moved']>(),
    viewportChanged: vi.fn<FlowControl['viewportChanged']>(),
    stop: vi.fn<FlowControl['stop']>(),
    setColor: vi.fn<FlowControl['setColor']>()
  };

  return flow;
};
