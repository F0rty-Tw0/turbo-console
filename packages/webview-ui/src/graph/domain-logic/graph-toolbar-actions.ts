import type { ExportActions, ToolbarWiring } from '../common/toolbar-actions.type.ts';

const EXPORT_FAILED_TEXT = 'Could not export the image';

/**
 * One Export image press: the view's PNG on the theme background goes to the host and hides an earlier
 * `EXPORT_FAILED_TEXT`, leaving any other notice; a throw posts nothing and shows `EXPORT_FAILED_TEXT` on the notice line.
 */
export const exportImage = (actions: ExportActions): void => {
  const { view, background, post, notice, showNotice } = actions;

  try {
    const bg = background();
    const png = view.exportPng(bg);

    post({ type: 'exportImage', png });
  } catch {
    showNotice(EXPORT_FAILED_TEXT);

    return;
  }

  if (notice.textContent === EXPORT_FAILED_TEXT) showNotice(null);
};

/** The click handlers of Fit, Re-layout, Export image, Retry and Reload; an export failure goes to the notice line. */
export const wireToolbar = (wiring: ToolbarWiring): void => {
  const { page, view, bridge, background, relayout, showNotice } = wiring;
  const { notice } = page.taskScreen;
  const actions: ExportActions = { view, background, post: bridge.post, notice, showNotice };

  page.fit.addEventListener('click', (): void => view.fit());
  page.relayout.addEventListener('click', relayout);
  page.exportImage.addEventListener('click', (): void => exportImage(actions));
  page.retry.addEventListener('click', relayout);
  page.reload.addEventListener('click', (): void => bridge.post({ type: 'reload' }));
};
