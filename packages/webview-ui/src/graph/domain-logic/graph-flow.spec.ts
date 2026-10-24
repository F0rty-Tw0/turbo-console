import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphFlow } from './graph-flow.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import { FLOW_CYCLE_MS, FLOW_DASH_PX, FLOW_IDLE_MS } from '../common/flow.const.ts';
import type { FlowEdgeGeometry } from '../common/flow.type.ts';
import type { Viewport } from '../common/graph-page.type.ts';
import type { FlowClockMock, FlowPenMock } from '../test/common/graph-flow.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { flowClockMock } from '../test/mocks/graph-flow-clock.mock.ts';
import { flowPenMock } from '../test/mocks/graph-flow-pen.mock.ts';

const SOURCE: Position = { x: 0, y: 0 };

const TARGET: Position = { x: 50, y: 0 };

const EDGE: FlowEdgeGeometry = { source: SOURCE, target: TARGET, controlPoints: [] };

const PAN: Position = { x: 10, y: 20 };

const CAMERA: Viewport = { zoom: 2, pan: PAN };

const COLOR = 'rgb(0, 122, 204)';

const CANVAS_SIZE = { width: 200, height: 100 };

const POINTER_MOVE = new Event('pointermove');

describe('FEATURE: GraphFlow', () => {
  let clock: FlowClockMock;
  let pen: FlowPenMock;
  let container: HTMLElement;
  let isReduced: boolean;
  let flow: GraphFlow;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());

    const getContext = (): FlowPenMock => pen;
    const canvas = Object.assign(document.createElement('canvas'), CANVAS_SIZE, { getContext });

    clock = flowClockMock();
    pen = flowPenMock();
    container = document.createElement('div');
    isReduced = false;
    flow = new GraphFlow({
      ...clock,
      canvas,
      container,
      edges: (): FlowEdgeGeometry[] => [EDGE],
      viewport: (): Viewport => CAMERA,
      isReduced: (): boolean => isReduced
    });
    flow.setColor(COLOR);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a highlight in task mode', () => {
    beforeEach(() => {
      flow.highlightChanged(true);
    });

    it('WHEN it turns on THEN one frame is asked for and nothing is drawn yet', () => {
      expect(clock.pendingFrames()).toBe(1);
      expect(pen.stroke).not.toHaveBeenCalled();
    });

    it('WHEN a frame runs THEN the canvas is cleared and the edge drawn at the camera, at the phase of the clock', () => {
      clock.advance(40);

      const phasePx = ((40 % FLOW_CYCLE_MS) / FLOW_CYCLE_MS) * 2 * FLOW_DASH_PX;

      expect(pen.clearRect).toHaveBeenLastCalledWith(0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height);
      expect(pen.moveTo).toHaveBeenLastCalledWith(10, 20);
      expect(pen.lineTo).toHaveBeenLastCalledWith(110, 20);
      expect(pen.strokeStyle).toBe(COLOR);
      expect(pen.lineDashOffset).toBe(-phasePx);
      expect(clock.pendingFrames()).toBe(1);
    });

    it('WHEN it turns on again while running THEN still one frame is pending', () => {
      flow.highlightChanged(true);

      expect(clock.pendingFrames()).toBe(1);
    });

    it(`WHEN ${FLOW_IDLE_MS} ms pass with no pointer move THEN no frame is pending and the canvas was cleared after the last stroke`, () => {
      clock.advance(FLOW_IDLE_MS);

      const strokedAt = pen.stroke.mock.invocationCallOrder.at(-1) ?? Number.NaN;
      const clearedAt = pen.clearRect.mock.invocationCallOrder.at(-1) ?? Number.NaN;

      expect(clock.pendingFrames()).toBe(0);
      expect(clearedAt).toBeGreaterThan(strokedAt);
    });

    it('WHEN the pointer moves at 2500 ms THEN it still runs at 3100 ms and stops by 5600 ms', () => {
      clock.advance(2500);
      container.dispatchEvent(POINTER_MOVE);
      clock.advance(600);

      expect(clock.pendingFrames()).toBe(1);

      clock.advance(2500);

      expect(clock.pendingFrames()).toBe(0);
    });

    it('WHEN it idled and the pointer moves THEN it stays stopped', () => {
      clock.advance(FLOW_IDLE_MS);
      flow.moved();
      clock.advance(100);

      expect(clock.pendingFrames()).toBe(0);
    });

    it('WHEN it idled and a highlight turns on again THEN it runs again', () => {
      clock.advance(FLOW_IDLE_MS);
      flow.highlightChanged(true);

      expect(clock.pendingFrames()).toBe(1);
    });

    it('WHEN the highlight turns off THEN no frame is pending and the canvas is cleared', () => {
      clock.advance(40);
      pen.clearRect.mockClear();
      flow.highlightChanged(false);

      expect(clock.pendingFrames()).toBe(0);
      expect(pen.clearRect).toHaveBeenCalledOnce();
    });

    it('WHEN it stops THEN the idle timer goes too, so a later highlight runs its full idle time', () => {
      clock.advance(2000);
      flow.stop();
      flow.highlightChanged(true);
      clock.advance(2000);

      expect(clock.pendingFrames()).toBe(1);
    });

    it('WHEN the viewport changes THEN the canvas is cleared at once and the flow keeps running', () => {
      clock.advance(40);
      pen.clearRect.mockClear();
      flow.viewportChanged();

      expect(pen.clearRect).toHaveBeenCalledOnce();
      expect(clock.pendingFrames()).toBe(1);
    });
  });

  describe('GIVEN reduced motion', () => {
    beforeEach(() => {
      isReduced = true;
    });

    it('WHEN a highlight turns on THEN no frame is asked for and nothing is ever drawn', () => {
      flow.highlightChanged(true);
      clock.advance(200);

      expect(clock.pendingFrames()).toBe(0);
      expect(pen.stroke).not.toHaveBeenCalled();
    });
  });

  it('GIVEN no highlight WHEN the pointer moves THEN no frame is asked for', () => {
    container.dispatchEvent(POINTER_MOVE);

    expect(clock.pendingFrames()).toBe(0);
  });
});
