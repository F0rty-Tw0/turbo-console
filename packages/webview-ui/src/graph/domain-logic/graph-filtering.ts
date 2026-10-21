import { GraphControls } from './graph-controls.ts';
import { GraphInspection } from './graph-inspection.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { GraphControlsDeps, GraphFilteringDeps } from '../common/graph-controls.type.ts';
import type { GraphInspectionDeps } from '../common/graph-inspection.type.ts';
import type { ControlsViewFields, DrawnGraph } from '../common/graph-page.type.ts';
import type { ProbeFacts } from '../common/graph-probe.type.ts';
import { freshViewStateOf } from '../utils/fresh-view-state.util.ts';

type FilteringFacts = Pick<
  ProbeFacts,
  'controlsBuiltMs' | 'filterAppliedMs' | 'selected' | 'inspection' | 'detailsBuiltMs' | 'pickingBuiltMs' | 'traceMs'
>;

/**
 * The controls panel and the inspection it drives; the only place that knows both `GraphControls` and
 * `GraphInspection`. A visible set the controls report is shown, re-checks the inspection and refits; the restored
 * one is shown without a fit.
 */
export class GraphFiltering {
  public readonly inspection: GraphInspection;

  private readonly deps: GraphFilteringDeps;
  private readonly controls: GraphControls;
  private builtMs: number | null = null;
  private appliedMs: number | null = null;

  public constructor(deps: GraphFilteringDeps) {
    const { page, view, build, now } = deps;
    const controlsDeps: GraphControlsDeps = {
      page,
      build,
      now,
      onVisibleChange: (visible): void => this.showVisible(visible),
      onSelect: (name): void => this.inspection.select(name),
      onFocused: (name): void => this.inspection.focused(name),
      onOpenDetails: (): void => this.inspection.openDetails(),
      onSave: (): void => this.inspection.save(),
      onResize: (): void => view.resize()
    };
    const inspectionDeps: GraphInspectionDeps = {
      ...deps,
      visible: (): ReadonlySet<string> => this.controls.visible(),
      focus: (): string | null => this.controls.focusName(),
      controls: (): ControlsViewFields => this.controls.fields(),
      onSelected: (name): void => this.controls.markSelected(name),
      onFocusOn: (name): void => this.controls.focusOn(name),
      onExclude: (name): void => this.controls.exclude(name),
      // Task 3.5 wires Show to the controls.
      onShow: (): void => undefined
    };

    this.deps = deps;
    this.controls = new GraphControls(controlsDeps);
    this.inspection = new GraphInspection(inspectionDeps);
  }

  /** Builds the panel for `graph` from `saved` (defaults without one) and shows its visible set; `at` is the state's arrival. */
  public restore(saved: GraphViewState | null, graph: DrawnGraph, at: number): ReadonlySet<string> {
    const state = saved ?? freshViewStateOf(graph.hash);

    this.controls.restore(state, graph);
    this.builtMs = this.deps.now() - at;

    const visible = this.controls.visible();

    this.deps.view.setVisible(visible);
    this.deps.page.fit.disabled = visible.size === 0;

    return visible;
  }

  public facts(): FilteringFacts {
    const inspectionFacts = this.inspection.facts();
    const facts: FilteringFacts = {
      controlsBuiltMs: (): number | null => this.builtMs,
      filterAppliedMs: (): number | null => this.appliedMs,
      ...inspectionFacts
    };

    return facts;
  }

  private showVisible(visible: ReadonlySet<string>): void {
    const { view, page, now } = this.deps;
    const isAny = visible.size > 0;

    view.setVisible(visible);
    this.inspection.recheck(visible);
    page.fit.disabled = !isAny;

    if (isAny) view.fit();

    const inputAt = this.controls.inputAt();

    if (inputAt !== null) this.appliedMs = now() - inputAt;
  }
}
