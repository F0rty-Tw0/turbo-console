import { placeToolbarRoot, removeToolbarRoot } from './node-toolbar-place.ts';
import type { TaskToolbarDeps } from '../common/task-details.type.ts';
import type { TaskToolbarElements } from '../common/task-toolbar.type.ts';
import type { RectPx } from '../common/widget.type.ts';

/** The task toolbar built for `id`. */
type TaskToolbarEntry = {
  readonly id: string;
  readonly elements: TaskToolbarElements;
};

/**
 * The selected task's node toolbar: built again when the selected task changes, first in the layer so it is the Tab
 * stop after the canvas; focus inside it goes to the container when it is removed or hidden, since the browser would
 * drop it on the body.
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

  /** Exactly one toolbar for `id`, none for `null`; the same id keeps the element. */
  public sync(id: string | null): void {
    if (this.entry?.id === id) return;

    this.removeEntry();

    if (id !== null) this.entry = this.build(id);
  }

  /** Shows the toolbar at `rect` on whole px, or hides it for `null`; focus inside a toolbar that hides goes to the container. */
  public place(rect: RectPx | null): void {
    if (this.entry === null) return;

    placeToolbarRoot(this.entry.elements.root, rect, this.deps.container);
  }

  private build(id: string): TaskToolbarEntry {
    const elements = this.deps.views.taskToolbar(id);
    const entry: TaskToolbarEntry = { id, elements };

    elements.ellipsis.addEventListener('click', (): void => this.deps.onMenu(elements.ellipsis));
    this.deps.layer.prepend(elements.root);

    return entry;
  }

  private removeEntry(): void {
    if (this.entry === null) return;

    const { root } = this.entry.elements;

    removeToolbarRoot(root, this.deps.container);
    this.entry = null;
  }
}
