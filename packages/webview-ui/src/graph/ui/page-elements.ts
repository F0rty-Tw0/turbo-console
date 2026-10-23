import { buildToolbar } from './toolbar-elements.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { PageElements } from '../common/graph-page.type.ts';
import { EMPTY_TASKS_TEXT, SHOW_ALL_TASKS_LABEL } from '../common/graph-task.const.ts';
import type { TaskScreenElements } from '../common/graph-task.type.ts';
import { FALLBACK_NOTICE_TEXT, GRAPH_LABEL, RELOAD_LABEL, RETRY_LABEL } from '../common/graph.const.ts';

/** A text button: its visible text is its accessible name. */
const textButton = (label: string): HTMLButtonElement => {
  const button = textElement('button', 'text-button', label);

  button.type = 'button';

  return button;
};

const graphContainer = (): HTMLElement => {
  const container = textElement('div', 'graph-container', '');

  container.tabIndex = 0;
  container.setAttribute('role', 'application');
  container.setAttribute('aria-label', GRAPH_LABEL);

  return container;
};

/** A hidden block of one text line and one button. */
const textBlock = (className: string, line: HTMLElement, button: HTMLButtonElement): HTMLElement => {
  const block = textElement('div', className, '');

  block.hidden = true;
  block.append(line, button);

  return block;
};

/** A hidden line; a status line is announced when its text changes. */
const hiddenLine = (className: string, text: string, isStatus: boolean): HTMLElement => {
  const line = textElement('p', className, text);

  line.hidden = true;

  if (isStatus) line.setAttribute('role', 'status');

  return line;
};

/**
 * Task mode's lines above the canvas, all hidden in package mode: the notice, the cap banner and the prompt. The notice
 * and the banner's count are status lines, announced when their text changes.
 */
const taskScreen = (): TaskScreenElements => {
  const notice = hiddenLine('graph-notice graph-task-notice', '', true);
  const bannerText = textElement('p', 'graph-task-banner-text', '');
  const showAll = textButton(SHOW_ALL_TASKS_LABEL);
  const banner = textBlock('graph-notice graph-task-banner', bannerText, showAll);
  const prompt = hiddenLine('graph-task-prompt', EMPTY_TASKS_TEXT, false);
  const screen: TaskScreenElements = { prompt, banner, bannerText, showAll, notice };

  bannerText.setAttribute('role', 'status');

  return screen;
};

/** The row that holds the controls panel, once a graph shows, the container and the widget layer over it. */
const graphBody = (container: HTMLElement, widgets: HTMLElement): HTMLElement => {
  const body = textElement('div', 'graph-body', '');

  body.append(container, widgets);

  return body;
};

/**
 * The page in its pre-state: toolbar and the body with the empty container shown, every toolbar button disabled, the
 * notice, task mode's lines and the message block hidden. DOM order is the Tab order: toolbar, notice, task notice,
 * cap banner, prompt, message, then the body.
 */
export const buildPage = (): PageElements => {
  const tools = buildToolbar();
  const retry = textButton(RETRY_LABEL);
  const noticeText = textElement('p', 'graph-notice-text', FALLBACK_NOTICE_TEXT);
  const notice = textBlock('graph-notice', noticeText, retry);
  const reload = textButton(RELOAD_LABEL);
  const messageText = textElement('p', 'graph-message-text', '');
  const message = textBlock('graph-message', messageText, reload);
  const tasks = taskScreen();
  const container = graphContainer();
  const widgets = textElement('div', 'graph-widgets', '');
  const body = graphBody(container, widgets);
  const root = textElement('main', 'graph-page', '');

  root.append(tools.toolbar, notice, tasks.notice, tasks.banner, tasks.prompt, message, body);

  const page: PageElements = {
    ...tools,
    root,
    notice,
    noticeText,
    retry,
    taskScreen: tasks,
    message,
    messageText,
    reload,
    body,
    container,
    widgets
  };

  return page;
};
