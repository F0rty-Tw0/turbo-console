import { canShowRow, excludeRow, focusRow, showRow } from './graph-controls-rows.ts';
import { GraphControls } from './graph-controls.ts';
import { filteringFactsOf } from './graph-filtering-facts.ts';
import { inspectionFoldersOf, widgetsOf } from './graph-filtering-hooks.ts';
import { GraphFolders } from './graph-folders.ts';
import { GraphInspection } from './graph-inspection.ts';
import { setFitAndExportDisabled } from './graph-page-states.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { GraphControlsDeps, GraphFilteringDeps, WidgetHostDeps } from '../common/graph-controls.type.ts';
import type { GraphFoldersDeps } from '../common/graph-folders.type.ts';
import type { GraphInspectionDeps } from '../common/graph-inspection.type.ts';
import type { ControlsViewFields, DrawnGraph } from '../common/graph-page.type.ts';
import type { FilteringFacts, FilteringTimes } from '../common/graph-probe.type.ts';
import type { WidgetWiring } from '../common/graph-widgets.type.ts';
import type { InspectionInput } from '../common/inspection.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';
import { focusNameOf } from '../utils/controls-rules.util.ts';
import { folderKeysOf } from '../utils/folder-group.util.ts';
import { freshViewStateOf } from '../utils/fresh-view-state.util.ts';

const CLEAR: InspectionInput = { kind: 'clear' };

/**
 * The controls panel, the inspection it drives, the collapsed folders and the widget layer over them; the only place
 * that knows `GraphControls`, `GraphInspection` and `GraphFolders`. A visible set the controls report is shown, runs the folder pass, re-checks the
 * inspection, refits and keeps the inspection clear of the details overlay; the restored one is shown without a fit or a pan.
 */
export class GraphFiltering {
  public readonly inspection: GraphInspection;
  public readonly folders: GraphFolders;

  private readonly deps: GraphFilteringDeps;
  private readonly controls: GraphControls;
  private readonly widgets: WidgetWiring;
  private builtMs: number | null = null;
  private appliedMs: number | null = null;

  public constructor(deps: GraphFilteringDeps) {
    const controlsDeps: GraphControlsDeps = {
      ...deps,
      onVisibleChange: (visible): void => this.showVisible(visible),
      onSameVisible: (): void => this.sameVisible(),
      onSelect: (name): void => this.inspection.select(name),
      onFocusToggle: (name, setFilters): void => this.inspection.focused(name, setFilters),
      onOpenDetails: (): void => this.inspection.openDetails(),
      onToggleFolder: (folder): void => this.folders.toggle(folder),
      onFolderFocus: (folder): void => this.folders.expand([folder]),
      onSave: (): void => this.inspection.save(),
      onResize: (): void => deps.view.resize()
    };
    const inspectionDeps: GraphInspectionDeps & WidgetHostDeps = {
      ...deps,
      visible: (): ReadonlySet<string> => this.controls.visible(),
      focus: (): string | null => focusNameOf(this.controls.applied),
      focusedFolder: (): string | null => this.controls.focusedFolder(),
      controls: (): ControlsViewFields => this.fields(),
      onSelected: (name): void => this.controls.markSelected(name),
      onFocusOn: (name): void => focusRow(this.controls, name),
      onExclude: (name): void => excludeRow(this.controls, name),
      onShow: (name): void => showRow(this.controls, name),
      canShow: (name): boolean => canShowRow(this.controls, name),
      onFocusFolder: (folder): void => this.controls.focusFolder(folder),
      onClearFocus: (): void => this.controls.clearFocus(),
      onExcludeFolder: (folder): void => this.controls.excludeFolder(folder),
      onShowFolder: (folder): void => this.controls.showFolder(folder),
      folders: inspectionFoldersOf((): GraphFolders => this.folders),
      buttonBox: (): AnchorBox | null => this.widgets.buttonBox()
    };
    const foldersDeps: GraphFoldersDeps = {
      ...deps,
      repaint: (scene): void => this.inspection.canvas.repaint(scene),
      visible: (): ReadonlySet<string> => this.controls.visible(),
      ghosts: (): string[] => this.inspection.canvas.ghostNodes(),
      onCollapsed: (folder): void => this.inspection.collapsed(folder),
      onChange: (): void => this.foldersChanged(),
      onRedrawn: (): void => this.widgets.refresh()
    };

    this.deps = deps;
    this.controls = new GraphControls(controlsDeps);
    this.inspection = new GraphInspection(inspectionDeps);
    this.folders = new GraphFolders(foldersDeps);
    this.widgets = widgetsOf(inspectionDeps, this.inspection, this.folders, this.controls);
  }

  /** Builds the panel for `graph` from `saved` (defaults without one) and shows its visible set; `at` is the state's arrival. */
  public restore(saved: GraphViewState | null, graph: DrawnGraph, at: number): ReadonlySet<string> {
    const state = saved ?? freshViewStateOf(graph.hash);

    this.controls.restore(state, graph);
    this.folders.load(state.collapsed, new Set(folderKeysOf(graph.infos)));
    this.controls.setCollapsed(this.folders.collapsed());
    this.builtMs = this.deps.now() - at;

    const visible = this.controls.visible();

    this.drawVisible(visible);
    setFitAndExportDisabled(this.deps.page, visible.size === 0);

    return visible;
  }

  /** The Group by folder checkbox turned off, at the click: a folder inspection ends, a folder focus clears, then an open widget menu closes. */
  public groupingOff(): void {
    const isFolder = this.inspection.current().kind === 'folder';

    if (isFolder) this.inspection.input(CLEAR);

    this.controls.clearFocus();
    this.widgets.groupingOff();
  }

  /** A layout placed, after the first draw's restore: the folder pass runs, then a grouped one reaches for the inspection. */
  public placed(): void {
    this.folders.redraw();

    const scene = this.folders.scene();

    if (scene !== null) this.inspection.reachCurrent();
  }

  /** A frame was drawn: it ends a toggle's timing and the widgets follow the camera. */
  public rendered(): void {
    this.folders.rendered();
    this.widgets.position();
  }

  public facts(): FilteringFacts {
    const times: FilteringTimes = {
      controlsBuiltMs: (): number | null => this.builtMs,
      filterAppliedMs: (): number | null => this.appliedMs
    };

    return filteringFactsOf(this.inspection, this.folders, times);
  }

  /** The controls' fields and the collapsed folders: the part of the saved view state this class owns. */
  private fields(): ControlsViewFields {
    const live = this.folders.collapsed();
    const own = this.controls.fields();
    const collapsed = [...live];
    const fields: ControlsViewFields = { ...own, collapsed };

    return fields;
  }

  /** A collapse or expand: the controls and the save follow, and an inspected folder's view relabels its Collapse or Expand. */
  private foldersChanged(): void {
    this.controls.setCollapsed(this.folders.collapsed());
    this.inspection.saveViewport();
    this.recheckFolder();
  }

  /** An inspected folder's view shows its collapse and focus, so it is built again after either changes; others stay. */
  private recheckFolder(): void {
    const isFolder = this.inspection.current().kind === 'folder';

    if (isFolder) this.inspection.recheck(this.controls.visible());
  }

  /** A filter change that kept the visible set: the focus may still have moved to a package already shown. */
  private sameVisible(): void {
    this.markFocusTarget();
    this.recheckFolder();
  }

  /** The focused package's label draws bold; a folder focus or none leaves every label regular. */
  private markFocusTarget(): void {
    const focus = focusNameOf(this.controls.applied);

    this.deps.view.setFocusTarget(focus);
  }

  /** Shows `visible`, then marks the focus target and redraws the folders over it. */
  private drawVisible(visible: ReadonlySet<string>): void {
    this.deps.view.setVisible(visible);
    this.markFocusTarget();
    this.folders.redraw();
  }

  private showVisible(visible: ReadonlySet<string>): void {
    const { view, page, now } = this.deps;
    const isAny = visible.size > 0;

    this.drawVisible(visible);
    this.inspection.recheck(visible);
    setFitAndExportDisabled(page, !isAny);

    if (isAny) view.fit();

    this.inspection.keepClear();

    const inputAt = this.controls.inputAt();

    if (inputAt !== null) this.appliedMs = now() - inputAt;
  }
}
