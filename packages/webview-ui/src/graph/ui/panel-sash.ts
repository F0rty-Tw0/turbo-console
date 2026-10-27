import { textElement } from '../../shared/ui/text-element.ts';
import type { PanelSide } from '../common/graph-page.type.ts';
import { PANEL_MIN_PX, RESIZE_LABELS } from '../common/graph.const.ts';
import type { PanelSashes } from '../common/panel-sash.type.ts';

/** A vertical separator in the Tab order; `graph.css` shows it only while its panel shows. */
const panelSash = (side: PanelSide): HTMLDivElement => {
  const sash = textElement('div', `graph-sash graph-sash-${side}`, '');

  sash.tabIndex = 0;
  sash.setAttribute('role', 'separator');
  sash.setAttribute('aria-orientation', 'vertical');
  sash.setAttribute('aria-label', RESIZE_LABELS[side]);
  sash.setAttribute('aria-valuemin', String(PANEL_MIN_PX));

  return sash;
};

/** The Controls and Details sashes; `GraphPanelSashes` keeps their value, max and `aria-controls` current. */
export const buildPanelSashes = (): PanelSashes => {
  const controls = panelSash('controls');
  const details = panelSash('details');
  const sashes: PanelSashes = { controls, details };

  return sashes;
};
