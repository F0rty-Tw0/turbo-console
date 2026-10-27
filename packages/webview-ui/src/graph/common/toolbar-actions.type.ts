import type { GraphView, PageElements } from './graph-page.type.ts';
import type { TaskPanel } from './graph-task.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';

/**
 * What one Export image press goes through: the view's PNG on `background()`, posted to the host; a failure shows on the
 * visible notice line and on `status`, which screen readers read.
 */
export type ExportActions = {
  readonly view: Pick<GraphView, 'exportPng'>;
  readonly background: () => string;
  readonly post: Bridge['post'];
  readonly status: Pick<HTMLElement, 'textContent'>;
  /** The notice line, read to tell whether it still shows a failure. */
  readonly notice: Pick<HTMLElement, 'textContent'>;
  readonly showNotice: TaskPanel['notice'];
};

/** What `wireToolbar` hangs the toolbar, Retry and Reload clicks on; `relayout` is the controller's guarded Re-layout. */
export type ToolbarWiring = {
  readonly page: Pick<PageElements, 'fit' | 'relayout' | 'exportImage' | 'retry' | 'reload' | 'status' | 'taskScreen'>;
  readonly view: Pick<GraphView, 'fit' | 'exportPng'>;
  readonly bridge: Pick<Bridge, 'post'>;
  readonly background: () => string;
  readonly relayout: () => void;
  /** Task mode's notice line, which also shows in package mode for `PACKAGE_NOTICE_MS`. */
  readonly showNotice: TaskPanel['notice'];
};
