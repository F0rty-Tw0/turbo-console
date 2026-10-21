import type { GraphHostMessage } from '@turbo-console/webview-ui';

import { recordPosted } from '../../details/domain-logic/posted-cap.ts';
import { safePost } from '../../details/domain-logic/safe-post.ts';
import type { EditorPanelView } from '../../shared/common/panel-view.type.ts';
import type { GraphPanelsDeps } from '../common/graph-panel.type.ts';
import { GRAPH_PANEL_ID_PREFIX } from '../common/graph.const.ts';
import type { GraphPorts } from '../common/graph.type.ts';

/**
 * The ports of one panel's session. `post` records the message, then sends it without ever throwing. The root's
 * visibility goes to `RootsSession.setPanelVisible` only through `setPanelVisible` here.
 */
export const graphPortsOf = (
  deps: GraphPanelsDeps,
  root: string,
  posted: GraphHostMessage[],
  view: EditorPanelView<GraphHostMessage>
): GraphPorts => {
  const { host } = deps;
  const send = safePost(view.send, host.log);
  const post = (message: GraphHostMessage): void => {
    recordPosted(posted, message);
    send(message);
  };
  const openDetails = async (packageName: string): Promise<void> => deps.openDetails({ root, packageName });
  const setPanelVisible = (visible: boolean): void => {
    deps.setPanelVisible(root, `${GRAPH_PANEL_ID_PREFIX}${root}`, visible);
  };
  const ports: GraphPorts = {
    post,
    readCache: host.readCache,
    writeCache: host.writeCache,
    openDetails,
    setPanelVisible,
    log: host.log
  };

  return ports;
};
