import { setButtonText } from './button-title.ts';
import type { PageElements } from '../common/graph-page.type.ts';
import { NOTICE_TEXT_DELAY_MS, PACKAGE_NOTICE_MS, TASK_CAP, TASK_MODE_CLASS } from '../common/graph-task.const.ts';
import type {
  PanelToggleDeps,
  TaskPanel,
  TaskPanelActions,
  TaskPanelAsides,
  TaskPanelView,
  TaskPanelsOpen,
  TaskScreenElements
} from '../common/graph-task.type.ts';
import type { TaskWidgets } from '../common/task-details.type.ts';
import { showEveryTextOf, tasksHiddenText } from '../utils/task-text.util.ts';

type TaskPanelPage = Pick<
  PageElements,
  'root' | 'packagesMode' | 'taskMode' | 'taskScreen' | 'container' | 'status' | 'detailsBar' | 'detailsSummary'
>;

/** A task Controls or Details panel opened or closed: the canvas re-measures and the open state is saved. */
export const savePanelToggle = (deps: PanelToggleDeps, panels: TaskPanelsOpen): void => {
  deps.view.resize();
  deps.modes.savePanels(panels);
};

/** The task Details panel opened or closed, as `savePanelToggle`; an opened panel then keeps the selected task clear of it. */
export const saveDetailsToggle = (deps: PanelToggleDeps, widgets: Pick<TaskWidgets, 'keepClear'>, detailsOpen: boolean): void => {
  savePanelToggle(deps, { detailsOpen });

  if (detailsOpen) widgets.keepClear();
};

/** The prompt's Show every task, with the known count, while any task is known, and its slow line past `TASK_CAP`. */
const writeShowEvery = (screen: Pick<TaskScreenElements, 'showEvery' | 'slow'>, knownCount: number): void => {
  const text = showEveryTextOf(knownCount);

  screen.showEvery.hidden = knownCount === 0;
  screen.slow.hidden = knownCount <= TASK_CAP;
  setButtonText(screen.showEvery, text);
};

/** Wires Show all tasks and Show every task, the latter with its click time; each then hands focus to the canvas. */
const wireShowButtons = (page: Pick<TaskPanelPage, 'taskScreen' | 'container'>, actions: TaskPanelActions): void => {
  const showAllTasks = (): void => {
    actions.onShowAll();
    page.container.focus();
  };
  const showEveryTask = (event: Event): void => {
    actions.onShowEvery(event.timeStamp);
    page.container.focus();
  };

  page.taskScreen.showAll.addEventListener('click', showAllTasks);
  page.taskScreen.showEvery.addEventListener('click', showEveryTask);
};

/**
 * Writes the notice line: `null` hides and empties it. A hidden line is shown empty first and gets its text
 * `NOTICE_TEXT_DELAY_MS` later, since a `role=status` line that appears with its text inside is not reliably announced;
 * a line already shown takes the text at once. A newer notice or a hide cancels a pending write.
 */
const noticeLineOf = (notice: HTMLElement): ((text: string | null) => void) => {
  let cancelWrite = (): void => undefined;

  const showNotice = (text: string | null): void => {
    cancelWrite();

    if (text === null) {
      notice.hidden = true;
      notice.textContent = '';

      return;
    }

    const wasHidden = notice.hidden;

    notice.hidden = false;

    if (!wasHidden) {
      notice.textContent = text;

      return;
    }

    const write = setTimeout((): void => {
      notice.textContent = text;
    }, NOTICE_TEXT_DELAY_MS);

    cancelWrite = (): void => clearTimeout(write);
  };

  return showNotice;
};

/**
 * Task mode's page-level parts: the `task-mode` class on the page, which hides the package Controls panel and widgets,
 * the pressed mode button, the prompt and its Show every task button, the cap banner and its Show all tasks button, and the notice line. Entering moves the
 * Details bar into the task aside and empties the package selection's status line and summary, which the package
 * inspection writes again once its graph shows; leaving moves the bar back into the package aside, once it exists. Show all tasks
 * and Show every task hide themselves with the banner and the prompt, so each hands focus to the canvas (`wireShowButtons`). A notice shown in package mode, where no task render
 * replaces it, hides after `PACKAGE_NOTICE_MS`. The banner and its `role=status` text are written only when they change,
 * so a same-key state re-posted by the host does not make a screen reader announce the banner again.
 */
export const taskPanelOf = (page: TaskPanelPage, actions: TaskPanelActions, asides: TaskPanelAsides): TaskPanel => {
  const { prompt, banner, bannerText, notice } = page.taskScreen;
  let isTaskMode = false;
  let cancelTimer = (): void => undefined;
  const setOn = (isOn: boolean): void => {
    isTaskMode = isOn;
    page.root.classList.toggle(TASK_MODE_CLASS, isOn);
    page.packagesMode.setAttribute('aria-pressed', String(!isOn));
    page.taskMode.setAttribute('aria-pressed', String(isOn));
  };
  const show = (view: TaskPanelView): void => {
    const isBannerHidden = view.hiddenCount === 0;
    const text = tasksHiddenText(view.hiddenCount);

    prompt.hidden = !view.isEmpty;
    writeShowEvery(page.taskScreen, view.knownCount);

    if (banner.hidden !== isBannerHidden) banner.hidden = isBannerHidden;

    if (bannerText.textContent !== text) bannerText.textContent = text;
  };
  const showNotice = noticeLineOf(notice);
  const noticeFor = (text: string | null): void => {
    cancelTimer();
    showNotice(text);

    if (isTaskMode || text === null) return;

    const timer = setTimeout((): void => showNotice(null), PACKAGE_NOTICE_MS);

    cancelTimer = (): void => clearTimeout(timer);
  };
  const enter = (): void => {
    setOn(true);
    asides.task.prepend(page.detailsBar);
    page.status.textContent = '';
    page.detailsSummary.textContent = '';
  };
  const exit = (): void => {
    setOn(false);
    asides.package()?.prepend(page.detailsBar);
    prompt.hidden = true;
    banner.hidden = true;
    noticeFor(null);
  };

  wireShowButtons(page, actions);

  const panel: TaskPanel = { enter, exit, show, notice: noticeFor };

  return panel;
};
