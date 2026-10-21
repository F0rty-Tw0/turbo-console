import { GraphDetails } from './graph-details.ts';
import { detailsDepsOf, wireInspectionKeys } from './graph-inspection-details.ts';
import { keepClearInspection } from './graph-keep-clear.ts';
import { InspectionCanvas } from './inspection-canvas.ts';
import { scheduleSave } from './inspection-save.ts';
import type { GraphEdgeExplainedMessage } from '../../bridge/common/graph-message.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { DetailsContext } from '../common/graph-details.type.ts';
import type { CanvasShown, GraphInspectionDeps, InspectionSave, KeepClearDeps } from '../common/graph-inspection.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection, InspectionInput } from '../common/inspection.type.ts';
import type { KeepClearTrigger } from '../common/keep-clear.type.ts';
import { freshViewStateOf } from '../utils/fresh-view-state.util.ts';
import { focusInputOf, sameHashPlanOf, shouldPan } from '../utils/inspection-flow.util.ts';
import { candidatesFor, selectedOf, traceFor } from '../utils/inspection-parts.util.ts';
import { recheckInspection } from '../utils/inspection-recheck.util.ts';
import { restoredInspection } from '../utils/inspection-state.util.ts';
import { inspectionTextOf } from '../utils/inspection-text.util.ts';
import { nextInspection } from '../utils/inspection.util.ts';
import { shouldKeepClear } from '../utils/keep-clear-trigger.util.ts';
import { showableNamesOf } from '../utils/showable.util.ts';

/**
 * The live inspection and everything that shows it: the details panel, the canvas, the status line and
 * `Clear selection`; the taps, keys and panel actions that change it; its saves, its restore and the same-hash path.
 * Keys are handled on the graph container only, so a key on a toolbar button never acts here.
 */
export class GraphInspection {
  private readonly deps: GraphInspectionDeps;
  private readonly details: GraphDetails;
  private readonly timings = new Map<string, number>();
  private readonly canvas: InspectionCanvas;
  private inspection: Inspection = NO_INSPECTION;

  public constructor(deps: GraphInspectionDeps) {
    this.deps = deps;
    this.canvas = new InspectionCanvas(deps.view);
    this.details = new GraphDetails(detailsDepsOf(deps, this));
    wireInspectionKeys(deps.page, this);
  }

  public current(): Inspection {
    return this.inspection;
  }

  public selected(): string | null {
    return selectedOf(this.inspection);
  }

  /** Applies the input; the camera moves only when `shouldPan` says so, then keeps the anchors clear of an overlay. */
  public input(input: InspectionInput): void {
    const next = nextInspection(this.inspection, input);
    const isPan = shouldPan(input, next);

    this.apply(next, false);

    if (isPan && next.kind === 'package') this.deps.view.centreOn(next.name);

    this.keepClear('input');
  }

  /** Pans the inspection's anchors clear of the open overlay; restore and refresh never pan. */
  public keepClear(trigger: KeepClearTrigger): void {
    const { view, page } = this.deps;
    const isPan = shouldKeepClear(trigger, this.details.isOverlay(), this.details.isOpen());
    const keepDeps: KeepClearDeps = { view, page, inspection: this.inspection };

    if (isPan) keepClearInspection(keepDeps);
  }

  /** A package chosen in the controls list or search. */
  public select(name: string): void {
    this.input({ kind: 'select', name, via: 'list' });
  }

  public tapNode(name: string): void {
    this.input({ kind: 'select', name, via: 'canvas' });
    this.deps.page.container.focus();
  }

  public tapEdge(source: string, target: string): void {
    this.input({ kind: 'tapLink', source, target });
    this.deps.page.container.focus();
  }

  /** A list Focus toggle: selects the new focus, or only refreshes the views (picking, a cleared focus). */
  public focused(name: string | null): void {
    const input = focusInputOf(this.inspection, name);

    if (input === null) this.apply(this.inspection, false);
    else this.input(input);
  }

  /** Builds the details panel; call before the camera step, so the fit sees the narrowed container. */
  public mount(saved: GraphViewState | null): void {
    this.details.mount(this.deps.page.body, saved?.detailsOpen ?? true);
  }

  /** After a filter change: keeps, narrows or drops the inspection for the new visible set. */
  public recheck(visible: ReadonlySet<string>): void {
    const drawn = this.deps.drawn();

    if (drawn === null) return;

    const next = recheckInspection(this.inspection, visible, drawn.edges);

    this.apply(next, false);
  }

  /** Rebuilds the saved inspection, or none, for the placed graph; a restored link asks for its entry again. */
  public restore(saved: GraphViewState | null, visible: ReadonlySet<string>): void {
    const drawn = this.deps.drawn();

    if (drawn === null) return;

    const state = saved ?? freshViewStateOf(drawn.hash);
    const restored = restoredInspection(state, drawn.edges, visible);

    this.apply(restored, true);
  }

  /** A same-hash state: relabels a shown package's task count in place, or asks again for a shown link's entry. */
  public refreshed(isChanged: boolean): void {
    const { inspection } = this;
    const plan = sameHashPlanOf(inspection, isChanged);
    const isReask = plan.isReask && inspection.kind === 'link';

    if (plan.isUpdate) this.apply(inspection, false);

    if (isReask) this.deps.bridge.post({ type: 'explainEdge', source: inspection.source, target: inspection.target });
  }

  public explained(message: GraphEdgeExplainedMessage): void {
    this.details.explained(message);
  }

  /** Forgets the inspection without saving it, for a page about to show another graph or none; the panel stays. */
  public reset(): void {
    this.inspection = NO_INSPECTION;
    this.canvas.reset();
    this.deps.page.status.textContent = '';
    this.deps.page.clear.disabled = true;
    this.deps.onSelected(null);
  }

  /** Saves the camera, the inspection, the details panel and the controls at once. */
  public save(): void {
    this.saveViewport();
    this.deps.saver.flush();
  }

  /** Schedules a debounced save. */
  public saveViewport(): void {
    const shown: InspectionSave = { inspection: this.inspection, detailsOpen: this.details.isOpen() };

    scheduleSave(this.deps, shown);
  }

  public openDetails(): void {
    const name = this.selected();

    if (name !== null) this.deps.bridge.post({ type: 'openDetails', packageName: name });
  }

  /** How long the latest inspection of `kind` took from being set to its details view shown; `null` until one did. */
  public builtMs(kind: Inspection['kind']): number | null {
    return this.timings.get(kind) ?? null;
  }

  /** Shows `next` everywhere and saves it; `isRebuild` builds the details view again (a restore). */
  private apply(next: Inspection, isRebuild: boolean): void {
    const { deps } = this;
    const drawn = deps.drawn();

    if (drawn === null) return;

    const started = deps.now();
    const visible = deps.visible();
    const trace = traceFor(next, drawn.edges);
    const candidates = candidatesFor(next, drawn.edges, visible);
    const showable = showableNamesOf(trace?.path ?? [], visible, deps.canShow);
    const context: DetailsContext = { drawn, visible, focus: deps.focus(), trace, candidates, showable, isRebuild };
    const shown: CanvasShown = { inspection: next, drawn, visible, trace, candidates };

    this.inspection = next;
    this.details.show(next, context);
    this.timings.set(next.kind, deps.now() - started);
    this.canvas.draw(shown, isRebuild);
    deps.page.status.textContent = inspectionTextOf(next, drawn.edges, trace, visible);
    deps.page.clear.disabled = next.kind === 'none';
    deps.onSelected(selectedOf(next));
    this.save();
  }

  /** The picking filter changed: only the canvas lights follow, as the panel updated its own lists. */
  public filter(text: string): void {
    this.canvas.filter(text);
  }
}
