import type { GraphReady, GraphState } from '../../bridge/common/graph-state.type.ts';
import type { PageElements } from '../common/graph-page.type.ts';
import { LAYOUT_FAILED_TEXT, LOADING_TEXT, SINGLE_PACKAGE_TEXT } from '../common/graph.const.ts';

type MessageState = Exclude<GraphState, GraphReady>;

const messageTextOf = (state: MessageState): string => {
  switch (state.kind) {
    case 'error':
      return state.message;
    case 'loading':
      return LOADING_TEXT;
    case 'singlePackage':
      return SINGLE_PACKAGE_TEXT;
  }
};

/** Toolbar, notice and container hidden, `text` shown; Reload only when `canReload`. */
export const showMessage = (page: PageElements, text: string, canReload: boolean): void => {
  page.toolbar.hidden = true;
  page.container.hidden = true;
  page.notice.hidden = true;
  page.message.hidden = false;
  page.messageText.textContent = text;
  page.reload.hidden = !canReload;
};

/** The state's text; only `error` offers Reload, because the host honours `reload` only in its error state. */
export const showStateMessage = (page: PageElements, state: MessageState): void => {
  const text = messageTextOf(state);

  showMessage(page, text, state.kind === 'error');
};

/** The page's own failure, with its reason; no Reload, because the host is in its graph state and drops `reload` there. */
export const showFailure = (page: PageElements, error: unknown): void => {
  const reason = error instanceof Error ? error.message : 'unknown error';

  showMessage(page, `${LAYOUT_FAILED_TEXT}: ${reason}`, false);
};

/** Toolbar and container shown with Fit and Re-layout enabled; the notice only for a fallback layout. */
export const showGraphView = (page: PageElements, isFallback: boolean): void => {
  page.message.hidden = true;
  page.toolbar.hidden = false;
  page.container.hidden = false;
  page.notice.hidden = !isFallback;
  page.fit.disabled = false;
  page.relayout.disabled = false;
};
