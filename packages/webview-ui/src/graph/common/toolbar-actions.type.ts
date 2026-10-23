import type { GraphView, PageElements } from './graph-page.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';

/** What one Export image press goes through: the view's PNG on `background()`, posted to the host, or `showError` on a throw. */
export type ExportActions = {
  readonly view: Pick<GraphView, 'exportPng'>;
  readonly background: () => string;
  readonly post: Bridge['post'];
  readonly showError: (text: string) => void;
};

/** What `wireToolbar` hangs the toolbar, Retry and Reload clicks on; `relayout` is the controller's guarded Re-layout. */
export type ToolbarWiring = {
  readonly page: Pick<PageElements, 'fit' | 'relayout' | 'exportImage' | 'retry' | 'reload' | 'status'>;
  readonly view: Pick<GraphView, 'fit' | 'exportPng'>;
  readonly bridge: Pick<Bridge, 'post'>;
  readonly background: () => string;
  readonly relayout: () => void;
};
