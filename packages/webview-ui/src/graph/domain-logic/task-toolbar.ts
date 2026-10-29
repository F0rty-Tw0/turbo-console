import { setButtonIcon, setButtonLabel } from './button-title.ts';
import { placeToolbarRoot, removeToolbarRoot, writeShown } from './node-toolbar-place.ts';
import { followFocus, moveStopOnKey } from './roving-stop.ts';
import { ACTION_ICONS } from '../common/graph-icon.const.ts';
import type { TaskDetailsModel, TaskToolbarDeps, TaskToolbarEntry } from '../common/task-details.type.ts';
import type { TaskToolbarKind } from '../common/task-toolbar.type.ts';
import type { RectPx } from '../common/widget.type.ts';
import { stopOf } from '../utils/roving-stop.util.ts';
import { TASK_TOOLBAR_ORDER, runActionOf, runSlotLabelOf, taskToolbarShownOf } from '../utils/task-toolbar.util.ts';
import { isNodeToolbarCompact } from '../utils/widget-geometry.util.ts';

/** Draws the Run/Stop slot for the task's state now, on the same element so focus stays on it; a slot already drawn for that action is not written. */
const syncRun = (entry: TaskToolbarEntry): void => {
  const { id, elements, model } = entry;
  const action = runActionOf(model.state);

  if (action === entry.slotAction) return;

  const label = runSlotLabelOf(id, action);

  setButtonIcon(elements.run, ACTION_ICONS[action]);
  setButtonLabel(elements.run, label);
  entry.slotAction = action;
};

/**
 * The selected task's node toolbar: built again when the selected task changes, first in the layer so it is the Tab
 * stop after the canvas; the same task keeps the element and only the Run/Stop slot follows its state. Focus inside it
 * goes to the container when it is removed or hidden, since the browser would drop it on the body, and to the new Tab
 * stop when left on a hidden button.
 */
export class TaskToolbar {
  private readonly deps: TaskToolbarDeps;
  private entry: TaskToolbarEntry | null = null;

  public constructor(deps: TaskToolbarDeps) {
    this.deps = deps;
  }

  /** The task the toolbar is for, `null` without one. */
  public id(): string | null {
    return this.entry?.id ?? null;
  }

  public ellipsis(): HTMLButtonElement | null {
    return this.entry?.elements.ellipsis ?? null;
  }

  /** The buttons the toolbar shows at `zoom`; 0 without a toolbar. */
  public countAt(zoom: number): number {
    const shown = this.shownAt(zoom);

    return shown.length;
  }

  /** Exactly one toolbar for the task of `model`, none for `null`; the same task keeps the element. */
  public sync(model: TaskDetailsModel | null): void {
    if (model === null) {
      this.removeEntry();

      return;
    }

    const entry = this.entryFor(model);

    entry.model = model;
    this.entry = entry;
    syncRun(entry);
  }

  /** Shows the toolbar at `rect` on whole px with the buttons the zoom and the state allow, or hides it for `null` or while none shows. */
  public place(rect: RectPx | null, zoom: number): void {
    if (this.entry === null) return;

    const { elements, preferred } = this.entry;
    const shown = this.shownAt(zoom);
    const placed = shown.length === 0 ? null : rect;

    placeToolbarRoot(elements.root, placed, this.deps.container);

    if (placed === null) return;

    const stop = stopOf(preferred, shown, 'ellipsis');
    const isLostFocus = writeShown(this.entry, TASK_TOOLBAR_ORDER, shown, stop);

    if (isLostFocus) elements[stop]?.focus();
  }

  private shownAt(zoom: number): TaskToolbarKind[] {
    if (this.entry === null) return [];

    const { task, state } = this.entry.model;
    const isCompact = isNodeToolbarCompact(zoom);

    return taskToolbarShownOf(task, state, isCompact);
  }

  /** The kept entry when it is for the task of `model`, else a new one in place of the old. */
  private entryFor(model: TaskDetailsModel): TaskToolbarEntry {
    const current = this.entry;

    if (current?.id === model.task.id) return current;

    this.removeEntry();

    return this.build(model);
  }

  private build(model: TaskDetailsModel): TaskToolbarEntry {
    const { id, packageName } = model.task;
    const elements = this.deps.views.taskToolbar(id, packageName);
    const entry: TaskToolbarEntry = { id, elements, model, slotAction: 'run', shown: [], preferred: 'run' };
    const { run, showPackage, ellipsis } = elements;

    ellipsis.addEventListener('click', (): void => this.deps.onMenu(ellipsis));
    run.addEventListener('click', (): void => this.onRun(entry));
    showPackage?.addEventListener('click', (): void => this.deps.onShowPackage(packageName));
    elements.root.addEventListener('keydown', (event: KeyboardEvent): void => this.onKey(event));
    elements.root.addEventListener('focusin', (event: FocusEvent): void => this.onFocusIn(event));
    this.deps.layer.prepend(elements.root);

    return entry;
  }

  private onKey(event: KeyboardEvent): void {
    if (this.entry !== null) moveStopOnKey(this.entry, TASK_TOOLBAR_ORDER, event);
  }

  private onFocusIn(event: FocusEvent): void {
    if (this.entry !== null) followFocus(this.entry, TASK_TOOLBAR_ORDER, event);
  }

  /** The slot does what it shows at click time: Stop while the task is live, else Run. */
  private onRun(entry: TaskToolbarEntry): void {
    const action = runActionOf(entry.model.state);

    this.deps.onRun(entry.id, action);
  }

  private removeEntry(): void {
    if (this.entry === null) return;

    const { root } = this.entry.elements;

    removeToolbarRoot(root, this.deps.container);
    this.entry = null;
  }
}
