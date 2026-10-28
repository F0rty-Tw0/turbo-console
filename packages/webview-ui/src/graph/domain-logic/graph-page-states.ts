import type { GraphReady, GraphState } from '../../bridge/common/graph-state.type.ts';
import type { LayoutNotice, LayoutScreen } from '../common/graph-layouts.type.ts';
import { FALLBACK_NOTICE, FALLBACK_NOTICE_TEXT, LAYOUT_FAILED_TEXT, LOADING_TEXT, NO_NOTICE } from '../common/graph.const.ts';
import type { PageElements } from '../common/page-elements.type.ts';

type MessageState = Exclude<GraphState, GraphReady>;

const messageTextOf = (state: MessageState): string => {
  switch (state.kind) {
    case 'error':
      return state.message;
    case 'loading':
      return LOADING_TEXT;
  }
};

/** Toolbar, notice, location bar and body hidden, `text` shown; Reload only when `canReload`. An open Legend closes, or it would reappear open with the graph. */
const showMessage = (page: PageElements, text: string, canReload: boolean): void => {
  page.legendPanel.hidePopover();
  page.toolbar.hidden = true;
  page.location.nav.hidden = true;
  page.body.hidden = true;
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

/** The notice line: hidden for `none`; the simplified-layout copy with Retry for `fallback`; a progress text without Retry. */
const showLayoutNotice = (page: PageElements, notice: LayoutNotice): void => {
  const text = notice.kind === 'progress' ? notice.text : FALLBACK_NOTICE_TEXT;

  page.noticeText.textContent = text;
  page.retry.hidden = notice.kind !== 'fallback';
  page.notice.hidden = notice.kind === 'none';
};

/** Fit and Export image are enabled together: both need a visible package. */
export const setFitAndExportDisabled = (page: Pick<PageElements, 'fit' | 'exportImage'>, isDisabled: boolean): void => {
  page.fit.disabled = isDisabled;
  page.exportImage.disabled = isDisabled;
};

/** Toolbar, location bar and body shown with the mode buttons, Controls, Details, Fit, Re-layout, Export image and Legend enabled; the notice only for a fallback layout. */
const showGraphView = (page: PageElements, isFallback: boolean): void => {
  const notice: LayoutNotice = isFallback ? FALLBACK_NOTICE : NO_NOTICE;

  page.message.hidden = true;
  page.toolbar.hidden = false;
  page.location.nav.hidden = false;
  page.body.hidden = false;
  showLayoutNotice(page, notice);
  page.packagesMode.disabled = false;
  page.taskMode.disabled = false;
  page.controls.disabled = false;
  page.details.disabled = false;
  setFitAndExportDisabled(page, false);
  page.relayout.disabled = false;
  page.legend.disabled = false;
};

/** What the layouts drive on the page: Loading, the graph view, the notice line. */
export const layoutScreenOf = (page: PageElements): LayoutScreen => {
  const screen: LayoutScreen = {
    showLoading: (): void => showMessage(page, LOADING_TEXT, false),
    showGraph: (isFallback: boolean): void => showGraphView(page, isFallback),
    showNotice: (notice: LayoutNotice): void => showLayoutNotice(page, notice)
  };

  return screen;
};
