import { EXPORT_FAILED_TEXT } from '../common/graph.const.ts';
import type { ExportActions, ToolbarWiring } from '../common/toolbar-actions.type.ts';

/** One Export image press: the view's PNG on the theme background goes to the host; a throw posts nothing and shows `EXPORT_FAILED_TEXT`. */
export const exportImage = (actions: ExportActions): void => {
  const { view, background, post, showError } = actions;

  try {
    const bg = background();
    const png = view.exportPng(bg);

    post({ type: 'exportImage', png });
  } catch {
    showError(EXPORT_FAILED_TEXT);
  }
};

/** The click handlers of Fit, Re-layout, Export image, Retry and Reload; an export failure goes to the status line. */
export const wireToolbar = (wiring: ToolbarWiring): void => {
  const { page, view, bridge, background, relayout } = wiring;
  const showError = (text: string): void => {
    page.status.textContent = text;
  };
  const actions: ExportActions = { view, background, post: bridge.post, showError };

  page.fit.addEventListener('click', (): void => view.fit());
  page.relayout.addEventListener('click', relayout);
  page.exportImage.addEventListener('click', (): void => exportImage(actions));
  page.retry.addEventListener('click', relayout);
  page.reload.addEventListener('click', (): void => bridge.post({ type: 'reload' }));
};
