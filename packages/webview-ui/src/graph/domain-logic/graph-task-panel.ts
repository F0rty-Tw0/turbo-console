import type { PageElements } from '../common/graph-page.type.ts';
import { TASK_MODE_CLASS } from '../common/graph-task.const.ts';
import type { TaskPanel, TaskPanelActions, TaskPanelView } from '../common/graph-task.type.ts';
import { tasksHiddenText } from '../utils/task-text.util.ts';

type TaskPanelPage = Pick<PageElements, 'root' | 'taskMode' | 'taskScreen' | 'container'>;

/**
 * Task mode's page-level parts: the `task-mode` class on the page, which hides the package Controls panel and widgets,
 * the pressed toggle, the prompt, the cap banner and its Show all tasks button, and the notice line. Show all tasks
 * hides itself with the banner, so it hands focus to the canvas.
 */
export const taskPanelOf = (page: TaskPanelPage, actions: TaskPanelActions): TaskPanel => {
  const { prompt, banner, bannerText, showAll, notice } = page.taskScreen;
  const setOn = (isOn: boolean): void => {
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
  const exit = (): void => {
    setOn(false);
    prompt.hidden = true;
    banner.hidden = true;
    showNotice(null);
  };

  const showAllTasks = (): void => {
    actions.onShowAll();
    page.container.focus();
  };

  showAll.addEventListener('click', showAllTasks);

  const panel: TaskPanel = { enter: (): void => setOn(true), exit, show, notice: showNotice };

  return panel;
};
