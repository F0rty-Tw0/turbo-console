import { GraphControls } from './graph-controls.ts';
import { GraphSelection } from './graph-selection.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { GraphControlsDeps, GraphFilteringDeps } from '../common/graph-controls.type.ts';
import type { ControlsViewFields, DrawnGraph, GraphSelectionDeps } from '../common/graph-page.type.ts';
import type { ProbeFacts } from '../common/graph-probe.type.ts';
import { freshViewStateOf } from '../utils/fresh-view-state.util.ts';
import { visibleSelection } from '../utils/visible-selection.util.ts';

type FilteringFacts = Pick<ProbeFacts, 'controlsBuiltMs' | 'filterAppliedMs'>;

/**
 * The controls panel and the selection it drives; the only place that knows `GraphControls`. A visible set the
 * controls report is shown, drops a selection it leaves out and refits; the restored one is shown without a fit.
 */
export class GraphFiltering {
  public readonly selection: GraphSelection;

  private readonly deps: GraphFilteringDeps;
  private readonly controls: GraphControls;
  private builtMs: number | null = null;
  private appliedMs: number | null = null;

  public constructor(deps: GraphFilteringDeps) {
    const { bridge, page, view, saver, drawn, build, now } = deps;
    const controlsDeps: GraphControlsDeps = {
      page,
      build,
      now,
      onVisibleChange: (visible): void => this.showVisible(visible),
      onSelect: (name, pan): void => this.select(name, pan),
      onOpenDetails: (): void => this.selection.openDetails(),
      onSave: (): void => this.selection.save(),
      onResize: (): void => view.resize()
    };
    const selectionDeps: GraphSelectionDeps = {
      bridge,
      page,
      view,
      saver,
      drawn,
      controls: (): ControlsViewFields => this.controls.fields(),
      onSelected: (name): void => this.controls.markSelected(name)
    };

    this.deps = deps;
    this.controls = new GraphControls(controlsDeps);
    this.selection = new GraphSelection(selectionDeps);
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
    const facts: FilteringFacts = {
      controlsBuiltMs: (): number | null => this.builtMs,
      filterAppliedMs: (): number | null => this.appliedMs
    };

    return facts;
  }

  private showVisible(visible: ReadonlySet<string>): void {
    const { view, page, now } = this.deps;
    const selected = this.selection.current();
    const kept = visibleSelection(selected, visible);
    const isLost = kept !== selected;
    const isAny = visible.size > 0;

    view.setVisible(visible);

    if (isLost) this.selection.select(null);

    page.fit.disabled = !isAny;

    if (isAny) view.fit();

    const inputAt = this.controls.inputAt();

    if (inputAt !== null) this.appliedMs = now() - inputAt;
  }

  private select(name: string, pan: boolean): void {
    this.selection.select(name);

    if (pan) this.deps.view.centreOn(name);
  }
}
