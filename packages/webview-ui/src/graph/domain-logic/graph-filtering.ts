import { GraphControls } from './graph-controls.ts';
import { GraphFolders } from './graph-folders.ts';
import { GraphInspection } from './graph-inspection.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { GraphControlsDeps, GraphFilteringDeps } from '../common/graph-controls.type.ts';
import type { GraphFoldersDeps } from '../common/graph-folders.type.ts';
import type { CanvasFolders, GraphInspectionDeps } from '../common/graph-inspection.type.ts';
import type { ControlsViewFields, DrawnGraph } from '../common/graph-page.type.ts';
import type { ProbeFacts } from '../common/graph-probe.type.ts';
import type { Inspection } from '../common/inspection.type.ts';
import { folderKeysOf } from '../utils/folder-group.util.ts';
import { freshViewStateOf } from '../utils/fresh-view-state.util.ts';

type FilteringFacts = Pick<
  ProbeFacts,
  'controlsBuiltMs' | 'filterAppliedMs' | 'selected' | 'inspection' | 'detailsBuiltMs' | 'pickingBuiltMs' | 'traceMs' | 'toggleMs'
>;

/**
 * The controls panel, the inspection it drives and the collapsed folders; the only place that knows `GraphControls`,
 * `GraphInspection` and `GraphFolders`. A visible set the controls report is shown, runs the folder pass, re-checks the
 * inspection, refits and keeps the inspection clear of the details overlay; the restored one is shown without a fit or a pan.
 */
export class GraphFiltering {
  public readonly inspection: GraphInspection;
  public readonly folders: GraphFolders;

  private readonly deps: GraphFilteringDeps;
  private readonly controls: GraphControls;
  private builtMs: number | null = null;
  private appliedMs: number | null = null;

  public constructor(deps: GraphFilteringDeps) {
    const { page, view, build, now, onGrouping } = deps;
    const controlsDeps: GraphControlsDeps = {
      page,
      build,
      now,
      onVisibleChange: (visible): void => this.showVisible(visible),
      onSelect: (name): void => this.inspection.select(name),
      onFocusToggle: (name, setFilters): void => this.inspection.focused(name, setFilters),
      onOpenDetails: (): void => this.inspection.openDetails(),
      onGrouping,
      onToggleFolder: (folder): void => this.folders.toggle(folder),
      onSave: (): void => this.inspection.save(),
      onResize: (): void => view.resize()
    };
    const canvasFolders: CanvasFolders = {
      scene: (): FolderScene | null => this.folders.scene(),
      show: (): void => this.folders.show()
    };
    const inspectionDeps: GraphInspectionDeps = {
      ...deps,
      visible: (): ReadonlySet<string> => this.controls.visible(),
      focus: (): string | null => this.controls.focusName(),
      controls: (): ControlsViewFields => this.fields(),
      onSelected: (name): void => this.controls.markSelected(name),
      onFocusOn: (name): void => this.controls.focusOn(name),
      onExclude: (name): void => this.controls.exclude(name),
      onShow: (name): void => this.controls.show(name),
      canShow: (name): boolean => this.controls.canShow(name),
      folders: canvasFolders
    };
    const foldersDeps: GraphFoldersDeps = {
      ...deps,
      repaint: (scene): void => this.inspection.canvas.repaint(scene),
      visible: (): ReadonlySet<string> => this.controls.visible(),
      ghosts: (): string[] => this.inspection.canvas.ghostNodes(),
      // Task 3.5 wires the collapse of an inspected folder here.
      onCollapsed: (): void => undefined,
      onChange: (): void => this.foldersChanged()
    };

    this.deps = deps;
    this.controls = new GraphControls(controlsDeps);
    this.inspection = new GraphInspection(inspectionDeps);
    this.folders = new GraphFolders(foldersDeps);
  }

  /** Builds the panel for `graph` from `saved` (defaults without one) and shows its visible set; `at` is the state's arrival. */
  public restore(saved: GraphViewState | null, graph: DrawnGraph, at: number): ReadonlySet<string> {
    const state = saved ?? freshViewStateOf(graph.hash);

    this.controls.restore(state, graph);
    this.folders.load(state.collapsed, new Set(folderKeysOf(graph.infos)));
    this.controls.setCollapsed(this.folders.collapsed());
    this.builtMs = this.deps.now() - at;

    const visible = this.controls.visible();

    this.deps.view.setVisible(visible);
    this.folders.redraw();
    this.deps.page.fit.disabled = visible.size === 0;

    return visible;
  }

  public facts(): FilteringFacts {
    const { inspection } = this;
    const facts: FilteringFacts = {
      controlsBuiltMs: (): number | null => this.builtMs,
      filterAppliedMs: (): number | null => this.appliedMs,
      selected: (): string | null => inspection.selected(),
      inspection: (): Inspection => inspection.current(),
      detailsBuiltMs: (): number | null => inspection.builtMs('package'),
      pickingBuiltMs: (): number | null => inspection.builtMs('picking'),
      traceMs: (): number | null => inspection.builtMs('trace'),
      toggleMs: (): number | null => this.folders.toggleMs()
    };

    return facts;
  }

  /** The controls' fields and the collapsed folders: the part of the saved view state this class owns. */
  private fields(): ControlsViewFields {
    const live = this.folders.collapsed();
    const own = this.controls.fields();
    const collapsed = [...live];
    const fields: ControlsViewFields = { ...own, collapsed };

    return fields;
  }

  private foldersChanged(): void {
    this.controls.setCollapsed(this.folders.collapsed());
    this.inspection.saveViewport();
  }

  private showVisible(visible: ReadonlySet<string>): void {
    const { view, page, now } = this.deps;
    const isAny = visible.size > 0;

    view.setVisible(visible);
    this.folders.redraw();
    this.inspection.recheck(visible);
    page.fit.disabled = !isAny;

    if (isAny) view.fit();

    this.inspection.keepClear();

    const inputAt = this.controls.inputAt();

    if (inputAt !== null) this.appliedMs = now() - inputAt;
  }
}
