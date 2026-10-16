import type { HostMessage } from '@turbo-console/webview-ui';

import type { DetailsApi, PanelInfo } from '../../shared/common/api.type.ts';
import type { OpenPanel } from '../common/panel.type.ts';
import { panelIdOf } from '../utils/panel-id.util.ts';

/** The test API over the registry's open panels; a call for a panel that is not open rejects. */
export const detailsApiOf = (panels: ReadonlyMap<string, OpenPanel>): DetailsApi => {
  const panelOf = (root: string, packageName: string): OpenPanel => {
    const panel = panels.get(panelIdOf({ root, packageName }));

    if (panel === undefined) throw new Error(`no open details panel for ${packageName} in ${root}`);

    return panel;
  };
  const infoOf = (panel: OpenPanel): PanelInfo => {
    const info: PanelInfo = { ...panel.key, visible: panel.view.isVisible() };

    return info;
  };
  const list = (): PanelInfo[] => {
    const open = Array.from(panels.values());

    return open.map(infoOf);
  };
  const posted = (root: string, packageName: string): HostMessage[] => {
    const panel = panels.get(panelIdOf({ root, packageName }));
    const kept = panel?.posted ?? [];

    return Array.from(kept);
  };
  const receive = async (root: string, packageName: string, message: unknown): Promise<void> => {
    await panelOf(root, packageName).session.receive(message);
  };
  const whenIdle = async (root: string, packageName: string): Promise<void> => {
    await panelOf(root, packageName).session.whenIdle();
  };
  const api: DetailsApi = { panels: list, posted, receive, whenIdle };

  return api;
};
