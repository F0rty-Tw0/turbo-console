import { vi } from 'vitest';

import type { FlowPen } from '../../common/flow.type.ts';
import type { FlowPenMock } from '../common/graph-flow.type.ts';

export const flowPenMock = (): FlowPenMock => {
  const pen: FlowPenMock = {
    beginPath: vi.fn<FlowPen['beginPath']>(),
    moveTo: vi.fn<FlowPen['moveTo']>(),
    lineTo: vi.fn<FlowPen['lineTo']>(),
    quadraticCurveTo: vi.fn<FlowPen['quadraticCurveTo']>(),
    stroke: vi.fn<() => void>(),
    setLineDash: vi.fn<FlowPen['setLineDash']>(),
    clearRect: vi.fn<CanvasRenderingContext2D['clearRect']>(),
    lineDashOffset: 0,
    lineWidth: 1,
    strokeStyle: ''
  };

  return pen;
};
