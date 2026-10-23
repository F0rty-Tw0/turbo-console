import { TASK_DETAILS_ID } from '../common/graph-task.const.ts';
import type { TaskDetailsDeps, TaskDetailsModel, TaskDetailsView, TaskRunAction } from '../common/task-details.type.ts';
import { runMessageOf } from '../utils/task-run.util.ts';

/** The package Details panel's id, which the Details button points at again when task mode ends. */
const PACKAGE_DETAILS_ID = 'graph-details';

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
  private model: TaskDetailsModel | null = null;
  private isActive = false;
  private isOpen = true;

  public constructor(deps: TaskDetailsDeps) {
    this.deps = deps;
    this.panel = deps.views.panel();
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
    this.deps.page.details.setAttribute('aria-controls', PACKAGE_DETAILS_ID);

    if (hadFocus) this.deps.page.taskMode.focus();
  }

  /** Shows `model`, or empties the panel; focus inside the panel moves to the new view's twin of the focused button. */
  public show(model: TaskDetailsModel | null): void {
    const key = this.focusedKey();

    this.model = model;
    this.renderClear();

    if (model === null) {
      this.panel.replaceChildren();

      if (key !== null) this.deps.page.details.focus();

      return;
    }

    const view = this.deps.views.view(model);

    this.wire(view, model);
    this.panel.replaceChildren(view.root);

    if (key !== null) refocus(view, key);
  }

  private wire(view: TaskDetailsView, model: TaskDetailsModel): void {
    const act = (action: TaskRunAction): void => this.act(model, action);

    view.run.addEventListener('click', (): void => act('run'));
    view.runNoCache.addEventListener('click', (): void => act('runNoCache'));
    view.stop.addEventListener('click', (): void => act('stop'));

    for (const { task, button } of view.dependencies) button.addEventListener('click', (): void => this.pick(model, task.id));
  }

  /** Posts the button's message, only from a click on the view of the task shown now. */
  private act(model: TaskDetailsModel, action: TaskRunAction): void {
    if (model !== this.model) return;

    const message = runMessageOf(model, action);

    if (message !== null) this.deps.bridge.post(message);
  }

  private pick(model: TaskDetailsModel, id: string): void {
    if (model === this.model) this.deps.actions.onSelect(id);
  }

  private focusedKey(): string | null {
    const active = document.activeElement;
    const isInside = this.panel.contains(active);
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
    this.renderClear();
  }

  private renderClear(): void {
    if (this.isActive) this.deps.page.clear.disabled = this.model === null;
  }
}
