import type { DryRunRequest, DryRunState } from '@turbo-console/core';

import type { Coordinator, RootEntry, Roots } from '../../roots/common/coordinator.type.ts';
import type { FileLookupPorts } from '../../run/common/picker.type.ts';
import { recordingPost } from '../../shared/domain-logic/panel-wiring.ts';
import { NO_BINARY_TEXT } from '../common/details.const.ts';
import type { DetailsPorts } from '../common/details.type.ts';
import type { FileLookup, PanelHost, PanelParts, PanelView, PanelsDeps } from '../common/panel.type.ts';

/**
 * The file lookup of one open from a manifest. `ensureLoaded` waits for the first answer of the root's current
 * coordinator and keeps it as `loaded`; once that coordinator has left the store (its root removed or replaced), `info`
 * shows nothing, so such an open ends with no message.
 */
export const fileLookupOf = (roots: Roots, host: PanelHost): FileLookup => {
  let loaded: Coordinator | null = null;
  const isLoadedEntry = (entry: RootEntry): boolean => entry.coordinator === loaded;
  const ensureLoaded = async (root: string): Promise<void> => {
    loaded = roots.get(root)?.coordinator ?? null;
    await loaded?.ensureLoaded();
  };
  const info = (text: string): void => {
    const isInStore = roots.all().some(isLoadedEntry);
    const isGone = loaded !== null && !isInStore;

    if (!isGone) host.info(text);
  };
  const ports: FileLookupPorts = { ensureLoaded, rootOf: host.rootOf, info };
  const lookup: FileLookup = { ports, loaded: () => loaded };

  return lookup;
};

/**
 * The ports of one panel's session. `post` records the message, then sends it without ever throwing. The root's
 * visibility goes to `RootsSession.setPanelVisible` only through `setPanelVisible` here, which the session calls on
 * a change and once with `false` on dispose.
 */
export const panelPortsOf = (deps: PanelsDeps, parts: PanelParts, view: PanelView): DetailsPorts => {
  const { roots, host } = deps;
  const { key, id, posted } = parts;
  const post = recordingPost(view.send, posted, host.log);
  const dryRun = async (request: DryRunRequest, signal: AbortSignal): Promise<DryRunState[]> => {
    const binary = roots.get(key.root)?.state.binary ?? null;

    if (binary === null) throw new Error(NO_BINARY_TEXT);

    return host.dryRun(binary, request, signal);
  };
  const isStale = (root: string): boolean => roots.get(root)?.coordinator.isStale() ?? false;
  const setPanelVisible = (visible: boolean): void => {
    deps.setPanelVisible(key.root, id, visible);
  };
  const ports: DetailsPorts = {
    post,
    dryRun,
    isStale,
    execute: host.execute,
    setPanelVisible,
    setTitle: view.setTitle,
    info: host.info,
    log: host.log,
    scriptsShown: () => deps.scripts.isShown(),
    now: () => Date.now()
  };

  return ports;
};
