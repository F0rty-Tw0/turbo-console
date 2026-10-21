import { GraphDetails } from './graph-details.ts';
import { detailsDepsOf, wireInspectionKeys } from './graph-inspection-details.ts';
import { scheduleSave } from './inspection-save.ts';
import type { GraphEdgeExplainedMessage } from '../../bridge/common/graph-message.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { DetailsContext } from '../common/graph-details.type.ts';
import type { GraphInspectionDeps, InspectionFacts, InspectionSave } from '../common/graph-inspection.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection, InspectionInput } from '../common/inspection.type.ts';
import type { TraceCandidates, TraceResult } from '../common/trace.type.ts';
import { freshViewStateOf } from '../utils/fresh-view-state.util.ts';
import { focusInputOf, sameHashPlanOf, shouldPan } from '../utils/inspection-flow.util.ts';
import { candidatesFor, litOf, selectedOf, traceFor } from '../utils/inspection-parts.util.ts';
import { recheckInspection } from '../utils/inspection-recheck.util.ts';
import { restoredInspection } from '../utils/inspection-state.util.ts';
import { inspectionTextOf } from '../utils/inspection-text.util.ts';
import { nextInspection } from '../utils/inspection.util.ts';
import { paintOf } from '../utils/paint.util.ts';

// Task 3.5 fills it from the controls.
const NO_SHOWABLE: ReadonlySet<string> = new Set();

/**
 * The live inspection and everything that shows it: the details panel, the canvas paint, the status line and
 * `Clear selection`; the taps, keys and panel actions that change it; its saves, its restore and the same-hash path.
 * Keys are handled on the graph container only, so a key on a toolbar button never acts here.
 */
export class GraphInspection {
  private readonly deps: GraphInspectionDeps;
  private readonly details: GraphDetails;
  private readonly timings = new Map<string, number>();
  private inspection: Inspection = NO_INSPECTION;
  private trace: TraceResult | null = null;
  private candidates: TraceCandidates | null = null;
  private filterText = '';

  public constructor(deps: GraphInspectionDeps) {
    this.deps = deps;
    this.details = new GraphDetails(detailsDepsOf(deps, this));
    wireInspectionKeys(deps.page, this);
  }

  public current(): Inspection {
    return this.inspection;
  }

  public selected(): string | null {
    return selectedOf(this.inspection);
  }

  /** Applies the input; the camera moves only when `shouldPan` says so. */
  public input(input: InspectionInput): void {
    const next = nextInspection(this.inspection, input);
    const isPan = shouldPan(input, next);

    this.apply(next, false);

    if (isPan && next.kind === 'package') this.deps.view.centreOn(next.name);
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
    this.trace = null;
    this.candidates = null;
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

  public facts(): InspectionFacts {
    const facts: InspectionFacts = {
      selected: (): string | null => this.selected(),
      inspection: (): Inspection => this.inspection,
      detailsBuiltMs: (): number | null => this.timings.get('package') ?? null,
      pickingBuiltMs: (): number | null => this.timings.get('picking') ?? null,
      traceMs: (): number | null => this.timings.get('trace') ?? null
    };

    return facts;
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
    const isSameStart = this.inspection.kind === 'picking' && next.kind === 'picking' && this.inspection.start === next.start;

    if (isRebuild || !isSameStart) this.filterText = '';

    this.inspection = next;
    this.trace = trace;
    this.candidates = candidates;

    const context: DetailsContext = { drawn, visible, focus: deps.focus(), trace, candidates, showable: NO_SHOWABLE, isRebuild };

    this.details.show(next, context);
    this.timings.set(next.kind, deps.now() - started);
    this.paint(drawn);
    deps.page.status.textContent = inspectionTextOf(next, drawn.edges, trace, visible);
    deps.page.clear.disabled = next.kind === 'none';
    deps.onSelected(selectedOf(next));
    this.save();
  }

  /** The picking filter changed: only the canvas lights follow, as the panel updated its own lists. */
  public filter(text: string): void {
    const drawn = this.deps.drawn();

    this.filterText = text;

    if (drawn !== null) this.paint(drawn);
  }

  /** While picking, the candidates the filter leaves are lit; an empty filter lights every path candidate. */
  private paint(drawn: DrawnGraph): void {
    const lit = litOf(this.candidates, drawn.infos, this.filterText);
    const paint = paintOf(this.inspection, drawn.edges, this.trace, lit);

    this.deps.view.paint(paint);
  }
}
