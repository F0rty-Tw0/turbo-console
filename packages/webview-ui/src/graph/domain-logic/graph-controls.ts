import { ControlsKeyboard, keyboardDepsOf } from './controls-keyboard.ts';
import { mountRestoredPanel } from './controls-panel-mount.ts';
import { controlsActionsOf } from './graph-controls-actions.ts';
import { wireControls } from './graph-controls-events.ts';
import { renderControls, renderSearch, revealSelected } from './graph-controls-render.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ControlsMounted, ControlsView, GraphControlsDeps } from '../common/graph-controls.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import type { ControlsViewFields, DrawnGraph } from '../common/graph-page.type.ts';
import { DEFAULT_DEPTH } from '../common/graph.const.ts';
import { focusFolderOn, focusOn, sameMembers } from '../utils/controls-rules.util.ts';
import { folderGroupsOf, tagsOf } from '../utils/folder-group.util.ts';
import { clearFolderFocusOf, excludeFolderOf, focusFolderOf, showFolderOf } from '../utils/folder-rules.util.ts';
import { controlsFieldsOf, restoredFilters } from '../utils/restored-filters.util.ts';
import { visibleOf } from '../utils/visibility.util.ts';

const NO_FILTERS: GraphFilters = { hidden: new Set(), focus: null, depth: DEFAULT_DEPTH, tags: new Set() };

/**
 * The controls panel's state: the filters, the search, the focus depth and whether the panel is open. A listener
 * changes the state, renders it, reports a changed visible set, then asks for a save; `restore` reports nothing.
 */
export class GraphControls {
  public applied = NO_FILTERS;
  public mounted: ControlsMounted | null = null;

  private readonly deps: GraphControlsDeps;
  private shown = new Set<string>();
  private search = '';
  private isOpen = true;
  private isGrouped = false;
  private collapsed: ReadonlySet<string> = new Set();
  private selected: string | null = null;
  private stamp: number | null = null;

  public constructor(deps: GraphControlsDeps) {
    this.deps = deps;
    deps.page.controls.addEventListener('click', (): void => this.toggleOpen());
  }

  public get depth(): number {
    return this.applied.depth;
  }

  public visible(): ReadonlySet<string> {
    return this.shown;
  }

  public inputAt(): number | null {
    return this.stamp;
  }

  public fields(): Omit<ControlsViewFields, 'collapsed'> {
    return controlsFieldsOf(this.applied, this.search, this.isOpen, this.isGrouped);
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
    const mounted: ControlsMounted = { graph, elements };
    const previous = this.mounted?.elements ?? null;

    mountRestoredPanel(this.deps.page.body, previous, elements, restored);
    this.mounted = mounted;
    this.applied = restored.filters;
    this.search = restored.search;
    this.isOpen = restored.isOpen;
    this.isGrouped = restored.isGrouped;
    this.stamp = null;
    wireControls(elements, controlsActionsOf(mounted, this, this.deps.onToggleFolder));
    renderSearch(elements, graph.infos, restored.search);
    const keyboardDeps = keyboardDepsOf(
      this.deps,
      (name): boolean => this.shown.has(name),
      (): string | null => this.selected
    );

    new ControlsKeyboard(elements, keyboardDeps);
    this.shown = visibleOf(graph.infos, graph.edges, this.applied);
    this.render();
  }

  /** A rule that returns the same filters ignored the input (the focused row, a locked group): repaint, undoing the toggle. */
  public edit(mounted: ControlsMounted, next: GraphFilters): void {
    if (next === this.applied) this.render();
    else this.change(mounted, next);
  }

  public focus(mounted: ControlsMounted, name: string): void {
    const next = focusOn(this.applied, name);
    const focused = next.focus === null ? null : name;
    const setFilters = (): void => this.change(mounted, next);

    this.deps.onFocusToggle(focused, setFilters);
  }

  /** Expands `folder` so its packages are drawn, then focuses it as a filter change; it selects nothing. */
  public focusFolder(folder: string): void {
    if (this.mounted === null) return;

    this.deps.onFolderFocus(folder);
    this.edit(this.mounted, focusFolderOn(this.applied, folder));
  }

  /** Clears a folder focus only; a package focus is cleared by its own toggle. */
  public clearFocus(): void {
    if (this.mounted !== null) this.edit(this.mounted, clearFolderFocusOf(this.applied));
  }

  /** Unticks every package of `folder` as the group checkbox does; the focused package is skipped. */
  public excludeFolder(folder: string): void {
    if (this.mounted !== null) this.edit(this.mounted, excludeFolderOf(this.applied, this.mounted.graph.infos, folder));
  }

  /** The group checkbox twin: checks all when the folder is not fully checked, else unchecks all. */
  public showFolder(folder: string): void {
    if (this.mounted !== null) this.edit(this.mounted, showFolderOf(this.applied, this.mounted.graph.infos, folder));
  }

  public focusedFolder(): string | null {
    return focusFolderOf(this.applied);
  }

  public setSearch(mounted: ControlsMounted, text: string): void {
    this.search = text;
    renderSearch(mounted.elements, mounted.graph.infos, text);
    this.deps.onSave();
  }

  public setGrouping(isGrouped: boolean): void {
    this.isGrouped = isGrouped;
    this.render();
    this.deps.onGrouping(isGrouped);
    this.deps.onSave();
  }

  /** The folder headers' buttons follow `collapsed`; the caller owns the set. */
  public setCollapsed(collapsed: ReadonlySet<string>): void {
    this.collapsed = collapsed;
    this.render();
  }

  public pick(name: string): void {
    const isVisible = this.shown.has(name);

    if (isVisible) this.deps.onSelect(name);
  }

  private toggleOpen(): void {
    this.isOpen = !this.isOpen;
    this.render();

    this.deps.onResize();
    this.deps.onSave();
  }

  private render(): void {
    const { mounted, applied, shown, selected, isOpen, isGrouped, collapsed } = this;

    if (mounted === null) return;

    const total = mounted.graph.infos.length;
    const view: ControlsView = { filters: applied, visible: shown, total, selected, isOpen, grouped: isGrouped, collapsed };

    renderControls(mounted.elements, this.deps.page, view);
  }

  public change(mounted: ControlsMounted, next: GraphFilters): void {
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
