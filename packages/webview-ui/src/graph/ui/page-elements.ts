import type { PageElements } from '../common/graph-page.type.ts';
import {
  CLEAR_LABEL,
  FALLBACK_NOTICE_TEXT,
  FIT_LABEL,
  GRAPH_LABEL,
  RELAYOUT_LABEL,
  RELOAD_LABEL,
  RETRY_LABEL
} from '../common/graph.const.ts';

/** An element whose text is set through `textContent`, the only way text reaches the page (spec 1b D3). */
const textElement = <TTag extends keyof HTMLElementTagNameMap>(
  tag: TTag,
  className: string,
  text: string
): HTMLElementTagNameMap[TTag] => {
  const element = document.createElement(tag);

  element.className = className;
  element.textContent = text;

  return element;
};

/** A disabled text button: its visible text is its accessible name. */
const textButton = (label: string): HTMLButtonElement => {
  const button = textElement('button', 'text-button', label);

  button.type = 'button';
  button.disabled = true;

  return button;
};

const statusLine = (): HTMLElement => {
  const status = textElement('p', 'graph-status', '');

  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  return status;
};

const graphContainer = (): HTMLElement => {
  const container = textElement('div', 'graph-container', '');

  container.tabIndex = 0;
  container.setAttribute('role', 'application');
  container.setAttribute('aria-label', GRAPH_LABEL);

  return container;
};

/** A hidden block of one text line and one enabled button. */
const textBlock = (className: string, line: HTMLElement, button: HTMLButtonElement): HTMLElement => {
  const block = textElement('div', className, '');

  block.hidden = true;
  button.disabled = false;
  block.append(line, button);

  return block;
};

/**
 * The page in its pre-state: toolbar and the empty container shown, every toolbar button disabled, the notice and
 * the message block hidden. DOM order is the Tab order: toolbar, notice, message, then the container.
 */
export const buildPage = (): PageElements => {
  const fit = textButton(FIT_LABEL);
  const relayout = textButton(RELAYOUT_LABEL);
  const clear = textButton(CLEAR_LABEL);
  const status = statusLine();
  const toolbar = textElement('header', 'graph-toolbar', '');
  const retry = textButton(RETRY_LABEL);
  const noticeText = textElement('p', 'graph-notice-text', FALLBACK_NOTICE_TEXT);
  const notice = textBlock('graph-notice', noticeText, retry);
  const reload = textButton(RELOAD_LABEL);
  const messageText = textElement('p', 'graph-message-text', '');
  const message = textBlock('graph-message', messageText, reload);
  const container = graphContainer();
  const root = textElement('main', 'graph-page', '');

  toolbar.append(fit, relayout, clear, status);
  root.append(toolbar, notice, message, container);

  const page: PageElements = { root, toolbar, fit, relayout, clear, status, notice, retry, message, messageText, reload, container };

  return page;
};
