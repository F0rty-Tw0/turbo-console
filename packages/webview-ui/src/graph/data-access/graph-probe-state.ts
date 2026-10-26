import type { EdgeSingular, NodeSingular } from 'cytoscape';

import type { ProbeState } from '../common/graph-probe.type.ts';
import { DIMMED_BOX_CLASS } from '../common/graph.const.ts';

/** A resolved style value as text; Cytoscape types `style(name)` as `any`. */
export const styleText = (element: NodeSingular | EdgeSingular, name: string): string => {
  const value: unknown = element.style(name);

  return typeof value === 'string' ? value : '';
};

/** The element's state class; a box's `dimmed-box` reads `dimmed`. */
export const probeStateOf = (element: NodeSingular | EdgeSingular): ProbeState => {
  const isSelected = element.hasClass('selected');
  const isHighlighted = element.hasClass('highlighted');
  const isDimmed = element.hasClass('dimmed') || element.hasClass(DIMMED_BOX_CLASS);

  if (isSelected) return 'selected';

  if (isHighlighted) return 'highlighted';

  return isDimmed ? 'dimmed' : 'normal';
};
