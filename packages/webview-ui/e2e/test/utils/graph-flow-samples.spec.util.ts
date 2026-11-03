import { lineSegmentsOf } from './graph-geometry.spec.util.ts';
import type { ProbeEdgeLine } from '../../../src/graph/common/graph-probe.type.ts';
import type { EdgeSample } from '../../common/graph-flow.type.ts';
import type { LinkEnds, ScreenClip, ViewportPoint } from '../../common/playwright.type.ts';

/** One 12 px dash cycle around a line's middle, a pixel apart. */
const EDGE_STEPS = Array.from({ length: 13 }, (_, index: number): number => index - 6);

const EDGE_CLIP_HALF_PX = 10;

const EDGE_CLIP_PX = EDGE_CLIP_HALF_PX * 2 + 1;

const lengthOf = (piece: LinkEnds): number => Math.hypot(piece.to.x - piece.from.x, piece.to.y - piece.from.y);

const longerOf = (longest: LinkEnds, piece: LinkEnds): LinkEnds => {
  const pieceLength = lengthOf(piece);
  const longestLength = lengthOf(longest);
  const isLonger = pieceLength > longestLength;

  if (isLonger) return piece;

  return longest;
};

/** The longest piece of `line`: one a dash cycle fits on, whatever the bend count puts at the line's midpoint (a corner for 1 or 3 bends). */
const longestPieceOf = (line: ProbeEdgeLine): LinkEnds => {
  const [first, ...rest] = lineSegmentsOf(line);

  if (first === undefined) throw new Error(`graph e2e: the edge ${line.source}>${line.target} is not drawn`);

  return rest.reduce(longerOf, first);
};

/** The clip around the middle of `line`'s longest piece and the 13 px of that piece to read in a shot of that clip, from its top left. */
export const edgeSampleOf = (line: ProbeEdgeLine): EdgeSample => {
  const piece = longestPieceOf(line);
  const { from, to } = piece;
  const length = lengthOf(piece) || 1;
  const unit: ViewportPoint = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  const middle: ViewportPoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
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
