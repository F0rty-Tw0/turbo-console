import type { DryRunRequest, DryRunState } from '@turbo-console/core';
import type { HostMessage } from '@turbo-console/webview-ui';

import { recordPosted } from './posted-cap.ts';
import { safePost } from './safe-post.ts';
import type { Roots } from '../../roots/common/coordinator.type.ts';
import { NO_BINARY_TEXT } from '../common/details.const.ts';
import type { DetailsPorts } from '../common/details.type.ts';
import type { PanelParts, PanelView, PanelsDeps } from '../common/panel.type.ts';

/** Waits for the first answer of `root`'s load; a root that is not in the store has nothing to wait for. */
export const ensureLoadedWith = (roots: Roots): ((root: string) => Promise<void>) => {
  const ensureLoaded = async (root: string): Promise<void> => {
    await roots.get(root)?.coordinator.ensureLoaded();
  };

  return ensureLoaded;
};

/**
 * The ports of one panel's session. `post` records the message, then sends it without ever throwing. The root's
 * visibility goes to `RootsSession.setPanelVisible` only through `setPanelVisible` here, which the session calls on
 * a change and once with `false` on dispose.
 */
export const panelPortsOf = (deps: PanelsDeps, parts: PanelParts, view: PanelView): DetailsPorts => {
  const { roots, host } = deps;
  const { key, id, posted } = parts;
  const send = safePost(view.send, host.log);
  const post = (message: HostMessage): void => {
    recordPosted(posted, message);
    send(message);
  };
  const dryRun = async (request: DryRunRequest, signal: AbortSignal): Promise<DryRunState[]> => {
    const binary = roots.get(key.root)?.state.binary ?? null;

    if (binary === null) throw new Error(NO_BINARY_TEXT);

    return host.dryRun(binary, request, signal);
  };
  const ensureLoaded = ensureLoadedWith(roots);
  const isStale = (root: string): boolean => roots.get(root)?.coordinator.isStale() ?? false;
  const setPanelVisible = (visible: boolean): void => {
    deps.setPanelVisible(key.root, id, visible);
  };
  const ports: DetailsPorts = {
    post,
    dryRun,
    ensureLoaded,
    isStale,
    execute: host.execute,
    setPanelVisible,
    info: host.info,
    log: host.log
  };

  return ports;
};
