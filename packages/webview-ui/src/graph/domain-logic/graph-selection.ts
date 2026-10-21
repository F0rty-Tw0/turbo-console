import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { Closure } from '../common/closure.type.ts';
import type { DrawnGraph, GraphSelectionDeps } from '../common/graph-page.type.ts';
import { closureOf } from '../utils/closure.util.ts';
import { selectionText } from '../utils/selection-text.util.ts';

const closureIn = (drawn: DrawnGraph, name: string | null): Closure | null => {
  if (name === null) return null;

  return closureOf(name, drawn.edges);
};

/**
 * The selected package, its highlight, the status line and the `Clear selection` state, and the taps and keys that
 * change it or open Details. Keys are handled on the graph container only, so a key on a toolbar button never acts here.
 */
export class GraphSelection {
  private readonly deps: GraphSelectionDeps;
  private selected: string | null = null;

  public constructor(deps: GraphSelectionDeps) {
    this.deps = deps;
    deps.page.clear.addEventListener('click', (): void => this.select(null));
    deps.page.container.addEventListener('keydown', (event: KeyboardEvent): void => this.onKey(event));
  }

  public current(): string | null {
    return this.selected;
  }

  /** Selects `name` (`null` clears) in the drawn graph, marks it in the controls, then saves the view state at once. */
  public select(name: string | null): void {
    const drawn = this.deps.drawn();

    if (drawn === null) return;

    const closure = closureIn(drawn, name);
    const { page, view } = this.deps;

    this.selected = name;
    view.select(name, closure);
    page.status.textContent = selectionText(name, closure);
    page.clear.disabled = name === null;
    this.deps.onSelected(name);
    this.save();
  }

  /** Forgets the selection without saving it, for a page about to show another graph or none. */
  public reset(): void {
    this.selected = null;
    this.deps.page.status.textContent = '';
    this.deps.page.clear.disabled = true;
    this.deps.onSelected(null);
  }

  /** Saves the camera, the selection and the controls at once. */
  public save(): void {
    const drawn = this.deps.drawn();

    if (drawn === null) return;

    const state = this.viewState(drawn);

    this.deps.saver.schedule(state);
    this.deps.saver.flush();
  }

  public tapNode(name: string): void {
    this.select(name);
    this.deps.page.container.focus();
  }

  public openDetails(): void {
    if (this.selected === null) return;

    this.deps.bridge.post({ type: 'openDetails', packageName: this.selected });
  }

  /** Schedules a debounced save of the camera and the selection. */
  public saveViewport(): void {
    const drawn = this.deps.drawn();

    if (drawn === null) return;

    const state = this.viewState(drawn);

    this.deps.saver.schedule(state);
  }

  private onKey(event: KeyboardEvent): void {
    if (event.repeat) return;

    if (event.key === 'Escape') this.select(null);

    if (event.key === 'Enter') this.openDetails();
  }

  private viewState(drawn: DrawnGraph): GraphViewState {
    const { zoom, pan } = this.deps.view.viewport();
    const controls = this.deps.controls();
    const state: GraphViewState = { hash: drawn.hash, zoom, pan, selected: this.selected, ...controls };

    return state;
  }
}
