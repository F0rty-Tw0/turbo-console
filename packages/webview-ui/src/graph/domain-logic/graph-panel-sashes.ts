import type { PanelWidths } from '../../bridge/common/graph-view-state.type.ts';
import type { PanelSide } from '../common/graph-page.type.ts';
import { TASK_CONTROLS_ID, TASK_DETAILS_ID, TASK_MODE_CLASS } from '../common/graph-task.const.ts';
import { CONTROLS_ID, DEFAULT_PANEL_WIDTHS, DETAILS_ID } from '../common/graph.const.ts';
import type { PanelSashDeps } from '../common/panel-sash.type.ts';
import { clampedWidthsOf, maxWidthOf } from '../utils/panel-widths.util.ts';

const PACKAGE_PANEL_IDS: Readonly<Record<PanelSide, string>> = { controls: CONTROLS_ID, details: DETAILS_ID };

const TASK_PANEL_IDS: Readonly<Record<PanelSide, string>> = { controls: TASK_CONTROLS_ID, details: TASK_DETAILS_ID };

const SIDES: PanelSide[] = ['controls', 'details'];

/**
 * Draws the panels at their preferred widths clamped to the body: the `--tc-controls-width` and `--tc-details-width`
 * variables `graph.css` sizes the panels and places the sashes by, and on each sash its value, its max and the panel of
 * the mode on screen it controls.
 */
class GraphPanelSashes {
  private readonly deps: PanelSashDeps;
  private readonly preferred: PanelWidths;

  public constructor(deps: PanelSashDeps) {
    this.deps = deps;
    this.preferred = deps.store.panelWidths() ?? DEFAULT_PANEL_WIDTHS;
  }

  /** Never saves: the drawn widths follow the body, the saved ones change only on a resize by the user. */
  public render(): void {
    const { body, overlay } = this.deps;
    const drawn = clampedWidthsOf(this.preferred, body.clientWidth, overlay.matches, null);

    this.paint(drawn);

    for (const side of SIDES) this.describe(side, drawn);
  }

  private paint(drawn: PanelWidths): void {
    const { style } = this.deps.body;

    style.setProperty('--tc-controls-width', `${drawn.controls}px`);
    style.setProperty('--tc-details-width', `${drawn.details}px`);
  }

  private describe(side: PanelSide, drawn: PanelWidths): void {
    const { root, body, overlay, sashes } = this.deps;
    const max = maxWidthOf(side, this.preferred, body.clientWidth, overlay.matches);
    const isTaskMode = root.classList.contains(TASK_MODE_CLASS);
    const ids = isTaskMode ? TASK_PANEL_IDS : PACKAGE_PANEL_IDS;
    const sash = sashes[side];

    sash.setAttribute('aria-valuenow', String(drawn[side]));
    sash.setAttribute('aria-valuemax', String(max));
    sash.setAttribute('aria-controls', ids[side]);
  }
}

/** Draws the sashes once, then again when the body resizes, the overlay query flips or a mode switch moves `aria-controls`. */
export const wirePanelSashes = (deps: PanelSashDeps): GraphPanelSashes => {
  const { root, body, overlay } = deps;
  const sashes = new GraphPanelSashes(deps);
  const render = (): void => sashes.render();

  sashes.render();
  new ResizeObserver(render).observe(body);
  overlay.addEventListener('change', render);
  new MutationObserver(render).observe(root, { attributes: true, attributeFilter: ['class'] });

  return sashes;
};
