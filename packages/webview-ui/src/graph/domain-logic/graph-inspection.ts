import { GraphDetails } from './graph-details.ts';
import { detailsDepsOf, folderActionsOf, postExplain, postOpenDetails, wireInspectionKeys } from './graph-inspection-details.ts';
import { GraphInspectionFolders } from './graph-inspection-folders.ts';
import { keepClearInspection } from './graph-keep-clear.ts';
import { InspectionCanvas } from './inspection-canvas.ts';
import { scheduleSave } from './inspection-save.ts';
import { recheckedOf, restoredOf, shownPartsOf } from './inspection-shown.ts';
import type { GraphEdgeExplainedMessage } from '../../bridge/common/graph-message.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { FolderActions } from '../common/folder-actions.type.ts';
import type { GraphInspectionDeps, InspectionSave, KeepClearDeps } from '../common/graph-inspection.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection, InspectionInput } from '../common/inspection.type.ts';
import { focusInputOf, inputPlanOf, sameHashPlanOf } from '../utils/inspection-flow.util.ts';
import { selectedOf } from '../utils/inspection-parts.util.ts';

/**
 * The live inspection and everything that shows it: the details panel, the canvas, the status line and
 * `Clear selection`; the taps, keys and panel actions that change it; its saves, its restore and the same-hash path.
 * Keys are handled on the graph container only, so a key on a toolbar button never acts here.
 */
export class GraphInspection {
  /** The inspection's paint, ghosts and folder pass on the canvas; `GraphFolders` repaints it and reads its ghosts. */
  public readonly canvas: InspectionCanvas;

  private readonly deps: GraphInspectionDeps;
  private readonly details: GraphDetails;
  private readonly reach: GraphInspectionFolders;
  private readonly timings = new Map<string, number>();
  private inspection: Inspection = NO_INSPECTION;

  public constructor(deps: GraphInspectionDeps) {
    this.deps = deps;
    this.canvas = new InspectionCanvas(deps.view, deps.folders);
    this.details = new GraphDetails(detailsDepsOf(deps, this));
    this.reach = new GraphInspectionFolders(deps.folders);
    wireInspectionKeys(deps.page, this);
  }

  public current(): Inspection {
    return this.inspection;
  }

  public selected(): string | null {
    return selectedOf(this.inspection);
  }

  /** Applies the input; the camera centres only as `inputPlanOf` says, then keeps a changed inspection clear of an overlay. */
  public input(input: InspectionInput): void {
    const plan = inputPlanOf(this.inspection, input);

    this.apply(plan.next, false);

    if (plan.centre !== null) this.deps.view.centreOn(plan.centre);

    if (plan.isKeepClear) this.keepClear();
  }

  /** Pans the inspection's anchors clear of the open overlay; restore and refresh never call it. */
  public keepClear(): void {
    const { view, page } = this.deps;
    const aside = this.details.overlayPanel();

    if (aside === null) return;

    const ghostNodes = this.canvas.ghostNodes();
    const keepDeps: KeepClearDeps = { view, page, aside, inspection: this.inspection, ghostNodes };

    keepClearInspection(keepDeps);
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

  /** A tap on a box outside its packages or on a collapsed node; ignored while a mode switch waits, and while picking. */
  public tapFolder(folder: string): void {
    const canAct = this.deps.canAct();

    if (!canAct) return;

    this.input({ kind: 'selectFolder', folder });
    this.deps.page.container.focus();
  }

  /** After `folder` collapsed from any source: an inspection inside it becomes the folder, kept clear like any change. */
  public collapsed(folder: string): void {
    const next = this.reach.afterCollapse(this.inspection, folder);

    if (next === null) return;

    this.apply(next, false);
    this.keepClear();
  }

  /** Enter on the graph: toggles an inspected folder, else opens Package Details of the inspected package, if any. */
  public enter(): void {
    const { inspection } = this;

    if (inspection.kind === 'folder') this.deps.folders.toggle(inspection.folder);
    else this.openDetails();
  }

  /** The folder actions for widgets and menus, over the same calls as the details panel's folder buttons. */
  public folderActions(): FolderActions {
    return folderActionsOf(this.deps);
  }

  /**
   * A list Focus toggle: selects the new focus, or only refreshes the views (picking, a cleared focus). The input is
   * read off the inspection before `setFilters` runs, so a picking the filter rule then drops selects nothing (§4.3).
   */
  public focused(name: string | null, setFilters: () => void): void {
    const input = focusInputOf(this.inspection, name);

    setFilters();

    if (input === null) this.apply(this.inspection, false);
    else this.input(input);
  }

  /** Builds the details panel; call before the camera step, so the fit sees the narrowed container. */
  public mount(saved: GraphViewState | null): void {
    this.details.mount(this.deps.page.body, saved?.detailsOpen ?? true);
  }

  /** After a filter change: keeps, narrows or drops the inspection for the new visible set. */
  public recheck(visible: ReadonlySet<string>): void {
    const next = recheckedOf(this.deps, this.inspection, visible);

    if (next !== null) this.apply(next, false);
  }

  /** Rebuilds the saved inspection, or none, for the placed graph; a restored link asks for its entry again. */
  public restore(saved: GraphViewState | null, visible: ReadonlySet<string>): void {
    const restored = restoredOf(this.deps, saved, visible);

    if (restored !== null) this.apply(restored, true);
  }

  /** A same-hash state: relabels a shown package's task count in place, or asks again for a shown link's entry. */
  public refreshed(isChanged: boolean): void {
    const { inspection } = this;
    const plan = sameHashPlanOf(inspection, isChanged);

    if (plan.isUpdate) this.apply(inspection, false);

    if (plan.reask !== null) postExplain(this.deps.bridge, plan.reask.source, plan.reask.target);
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

  /** Opens Package Details of the inspected package, if any. */
  public openDetails(): void {
    const name = this.selected();

    if (name !== null) this.openDetailsOf(name);
  }

  public openDetailsOf(name: string): void {
    postOpenDetails(this.deps.bridge, name);
  }

  /** How long the latest inspection of `kind` took from being set to its details view shown; `null` until one did. */
  public builtMs(kind: Inspection['kind']): number | null {
    return this.timings.get(kind) ?? null;
  }

  /**
   * Shows `next` everywhere and saves it; `isRebuild` builds the details view again (a restore). The collapsed folders
   * holding its packages expand after its trace is known and before the canvas draws; the camera stays.
   */
  private apply(next: Inspection, isRebuild: boolean): void {
    const { deps } = this;
    const started = deps.now();
    const shown = shownPartsOf(deps, next, isRebuild);

    if (shown === null) return;

    this.inspection = next;
    this.details.show(shown.details, shown.context);
    this.timings.set(next.kind, deps.now() - started);
    this.reach.reach(next, shown.canvas.trace);
    this.canvas.draw(shown.canvas, isRebuild);
    deps.page.status.textContent = shown.status;
    deps.page.clear.disabled = next.kind === 'none';
    deps.onSelected(selectedOf(next));
    this.save();
  }

  /** The picking filter changed: only the canvas lights follow, as the panel updated its own lists. */
  public filter(text: string): void {
    this.canvas.filter(text);
  }
}
