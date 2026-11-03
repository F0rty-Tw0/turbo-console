import { lineSegmentsOf, segmentDistanceOf } from './graph-geometry.spec.util.ts';
import type { ProbeEdgeLine } from '../../../src/graph/common/graph-probe.type.ts';
import type { EdgeSample } from '../../common/graph-flow.type.ts';
import type { LinkEnds, ScreenClip, ViewportPoint } from '../../common/playwright.type.ts';

/** One 12 px dash cycle around a line's middle, a pixel apart. */
const EDGE_STEPS = Array.from({ length: 13 }, (_, index: number): number => index - 6);

const EDGE_CLIP_HALF_PX = 10;

const EDGE_CLIP_PX = EDGE_CLIP_HALF_PX * 2 + 1;

/** The piece of `line` nearest its midpoint, the one the midpoint lies on. */
const middlePieceOf = (line: ProbeEdgeLine): LinkEnds => {
  const gapOf = (piece: LinkEnds): number => segmentDistanceOf(line.midpoint, piece.from, piece.to);
  const [first, ...rest] = lineSegmentsOf(line);

  if (first === undefined) throw new Error(`graph e2e: the edge ${line.source}>${line.target} is not drawn`);

  return rest.reduce((nearest, piece): LinkEnds => (gapOf(piece) < gapOf(nearest) ? piece : nearest), first);
};

/** The clip around `line`'s midpoint and the 13 px of its middle piece to read in a shot of that clip, from its top left. */
export const edgeSampleOf = (line: ProbeEdgeLine): EdgeSample => {
  const { from, to } = middlePieceOf(line);
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const unit: ViewportPoint = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  const middle = line.midpoint;
  const clip: ScreenClip = {
    x: Math.round(middle.x) - EDGE_CLIP_HALF_PX,
    y: Math.round(middle.y) - EDGE_CLIP_HALF_PX,
    width: EDGE_CLIP_PX,
    height: EDGE_CLIP_PX
  };
  const pointOf = (step: number): ViewportPoint => {
    const point: ViewportPoint = {
      x: Math.round(middle.x + unit.x * step) - clip.x,
      y: Math.round(middle.y + unit.y * step) - clip.y
    };

    return point;
  };
  const sample: EdgeSample = { clip, points: EDGE_STEPS.map(pointOf) };

  return sample;
};
