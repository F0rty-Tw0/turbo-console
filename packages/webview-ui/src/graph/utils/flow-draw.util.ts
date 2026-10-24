import { FLOW_DASH_PX, FLOW_LINE_PX } from '../common/flow.const.ts';
import type { FlowPen, FlowSegment } from '../common/flow.type.ts';

const traceSegment = (pen: FlowPen, segment: FlowSegment): void => {
  const { from, control, to } = segment;

  pen.moveTo(from.x, from.y);

  if (control === null) pen.lineTo(to.x, to.y);
  else pen.quadraticCurveTo(control.x, control.y, to.x, to.y);
};

/** Strokes every segment as one dashed path in `color`; the dashes sit `phasePx` further along than at phase 0. */
export const drawFlow = (pen: FlowPen, segments: FlowSegment[], color: string, phasePx: number): void => {
  pen.strokeStyle = color;
  pen.lineWidth = FLOW_LINE_PX;
  pen.setLineDash([FLOW_DASH_PX, FLOW_DASH_PX]);
  pen.lineDashOffset = -phasePx;
  pen.beginPath();

  for (const segment of segments) traceSegment(pen, segment);

  pen.stroke();
};
