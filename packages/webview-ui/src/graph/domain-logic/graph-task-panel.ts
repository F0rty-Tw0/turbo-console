import type { PageElements } from '../common/graph-page.type.ts';
import { PACKAGE_NOTICE_MS, TASK_MODE_CLASS } from '../common/graph-task.const.ts';
import type { TaskPanel, TaskPanelActions, TaskPanelView } from '../common/graph-task.type.ts';
import { tasksHiddenText } from '../utils/task-text.util.ts';

type TaskPanelPage = Pick<PageElements, 'root' | 'taskMode' | 'taskScreen' | 'container'>;

/**
 * Task mode's page-level parts: the `task-mode` class on the page, which hides the package Controls panel and widgets,
 * the pressed toggle, the prompt, the cap banner and its Show all tasks button, and the notice line. Show all tasks
 * hides itself with the banner, so it hands focus to the canvas. A notice shown in package mode, where no task render
 * replaces it, hides after `PACKAGE_NOTICE_MS`.
 */
export const taskPanelOf = (page: TaskPanelPage, actions: TaskPanelActions): TaskPanel => {
  const { prompt, banner, bannerText, showAll, notice } = page.taskScreen;
  let isTaskMode = false;
  let cancelTimer = (): void => undefined;
  const setOn = (isOn: boolean): void => {
    isTaskMode = isOn;
    page.root.classList.toggle(TASK_MODE_CLASS, isOn);
    page.taskMode.setAttribute('aria-pressed', String(isOn));
  };
  const show = (view: TaskPanelView): void => {
    prompt.hidden = !view.isEmpty;
    banner.hidden = view.hiddenCount === 0;
    bannerText.textContent = tasksHiddenText(view.hiddenCount);
  };
  const showNotice = (text: string | null): void => {
    notice.hidden = text === null;
    notice.textContent = text ?? '';
  };
  const noticeFor = (text: string | null): void => {
    cancelTimer();
    showNotice(text);

    if (isTaskMode || text === null) return;

    const timer = setTimeout((): void => showNotice(null), PACKAGE_NOTICE_MS);

    cancelTimer = (): void => clearTimeout(timer);
  };
  const exit = (): void => {
    setOn(false);
    prompt.hidden = true;
    banner.hidden = true;
    noticeFor(null);
  };

  const showAllTasks = (): void => {
    actions.onShowAll();
    page.container.focus();
  };

  showAll.addEventListener('click', showAllTasks);

  const panel: TaskPanel = { enter: (): void => setOn(true), exit, show, notice: noticeFor };

  return panel;
};
