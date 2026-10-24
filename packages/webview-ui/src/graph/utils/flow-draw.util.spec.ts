import { beforeEach, describe, expect, it } from 'vitest';

import { drawFlow } from './flow-draw.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import { FLOW_DASH_PX, FLOW_LINE_PX } from '../common/flow.const.ts';
import type { FlowSegment } from '../common/flow.type.ts';
import type { FlowPenMock } from '../test/common/graph-flow.type.ts';
import { flowPenMock } from '../test/mocks/graph-flow-pen.mock.ts';

const pointOf = (x: number, y: number): Position => {
  const point: Position = { x, y };

  return point;
};

const STRAIGHT: FlowSegment = { from: pointOf(1, 2), control: null, to: pointOf(3, 4) };

const CURVED: FlowSegment = { from: pointOf(5, 6), control: pointOf(7, 8), to: pointOf(9, 10) };

const COLOR = 'rgb(0, 122, 204)';

describe('FEATURE: drawFlow', () => {
  let pen: FlowPenMock;

  beforeEach(() => {
    pen = flowPenMock();
  });

  describe('GIVEN a straight and a curved segment at phase 4 px', () => {
    beforeEach(() => {
      drawFlow(pen, [STRAIGHT, CURVED], COLOR, 4);
    });

    it('WHEN drawn THEN the pen strokes in the colour at the flow width', () => {
      expect(pen.strokeStyle).toBe(COLOR);
      expect(pen.lineWidth).toBe(FLOW_LINE_PX);
    });

    it('WHEN drawn THEN the dashes are dash-long gaps apart, offset back by the phase so they move forward', () => {
      expect(pen.setLineDash).toHaveBeenCalledExactlyOnceWith([FLOW_DASH_PX, FLOW_DASH_PX]);
      expect(pen.lineDashOffset).toBe(-4);
    });

    it('WHEN drawn THEN the straight segment is a line and the curved one a quadratic curve', () => {
      expect(pen.moveTo.mock.calls).toStrictEqual([
        [1, 2],
        [5, 6]
      ]);
      expect(pen.lineTo).toHaveBeenCalledExactlyOnceWith(3, 4);
      expect(pen.quadraticCurveTo).toHaveBeenCalledExactlyOnceWith(7, 8, 9, 10);
    });

    it('WHEN drawn THEN both segments go out in one stroke', () => {
      expect(pen.beginPath).toHaveBeenCalledOnce();
      expect(pen.stroke).toHaveBeenCalledOnce();
    });
  });
});
