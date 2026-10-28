import { vi } from 'vitest';

import type { GraphViewHandlers } from '../../common/graph-page.type.ts';

/** Every canvas handler as a spy, for the specs of what the canvas reports. */
export const handlersMock = (): GraphViewHandlers => {
  const handlers: GraphViewHandlers = {
    onTapNode: vi.fn(),
    onTapEdge: vi.fn(),
    onTapBackground: vi.fn(),
    onTapFolder: vi.fn(),
    onDoubleTapNode: vi.fn(),
    onDoubleTapFolder: vi.fn(),
    onDragEnd: vi.fn(),
    onViewport: vi.fn(),
    onRefit: vi.fn(),
    onHoverNode: vi.fn(),
    onRender: vi.fn()
  };

  return handlers;
};
