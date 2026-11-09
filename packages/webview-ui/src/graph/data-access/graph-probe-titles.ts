import type { BoundingBox12, Core, NodeSingular } from 'cytoscape';

import { styleNumber, styleText } from './graph-probe-state.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { ProbeRect, ProbeTitle } from '../common/graph-probe-titles.type.ts';
import { BOX_FRAMED_CLASS, TASK_BOX_CLASS } from '../common/graph-task.const.ts';
import { isBoxFrame } from '../utils/box-frame.util.ts';

type FrameErrors = Pick<ProbeTitle, 'isFramed' | 'frameError' | 'titleError'>;

const BOX_OPTIONS = { includeLabels: false, includeOverlays: false };

const LABEL_OPTIONS = { includeLabels: true, includeNodes: false, includeEdges: false, includeOverlays: false };

const ORIGIN: Position = { x: 0, y: 0 };

/** `bounds` as a rect moved by `origin`. */
const rectOf = (bounds: BoundingBox12, origin: Position): ProbeRect => {
  const { x1, x2, y1, y2 } = bounds;
  const rect: ProbeRect = { left: origin.x + x1, top: origin.y + y1, width: x2 - x1, height: y2 - y1 };

  return rect;
};

/** Where `box`'s frame line runs in model pixels: its body with its padding, the border centred on it. */
const frameLineOf = (box: NodeSingular): BoundingBox12 => {
  const { x, y } = box.position();
  const border = styleNumber(box, 'border-width');
  const halfWidth = (box.outerWidth() - border) / 2;
  const halfHeight = (box.outerHeight() - border) / 2;
  const line: BoundingBox12 = { x1: x - halfWidth, x2: x + halfWidth, y1: y - halfHeight, y2: y + halfHeight };

  return line;
};

/** How far a framed `box` is drawn from its frame and its title from the placeholder, in model pixels. */
const frameErrorsOf = (box: NodeSingular): FrameErrors => {
  const frame: unknown = box.data('boxFrame');
  const isFramed = box.hasClass(BOX_FRAMED_CLASS);
  const unframed: FrameErrors = { isFramed, frameError: null, titleError: null };
  const isMeasured = isFramed && isBoxFrame(frame);

  if (!isMeasured) return unframed;

  const cy = box.cy();
  const leaf = cy.getElementById(frame.leafId);
  const { x, y } = leaf.position();
  const line = frameLineOf(box);
  const label = box.boundingBox(LABEL_OPTIONS);
  const sideGaps = [line.x1 - (x + frame.left), line.x2 - (x + frame.right), line.y1 - (y + frame.top), line.y2 - (y + frame.bottom)];
  const titleGaps = [label.x1 - (x + frame.titleX), label.y1 - (y + frame.titleY)];
  const sideErrors = sideGaps.map(Math.abs);
  const titleErrors = titleGaps.map(Math.abs);
  const frameError = Math.max(...sideErrors);
  const titleError = Math.max(...titleErrors);
  const errors: FrameErrors = { isFramed, frameError, titleError };

  return errors;
};

/** `box` with its title, `origin` being the container's top left corner in page CSS pixels. */
const probeTitleOf = (box: NodeSingular, origin: Position): ProbeTitle => {
  const label = rectOf(box.renderedBoundingBox(LABEL_OPTIONS), origin);
  const rendered = rectOf(box.renderedBoundingBox(BOX_OPTIONS), origin);
  const modelBox = rectOf(box.boundingBox(BOX_OPTIONS), ORIGIN);
  const errors = frameErrorsOf(box);
  const title: ProbeTitle = { id: box.id(), text: styleText(box, 'label'), label, box: rendered, modelBox, ...errors };

  return title;
};

/** Every task mode package box of `cy` with its title, in element order; none outside task mode. */
export const probeTitlesOf = (cy: Core, origin: Position): ProbeTitle[] => {
  const probeTitle = (box: NodeSingular): ProbeTitle => probeTitleOf(box, origin);

  return cy.nodes(`.${TASK_BOX_CLASS}`).map(probeTitle);
};
