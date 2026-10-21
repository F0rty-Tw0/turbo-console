import type { GraphHostMessage } from '@turbo-console/webview-ui';

import type { GraphApi, GraphPanelInfo } from '../../shared/common/api.type.ts';
import type { GraphHost, OpenGraphPanel } from '../common/graph-panel.type.ts';

/** The test API over the registry's open panels; a `receive` for a root with no panel rejects. */
export const graphApiOf = (panels: ReadonlyMap<string, OpenGraphPanel>, readCache: GraphHost['readCache']): GraphApi => {
  const infoOf = (panel: OpenGraphPanel): GraphPanelInfo => {
    const info: GraphPanelInfo = { root: panel.root, visible: panel.view.isVisible() };

    return info;
  };
  const list = (): GraphPanelInfo[] => {
    const open = Array.from(panels.values());

    return open.map(infoOf);
  };
  const posted = (root: string): GraphHostMessage[] => {
    const kept = panels.get(root)?.posted ?? [];

    return Array.from(kept);
  };
  const receive = async (root: string, message: unknown): Promise<void> => {
    const panel = panels.get(root);

    if (panel === undefined) throw new Error(`no open graph panel for ${root}`);

    await panel.session.receive(message);
  };
  const cachedHash = (root: string): string | null => readCache(root)?.hash ?? null;
  const api: GraphApi = { panels: list, posted, receive, cachedHash };

  return api;
};
