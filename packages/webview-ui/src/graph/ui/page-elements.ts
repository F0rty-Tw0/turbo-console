import { buildToolbar } from './toolbar-elements.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { PageElements } from '../common/graph-page.type.ts';
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

/** The row that holds the controls panel, once a graph shows, then the container. */
const graphBody = (container: HTMLElement): HTMLElement => {
  const body = textElement('div', 'graph-body', '');

  body.append(container);

  return body;
};

/**
 * The page in its pre-state: toolbar and the body with the empty container shown, every toolbar button disabled, the
 * notice and the message block hidden. DOM order is the Tab order: toolbar, notice, message, then the body.
 */
export const buildPage = (): PageElements => {
  const tools = buildToolbar();
  const retry = textButton(RETRY_LABEL);
  const noticeText = textElement('p', 'graph-notice-text', FALLBACK_NOTICE_TEXT);
  const notice = textBlock('graph-notice', noticeText, retry);
  const reload = textButton(RELOAD_LABEL);
  const messageText = textElement('p', 'graph-message-text', '');
  const message = textBlock('graph-message', messageText, reload);
  const container = graphContainer();
  const body = graphBody(container);
  const root = textElement('main', 'graph-page', '');

  root.append(tools.toolbar, notice, message, body);

  const page: PageElements = {
    ...tools,
    root,
    notice,
    noticeText,
    retry,
    message,
    messageText,
    reload,
    body,
    container
  };

  return page;
};
