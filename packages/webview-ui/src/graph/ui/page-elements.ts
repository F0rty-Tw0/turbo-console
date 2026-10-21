import { textElement } from '../../shared/ui/text-element.ts';
import type { PageElements } from '../common/graph-page.type.ts';
import {
  CLEAR_LABEL,
  CONTROLS_LABEL,
  FALLBACK_NOTICE_TEXT,
  FIT_LABEL,
  GRAPH_LABEL,
  RELAYOUT_LABEL,
  RELOAD_LABEL,
  RETRY_LABEL
} from '../common/graph.const.ts';

/** A text button: its visible text is its accessible name. */
const textButton = (label: string, isDisabled: boolean): HTMLButtonElement => {
  const button = textElement('button', 'text-button', label);

  button.type = 'button';
  button.disabled = isDisabled;

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

/** A hidden block of one text line and one button. */
const textBlock = (className: string, line: HTMLElement, button: HTMLButtonElement): HTMLElement => {
  const block = textElement('div', className, '');

  block.hidden = true;
  block.append(line, button);

  return block;
};

/** The controls panel toggle; the panel `aside#graph-controls` arrives with the first graph. */
const controlsToggle = (): HTMLButtonElement => {
  const controls = textButton(CONTROLS_LABEL, true);

  controls.setAttribute('aria-controls', 'graph-controls');
  controls.setAttribute('aria-expanded', 'false');

  return controls;
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
  const controls = controlsToggle();
  const fit = textButton(FIT_LABEL, true);
  const relayout = textButton(RELAYOUT_LABEL, true);
  const clear = textButton(CLEAR_LABEL, true);
  const status = statusLine();
  const toolbar = textElement('header', 'graph-toolbar', '');
  const retry = textButton(RETRY_LABEL, false);
  const noticeText = textElement('p', 'graph-notice-text', FALLBACK_NOTICE_TEXT);
  const notice = textBlock('graph-notice', noticeText, retry);
  const reload = textButton(RELOAD_LABEL, false);
  const messageText = textElement('p', 'graph-message-text', '');
  const message = textBlock('graph-message', messageText, reload);
  const container = graphContainer();
  const body = graphBody(container);
  const root = textElement('main', 'graph-page', '');

  toolbar.append(controls, fit, relayout, clear, status);
  root.append(toolbar, notice, message, body);

  const page: PageElements = {
    root,
    toolbar,
    controls,
    fit,
    relayout,
    clear,
    status,
    notice,
    retry,
    message,
    messageText,
    reload,
    body,
    container
  };

  return page;
};
