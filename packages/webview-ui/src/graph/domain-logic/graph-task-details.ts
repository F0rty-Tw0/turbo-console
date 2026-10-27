import { showDetailsBar } from './details-bar-shown.ts';
import { modeFocusOf } from './mode-focus.ts';
import { TASK_DETAILS_ID } from '../common/graph-task.const.ts';
import { DETAILS_ID } from '../common/graph.const.ts';
import type { TaskDetailsDeps, TaskDetailsModel, TaskDetailsView, TaskRunAction } from '../common/task-details.type.ts';
import { runMessageOf } from '../utils/task-run.util.ts';

/** The focus key of a focused element with no `data-focus`: the new view's heading takes focus. */
const HEADING_KEY = 'heading';

const buttonsOf = (view: TaskDetailsView): HTMLButtonElement[] => {
  const dependencies = view.dependencies.map((dependency) => dependency.button);
  const buttons = [view.run, view.runNoCache, view.stop, ...dependencies];

  return buttons;
};

/** Focuses the shown button of `view` whose `data-focus` is `key`, else its heading. */
const refocus = (view: TaskDetailsView, key: string): void => {
  const buttons = buttonsOf(view);
  const twin = buttons.find((button) => !button.hidden && button.getAttribute('data-focus') === key);
  const target = twin ?? view.heading;

  target.focus();
};

/**
 * The task side panel. It replaces the package Details panel while task mode is on and keeps its own open state, which
 * the Details button flips: the package panel only shows that state while it is mounted. Each view's buttons act only
 * while their task is the one shown, so a stale view never posts.
 */
export class GraphTaskDetails {
  private readonly deps: TaskDetailsDeps;
  private readonly panel: HTMLElement;
  /** The panel's `div.details-content`, after the Details bar while task mode holds it; each view replaces its child. */
  private readonly content: HTMLElement;
  private model: TaskDetailsModel | null = null;
  private isActive = false;
  private isOpen = true;

  public constructor(deps: TaskDetailsDeps) {
    const { panel, content } = deps.views.panel();

    this.deps = deps;
    this.panel = panel;
    this.content = content;
    content.replaceChildren(deps.views.empty().root);
    deps.page.details.addEventListener('click', (): void => this.toggleOpen());
    deps.page.clear.addEventListener('click', (): void => this.cleared());
  }

  public enter(isOpen: boolean): void {
    const { body, details } = this.deps.page;

    this.isActive = true;
    this.isOpen = isOpen;

    if (!this.panel.isConnected) body.append(this.panel);

    details.setAttribute('aria-controls', TASK_DETAILS_ID);
    this.render();
  }

  public exit(): void {
    const hadFocus = this.panel.contains(document.activeElement);

    this.isActive = false;
    this.panel.hidden = true;
    this.deps.page.details.setAttribute('aria-controls', DETAILS_ID);

    if (hadFocus) modeFocusOf(this.deps.page).focus();
  }

  /**
   * Shows `model`, or the empty lead; focus in the content moves to the new view's twin of the focused button. The empty
   * view's heading takes focus from the content, or from Clear selection, which hides with it; other focus in the Details
   * bar stays.
   */
  public show(model: TaskDetailsModel | null): void {
    const key = this.focusedKey();
    const isClearHiding = model === null && document.activeElement === this.deps.page.clear;

    this.model = model;
    this.renderBar();

    if (model === null) {
      const empty = this.deps.views.empty();
      const isRefocused = key !== null || isClearHiding;

      this.content.replaceChildren(empty.root);

      if (isRefocused) empty.heading.focus();

      return;
    }

    const view = this.deps.views.view(model);

    this.wire(view, model);
    this.content.replaceChildren(view.root);

    if (key !== null) refocus(view, key);
  }

  private wire(view: TaskDetailsView, model: TaskDetailsModel): void {
    const act = (action: TaskRunAction): void => this.act(model, action);

    view.run.addEventListener('click', (): void => act('run'));
    view.runNoCache.addEventListener('click', (): void => act('runNoCache'));
    view.stop.addEventListener('click', (): void => act('stop'));

    for (const { task, button } of view.dependencies) button.addEventListener('click', (): void => this.pick(model, task.id));
  }

  /** Posts the button's message, only from a click on the view of the task shown now, in task mode. */
  private act(model: TaskDetailsModel, action: TaskRunAction): void {
    const isShown = this.isShown(model);

    if (!isShown) return;

    const message = runMessageOf(model, action);

    if (message !== null) this.deps.bridge.post(message);
  }

  private pick(model: TaskDetailsModel, id: string): void {
    const isShown = this.isShown(model);

    if (isShown) this.deps.actions.onSelect(id);
  }

  private isShown(model: TaskDetailsModel): boolean {
    return this.isActive && model === this.model;
  }

  private focusedKey(): string | null {
    const active = document.activeElement;
    const isInside = this.content.contains(active);
    const key = active?.getAttribute('data-focus') ?? HEADING_KEY;

    return isInside ? key : null;
  }

  private toggleOpen(): void {
    if (!this.isActive) return;

    this.isOpen = !this.isOpen;
    this.render();
    this.deps.onToggle(this.isOpen);
  }

  private cleared(): void {
    if (this.isActive && this.model !== null) this.deps.actions.onClear();
  }

  private render(): void {
    this.panel.hidden = !this.isOpen;
    this.deps.page.details.setAttribute('aria-expanded', String(this.isOpen));
    this.renderBar();
  }

  private renderBar(): void {
    if (this.isActive) showDetailsBar(this.deps.page, this.model !== null);
  }
}
