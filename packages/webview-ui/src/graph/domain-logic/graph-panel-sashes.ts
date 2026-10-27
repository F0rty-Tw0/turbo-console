import { wireSashInput } from './graph-sash-input.ts';
import type { PanelWidths } from '../../bridge/common/graph-view-state.type.ts';
import { TASK_CONTROLS_ID, TASK_DETAILS_ID, TASK_MODE_CLASS } from '../common/graph-task.const.ts';
import { CONTROLS_ID, DEFAULT_PANEL_WIDTHS, DETAILS_ID } from '../common/graph.const.ts';
import type { PanelSashDeps, PanelSide } from '../common/panel-sash.type.ts';
import { clampedWidthsOf, maxWidthOf } from '../utils/panel-widths.util.ts';

const PACKAGE_PANEL_IDS: Readonly<Record<PanelSide, string>> = { controls: CONTROLS_ID, details: DETAILS_ID };

const TASK_PANEL_IDS: Readonly<Record<PanelSide, string>> = { controls: TASK_CONTROLS_ID, details: TASK_DETAILS_ID };

const SIDES: PanelSide[] = ['controls', 'details'];

/** What the widths are clamped to: the body's width and whether Details floats over the canvas. */
type BodyBox = { readonly width: number; readonly isOverlay: boolean };

/**
 * Draws the panels at their preferred widths clamped to the body: the `--tc-controls-width` and `--tc-details-width`
 * variables `graph.css` sizes the panels and places the sashes by, and on each sash its value, its max and the panel of
 * the mode on screen it controls. A drag or key changes the preferred width of its side only.
 */
class GraphPanelSashes {
  private readonly deps: PanelSashDeps;
  private preferred: PanelWidths;
  private drawn: PanelWidths;
  private painted: BodyBox | null = null;

  public constructor(deps: PanelSashDeps) {
    this.deps = deps;
    this.preferred = deps.store.panelWidths() ?? DEFAULT_PANEL_WIDTHS;
    this.drawn = this.preferred;
  }

  /** Never saves: the drawn widths follow the body, the saved ones change only on a resize by the user. */
  public render(): void {
    const box = this.boxNow();
    const isPainted = this.isPainted(box);

    if (isPainted) return;

    const drawn = clampedWidthsOf(this.preferred, box.width, box.isOverlay, null);

    this.paint(drawn, box);
  }

  /** Keeps each sash's value, max and panel current for the drawn pair; clamps nothing. */
  public describeAll(): void {
    const box = this.boxNow();

    for (const side of SIDES) this.describe(side, this.drawn, box);
  }

  public widthOf(side: PanelSide): number {
    return this.drawn[side];
  }

  public maxOf(side: PanelSide): number {
    const box = this.boxNow();

    return maxWidthOf(side, this.preferred, box.width, box.isOverlay);
  }

  /** Sets `side`'s preferred width to what fits and draws it, the other side shrinking first; saves nothing. */
  public resize(side: PanelSide, px: number): void {
    const box = this.boxNow();
    const wanted: PanelWidths = { ...this.preferred, [side]: px };
    const drawn = clampedWidthsOf(wanted, box.width, box.isOverlay, side);

    this.preferred = { ...this.preferred, [side]: drawn[side] };
    this.paint(drawn, box);
  }

  /** Saves the preferred widths: a side squeezed by the other keeps what it was. */
  public commit(): void {
    this.deps.store.savePanelWidths(this.preferred);
  }

  public reset(side: PanelSide): void {
    this.resize(side, DEFAULT_PANEL_WIDTHS[side]);
    this.commit();
  }

  private boxNow(): BodyBox {
    const { body, overlay } = this.deps;
    const box: BodyBox = { width: body.clientWidth, isOverlay: overlay.matches };

    return box;
  }

  /** The last paint was at this body width and overlay state, so a re-clamp would only undo a drag's squeeze. */
  private isPainted(box: BodyBox): boolean {
    const { painted } = this;

    if (painted === null) return false;

    return painted.width === box.width && painted.isOverlay === box.isOverlay;
  }

  private paint(drawn: PanelWidths, box: BodyBox): void {
    const { style } = this.deps.body;

    this.drawn = drawn;
    this.painted = box;
    style.setProperty('--tc-controls-width', `${drawn.controls}px`);
    style.setProperty('--tc-details-width', `${drawn.details}px`);

    for (const side of SIDES) this.describe(side, drawn, box);
  }

  private describe(side: PanelSide, drawn: PanelWidths, box: BodyBox): void {
    const { root, sashes } = this.deps;
    const max = maxWidthOf(side, this.preferred, box.width, box.isOverlay);
    const isTaskMode = root.classList.contains(TASK_MODE_CLASS);
    const ids = isTaskMode ? TASK_PANEL_IDS : PACKAGE_PANEL_IDS;
    const sash = sashes[side];

    sash.setAttribute('aria-valuenow', String(drawn[side]));
    sash.setAttribute('aria-valuemax', String(max));
    sash.setAttribute('aria-controls', ids[side]);
  }
}

/**
 * Draws the sashes once, then again when the body's width changes or the overlay query flips; a mode switch only moves
 * `aria-controls`, so a drag's squeezed pair stays as drawn.
 */
export const wirePanelSashes = (deps: PanelSashDeps): void => {
  const { root, body, overlay, sashes: elements } = deps;
  const sashes = new GraphPanelSashes(deps);
  const render = (): void => sashes.render();

  sashes.render();
  new ResizeObserver(render).observe(body);
  overlay.addEventListener('change', render);
  new MutationObserver((): void => sashes.describeAll()).observe(root, { attributes: true, attributeFilter: ['class'] });

  for (const side of SIDES) wireSashInput(side, elements[side], sashes, body);
};
