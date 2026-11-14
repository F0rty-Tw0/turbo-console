import type { EdgeSingular, NodeSingular } from 'cytoscape';

import type { ProbeState } from '../common/graph-probe.type.ts';
import { DIMMED_BOX_CLASS } from '../common/graph.const.ts';

/** A resolved style value as text; Cytoscape types `style(name)` as `any`. */
export const styleText = (element: NodeSingular | EdgeSingular, name: string): string => {
  const value: unknown = element.style(name);

  return typeof value === 'string' ? value : '';
};

/** A resolved numeric style value, 0 when not a number or `node` is not drawn; Cytoscape types `numericStyle(name)` as `any`. */
export const styleNumber = (node: NodeSingular, name: string): number => {
  const isNone = node.empty();

  if (isNone) return 0;

  const value: unknown = node.numericStyle(name);

  return typeof value === 'number' ? value : 0;
};

/** The bar colour of a task card with a run state: the first stop of its gradient, `null` for a solid fill. */
export const accentColorOf = (node: NodeSingular): string | null => {
  const fill = styleText(node, 'background-fill');
  const isBar = fill === 'linear-gradient';

  if (!isBar) return null;

  const [bar = ''] = styleText(node, 'background-gradient-stop-colors').split(' ');

  return bar;
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
