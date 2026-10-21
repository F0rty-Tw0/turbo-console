import { ControlsKeyboard } from './controls-keyboard.ts';
import { mountRestoredPanel } from './controls-panel-mount.ts';
import { wireControls } from './graph-controls-events.ts';
import { renderControls, renderSearch, revealSelected } from './graph-controls-render.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ControlsElements } from '../common/controls-elements.type.ts';
import type { ControlsActions, ControlsView, GraphControlsDeps, KeyboardDeps } from '../common/graph-controls.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import type { ControlsViewFields, DrawnGraph } from '../common/graph-page.type.ts';
import { DEFAULT_DEPTH } from '../common/graph.const.ts';
import {
  depthOf,
  focusOn,
  isFiltered,
  sameMembers,
  showAllOf,
  toggleGroup,
  toggleRow,
  withDepth,
  withTag
} from '../utils/controls-rules.util.ts';
import { folderGroupsOf, tagsOf } from '../utils/folder-group.util.ts';
import { controlsFieldsOf, restoredFilters } from '../utils/restored-filters.util.ts';
import { visibleOf } from '../utils/visibility.util.ts';

type Mounted = {
  readonly graph: DrawnGraph;
  readonly elements: ControlsElements;
};

const NO_FILTERS: GraphFilters = { hidden: new Set(), focus: null, tags: new Set() };

/**
 * The controls panel's state: the filters, the search, the focus depth and whether the panel is open. A listener
 * changes the state, renders it, reports a changed visible set, then asks for a save; `restore` reports nothing.
 */
export class GraphControls {
  private readonly deps: GraphControlsDeps;
  private mounted: Mounted | null = null;
  private applied = NO_FILTERS;
  private shown = new Set<string>();
  private search = '';
  private depth = DEFAULT_DEPTH;
  private isOpen = true;
  private selected: string | null = null;
  private stamp: number | null = null;

  public constructor(deps: GraphControlsDeps) {
    this.deps = deps;
    deps.page.controls.addEventListener('click', (): void => this.toggleOpen());
  }

  public visible(): ReadonlySet<string> {
    return this.shown;
  }

  public inputAt(): number | null {
    return this.stamp;
  }

  public fields(): ControlsViewFields {
    return controlsFieldsOf(this.applied, this.search, this.depth, this.isOpen);
  }

  public markSelected(name: string | null): void {
    this.selected = name;
    this.render();

    if (this.mounted !== null) revealSelected(this.mounted.elements, name, this.isOpen);
  }

  /** Builds and swaps in the panel for `graph` and applies the saved state; no `onVisibleChange`, no `onSave`. */
  public restore(state: GraphViewState, graph: DrawnGraph): void {
    const elements = this.deps.build(folderGroupsOf(graph.infos), tagsOf(graph.infos));
    const restored = restoredFilters(state, graph);
    const mounted: Mounted = { graph, elements };
    const previous = this.mounted?.elements ?? null;

    mountRestoredPanel(this.deps.page.body, previous, elements, restored);
    this.mounted = mounted;
    this.applied = restored.filters;
    this.search = restored.search;
    this.depth = restored.depth;
    this.isOpen = restored.isOpen;
    this.stamp = null;
    wireControls(elements, this.actionsOf(mounted));
    renderSearch(elements, graph.infos, restored.search);
    const keyboardDeps: KeyboardDeps = {
      ...this.deps,
      isVisible: (name): boolean => this.shown.has(name),
      selected: (): string | null => this.selected
    };

    new ControlsKeyboard(elements, keyboardDeps);
    this.shown = visibleOf(graph.infos, graph.edges, this.applied);
    this.render();
  }

  private actionsOf(mounted: Mounted): ControlsActions {
    const actions: ControlsActions = {
      onRow: (name, isChecked): void => this.edit(mounted, toggleRow(this.applied, name, isChecked)),
      onGroup: (names, isChecked): void => this.edit(mounted, toggleGroup(this.applied, names, isChecked)),
      onFocus: (name): void => this.focus(mounted, name),
      onDepth: (text): void => this.setDepth(mounted, text),
      onDepthBlur: (): void => {
        mounted.elements.depth.value = String(this.depth);
      },
      onTag: (tag, isChecked): void => this.change(mounted, withTag(this.applied, tag, isChecked)),
      onShowAll: (): void => this.showAll(mounted),
      onSearch: (text): void => this.setSearch(mounted, text),
      onPick: (name): void => this.pick(name)
    };

    return actions;
  }

  /** A rule that returns the same filters ignored the input (the focused row, a locked group): repaint, undoing the toggle. */
  private edit(mounted: Mounted, next: GraphFilters): void {
    if (next === this.applied) this.render();
    else this.change(mounted, next);
  }

  private focus(mounted: Mounted, name: string): void {
    const next = focusOn(this.applied, name, this.depth);

    this.change(mounted, next);

    if (next.focus !== null) this.deps.onSelect(name, false);
  }

  private setDepth(mounted: Mounted, text: string): void {
    const depth = depthOf(text);

    if (depth === null) return;

    this.depth = depth;
    this.change(mounted, withDepth(this.applied, depth));
  }

  private showAll(mounted: Mounted): void {
    const isOn = isFiltered(this.applied);

    if (isOn) this.change(mounted, showAllOf(this.applied));
  }

  private setSearch(mounted: Mounted, text: string): void {
    this.search = text;
    renderSearch(mounted.elements, mounted.graph.infos, text);
    this.deps.onSave();
  }

  private pick(name: string): void {
    const isVisible = this.shown.has(name);

    if (isVisible) this.deps.onSelect(name, true);
  }

  private toggleOpen(): void {
    this.isOpen = !this.isOpen;
    this.render();

    this.deps.onResize();
    this.deps.onSave();
  }

  private render(): void {
    const { mounted, applied, shown, selected, isOpen } = this;

    if (mounted === null) return;

    const view: ControlsView = { filters: applied, visible: shown, total: mounted.graph.infos.length, selected, isOpen };

    renderControls(mounted.elements, this.deps.page, view);
  }

  private change(mounted: Mounted, next: GraphFilters): void {
    const { graph } = mounted;
    const before = this.shown;

    this.stamp = this.deps.now();
    this.applied = next;
    this.shown = visibleOf(graph.infos, graph.edges, next);
    this.render();

    const isSame = sameMembers(before, this.shown);

    if (!isSame) this.deps.onVisibleChange(this.shown);

    this.deps.onSave();
  }
}
