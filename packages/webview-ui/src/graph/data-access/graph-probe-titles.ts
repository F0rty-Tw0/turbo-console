import type { BoundingBox12, Core, NodeSingular } from 'cytoscape';

import { styleText } from './graph-probe-state.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { ProbeRect, ProbeTitle } from '../common/graph-probe-titles.type.ts';
import { TASK_BOX_CLASS } from '../common/graph-task.const.ts';

const BOX_OPTIONS = { includeLabels: false, includeOverlays: false };

const LABEL_OPTIONS = { includeLabels: true, includeNodes: false, includeEdges: false, includeOverlays: false };

const ORIGIN: Position = { x: 0, y: 0 };

/** `bounds` as a rect moved by `origin`. */
const rectOf = (bounds: BoundingBox12, origin: Position): ProbeRect => {
  const { x1, x2, y1, y2 } = bounds;
  const rect: ProbeRect = { left: origin.x + x1, top: origin.y + y1, width: x2 - x1, height: y2 - y1 };

  return rect;
};

/** `box` with its title, `origin` being the container's top left corner in page CSS pixels. */
const probeTitleOf = (box: NodeSingular, origin: Position): ProbeTitle => {
  const label = rectOf(box.renderedBoundingBox(LABEL_OPTIONS), origin);
  const rendered = rectOf(box.renderedBoundingBox(BOX_OPTIONS), origin);
  const modelBox = rectOf(box.boundingBox(BOX_OPTIONS), ORIGIN);
  const title: ProbeTitle = { id: box.id(), text: styleText(box, 'label'), label, box: rendered, modelBox };

  return title;
};

/** Every task mode package box of `cy` with its title, in element order; none outside task mode. */
export const probeTitlesOf = (cy: Core, origin: Position): ProbeTitle[] => {
  const probeTitle = (box: NodeSingular): ProbeTitle => probeTitleOf(box, origin);

  return cy.nodes(`.${TASK_BOX_CLASS}`).map(probeTitle);
};
