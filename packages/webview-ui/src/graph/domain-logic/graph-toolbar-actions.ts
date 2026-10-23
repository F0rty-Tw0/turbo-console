import type { ExportActions, ToolbarWiring } from '../common/toolbar-actions.type.ts';

const EXPORT_FAILED_TEXT = 'Could not export the image';

/**
 * One Export image press: the view's PNG on the theme background goes to the host and clears an earlier
 * `EXPORT_FAILED_TEXT`, leaving any other status; a throw posts nothing and shows `EXPORT_FAILED_TEXT`.
 */
export const exportImage = (actions: ExportActions): void => {
  const { view, background, post, status } = actions;

  try {
    const bg = background();
    const png = view.exportPng(bg);

    post({ type: 'exportImage', png });
  } catch {
    status.textContent = EXPORT_FAILED_TEXT;

    return;
  }

  if (status.textContent === EXPORT_FAILED_TEXT) status.textContent = '';
};

/** The click handlers of Fit, Re-layout, Export image, Retry and Reload; an export failure goes to the status line. */
export const wireToolbar = (wiring: ToolbarWiring): void => {
  const { page, view, bridge, background, relayout } = wiring;
  const actions: ExportActions = { view, background, post: bridge.post, status: page.status };

  page.fit.addEventListener('click', (): void => view.fit());
  page.relayout.addEventListener('click', relayout);
  page.exportImage.addEventListener('click', (): void => exportImage(actions));
  page.retry.addEventListener('click', relayout);
  page.reload.addEventListener('click', (): void => bridge.post({ type: 'reload' }));
};
