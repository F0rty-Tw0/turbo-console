import { LinkLookups } from './graph-details-lookups.ts';
import { shownHintOf } from './graph-details-picking.ts';
import { focusedNameOf, hadFocusOf, refocusList, updateView } from './graph-details-render.ts';
import { emptyOf, wiredViewOf } from './graph-details-wire.ts';
import { onPanelKey } from './graph-inspection-details.ts';
import type {
  DetailsContext,
  DetailsEnv,
  DetailsPlan,
  DetailsView,
  GraphDetailsDeps,
  LookupReply,
  ShownHint,
  ShownInspection
} from '../common/graph-details.type.ts';
import type { LinkInspection } from '../common/inspection.type.ts';
import { detailsPlanOf } from '../utils/details-plan.util.ts';

const NOTHING_SHOWN: ShownInspection = { kind: 'none' };

/**
 * The details panel: one view at a time for the inspection, swapped, updated in place or rebuilt by `show`, with
 * the spec §4.5 focus rules; the link look-ups (`LinkLookups`); the canvas hint while picking; open state and the
 * overlay layout.
 */
export class GraphDetails {
  private readonly deps: GraphDetailsDeps;
  private readonly lookups: LinkLookups;
  private aside: HTMLElement | null = null;
  private content: HTMLElement | null = null;
  private view: DetailsView | null = null;
  private shown: ShownInspection | null = null;
  private context: DetailsContext | null = null;
  private hint: ShownHint | null = null;
  private open = true;

  public constructor(deps: GraphDetailsDeps) {
    this.deps = deps;
    this.lookups = new LinkLookups(deps, (): DetailsEnv => this.envOf());
    deps.page.details.addEventListener('click', (): void => this.toggle());
    deps.overlay.addEventListener('change', (): void => this.relayout());
  }

  /**
   * The first call builds the panel after the container and shows the Empty view, under the Details bar only in package
   * mode: task mode holds the bar in its own panel and hands it over as it ends. Every call sets openness, quietly.
   */
  public mount(body: HTMLElement, open: boolean): void {
    this.open = open;

    if (this.aside === null) {
      const { panel, content } = this.deps.views.build();
      const view = emptyOf(this.envOf());
      const isPackageMode = this.deps.isPackageMode();

      panel.addEventListener('keydown', (event): void => onPanelKey(event, this.deps));
      content.replaceChildren(view.root);

      if (isPackageMode) panel.prepend(this.deps.page.detailsBar);

      body.append(panel);
      this.aside = panel;
      this.content = content;
      this.view = view;
      this.shown = NOTHING_SHOWN;
    }

    this.applyOpen();
  }

  public show(inspection: ShownInspection, context: DetailsContext): void {
    const { content } = this;

    if (content === null) return;

    const plan = detailsPlanOf(this.shown, inspection, context.isRebuild);
    const hadFocus = hadFocusOf(content, this.deps.page.clear, inspection);
    const focused = focusedNameOf(content);
    const isUpdated = this.updated(plan, inspection, context, focused);

    if (!isUpdated) this.build(content, inspection, context, hadFocus);

    this.hint = shownHintOf(this.hint, inspection, this.deps);
    this.shown = inspection;
    this.context = context;
  }

  /** A reply for the shown link: its manifest entry updates the explain block, its imports are held. */
  public replied(message: LookupReply): void {
    this.lookups.replied(message, this.view);
  }

  /** A same-hash state asks the host again about the shown link. */
  public reasked(link: LinkInspection): void {
    this.lookups.reasked(link);
  }

  public isOpen(): boolean {
    return this.open;
  }

  /** The aside while it is open over the canvas, else `null` (docked, closed or not mounted). */
  public overlayPanel(): HTMLElement | null {
    const isOverlay = this.deps.overlay.matches;

    return isOverlay && this.open ? this.aside : null;
  }

  private envOf(): DetailsEnv {
    const env: DetailsEnv = {
      deps: this.deps,
      isOverlay: this.deps.overlay.matches,
      onClose: (): void => this.close(),
      shown: (): ShownInspection | null => this.shown,
      context: (): DetailsContext | null => this.context
    };

    return env;
  }

  /** Updates the shown view in place when the plan says so and it can; a list rebuilt in place applies the removed-focus rule. */
  private updated(plan: DetailsPlan, inspection: ShownInspection, context: DetailsContext, focused: string | null): boolean {
    const { view } = this;

    if (plan !== 'update' || view === null) return false;

    const isUpdated = updateView(view, inspection, context, this.deps);

    if (isUpdated) refocusList(view, focused);

    return isUpdated;
  }

  /** A view built with `hadFocus` (see `hadFocusOf`) takes focus to its heading (spec §4.5). */
  private build(content: HTMLElement, inspection: ShownInspection, context: DetailsContext, hadFocus: boolean): void {
    const view = wiredViewOf(inspection, context, this.envOf());

    content.replaceChildren(view.root);
    this.view = view;

    if (hadFocus) view.heading.focus();

    this.lookups.built(inspection, view);
  }

  private toggle(): void {
    const isPackageMode = this.deps.isPackageMode();

    if (this.aside !== null && isPackageMode) this.setOpen(!this.open);
  }

  private close(): void {
    this.setOpen(false);
    this.deps.page.details.focus();
  }

  private applyOpen(): void {
    if (this.aside !== null) this.aside.hidden = !this.open;

    this.deps.page.details.setAttribute('aria-expanded', String(this.open));
  }

  /** The docked panel takes canvas width, so the canvas is re-measured; the overlay leaves it alone. */
  private setOpen(open: boolean): void {
    this.open = open;
    this.applyOpen();

    if (!this.deps.overlay.matches) this.deps.onResize();

    this.deps.onSave();

    if (open) this.deps.onOpened();
  }

  /** The overlay never opens on its own; a close button that had focus hands it to the Details toggle. */
  private relayout(): void {
    const close = this.view?.close ?? null;
    const isOverlay = this.deps.overlay.matches;

    if (this.aside === null) return;

    if (close !== null) {
      const hadFocus = document.activeElement === close;

      close.hidden = !isOverlay;

      if (hadFocus) this.deps.page.details.focus();
    }

    if (this.open) this.deps.onResize();

    this.deps.onLayout();
  }
}
