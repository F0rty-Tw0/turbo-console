import { shownHintOf } from './graph-details-picking.ts';
import { focusedNameOf, refocusList, updateExplain, updateView } from './graph-details-render.ts';
import { emptyOf, wireExplain, wiredViewOf } from './graph-details-wire.ts';
import type { GraphEdgeExplainedMessage } from '../../bridge/common/graph-message.type.ts';
import type { ExplainState } from '../common/details.type.ts';
import type {
  DetailsContext,
  DetailsEnv,
  DetailsPlan,
  DetailsView,
  GraphDetailsDeps,
  ShownExplain,
  ShownHint,
  ShownInspection
} from '../common/graph-details.type.ts';
import type { InspectionInput } from '../common/inspection.type.ts';
import { detailsPlanOf } from '../utils/details-plan.util.ts';
import { explainPlanOf, explainStateOf, isReplyFor } from '../utils/explain-state.util.ts';

const PANEL_ESCAPE: InspectionInput = { kind: 'escape', where: 'panel' };

const NOTHING_SHOWN: ShownInspection = { kind: 'none' };

/**
 * The details panel: one view at a time for the inspection, swapped, updated in place or rebuilt by `show`, with
 * the spec §4.5 focus rules; the explain replies; the canvas hint while picking; open state and the overlay layout.
 */
export class GraphDetails {
  private readonly deps: GraphDetailsDeps;
  private aside: HTMLElement | null = null;
  private view: DetailsView | null = null;
  private shown: ShownInspection | null = null;
  private context: DetailsContext | null = null;
  private explain: ShownExplain | null = null;
  private hint: ShownHint | null = null;
  private open = true;

  public constructor(deps: GraphDetailsDeps) {
    this.deps = deps;
    deps.page.details.addEventListener('click', (): void => this.toggle());
    deps.overlay.addEventListener('change', (): void => this.relayout());
  }

  /** The first call builds the panel after the container and shows the Empty view; every call sets openness, quietly. */
  public mount(body: HTMLElement, open: boolean): void {
    this.open = open;

    if (this.aside === null) {
      const aside = this.deps.views.build().panel;
      const view = emptyOf(this.envOf());

      aside.addEventListener('keydown', (event): void => this.keydown(event));
      aside.replaceChildren(view.root);
      body.append(aside);
      this.aside = aside;
      this.view = view;
      this.shown = NOTHING_SHOWN;
    }

    this.applyOpen();
  }

  public show(inspection: ShownInspection, context: DetailsContext): void {
    const { aside } = this;

    if (aside === null) return;

    const plan = detailsPlanOf(this.shown, inspection, context.isRebuild);
    const hadFocus = aside.contains(document.activeElement);
    const focused = focusedNameOf(aside);
    const isUpdated = this.updated(plan, inspection, context, focused);

    if (!isUpdated) this.build(aside, inspection, context, hadFocus);

    this.hint = shownHintOf(this.hint, inspection, this.deps);
    this.shown = inspection;
    this.context = context;
  }

  /** A reply for the shown link updates the explain block in place, or builds it again when its shape changed. */
  public explained(message: GraphEdgeExplainedMessage): void {
    const { view } = this;
    const isReply = isReplyFor(message, this.shown);

    if (!isReply || view?.kind !== 'link') return;

    const state = explainStateOf(message.result, message.target);
    const isUpdated = this.updatedExplain(state);

    if (isUpdated) return;

    const hadFocus = view.explain.contains(document.activeElement);
    const details = this.deps.views.explain(state);

    view.explain.replaceChildren(details.root);
    this.explain = { state, details };
    wireExplain(details, message.source, (): ExplainState | null => this.explain?.state ?? null, this.envOf());

    if (hadFocus) view.heading.focus();
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

    const isUpdated = updateView(view, inspection, context, this.deps.views);

    if (isUpdated) refocusList(view, focused);

    return isUpdated;
  }

  private updatedExplain(state: ExplainState): boolean {
    const { explain } = this;

    if (explain === null) return false;

    const plan = explainPlanOf(explain.state, state);

    if (plan === 'rebuild') return false;

    updateExplain(explain.details, state);
    this.explain = { state, details: explain.details };

    return true;
  }

  /** A view built while the panel held focus takes focus to its heading (spec §4.5). */
  private build(aside: HTMLElement, inspection: ShownInspection, context: DetailsContext, hadFocus: boolean): void {
    const view = wiredViewOf(inspection, context, this.envOf());

    aside.replaceChildren(view.root);
    this.view = view;
    this.explain = null;

    if (hadFocus) view.heading.focus();

    if (inspection.kind === 'link') this.deps.onExplain(inspection.source, inspection.target);
  }

  private keydown(event: KeyboardEvent): void {
    if (event.repeat) return;

    if (event.key === 'Escape') this.deps.onInput(PANEL_ESCAPE);
  }

  private toggle(): void {
    if (this.aside !== null) this.setOpen(!this.open);
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
