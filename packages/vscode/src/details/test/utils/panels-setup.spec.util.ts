import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import type { Coordinator, RootEntry, Roots } from '../../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../../roots/common/root.type.ts';
import type { DetailsApi } from '../../../shared/common/api.type.ts';
import type { PanelHost } from '../../common/panel.type.ts';
import type { HostFakes } from '../common/panel-fakes.type.ts';

export const OTHER_FOLDER: RootFolder = { root: '/other', name: 'other' };

export const BARE_FOLDER: RootFolder = { root: '/bare', name: 'bare' };

export const A_MANIFEST = '/ws/packages/a/package.json';

/** `roots` where no root has a turbo binary. */
export const withoutBinary = (roots: Roots): Roots => {
  const strip = (entry: RootEntry): RootEntry => {
    const state = { ...entry.state, binary: null };
    const stripped: RootEntry = { ...entry, state };

    return stripped;
  };
  const get = (root: string): RootEntry | undefined => {
    const entry = roots.get(root);

    if (entry === undefined) return undefined;

    return strip(entry);
  };
  const all = (): RootEntry[] => roots.all().map(strip);
  const onDidChange: Roots['onDidChange'] = (listener) => roots.onDidChange(listener);
  const stripped: Roots = { get, all, onDidChange };

  return stripped;
};

/** Sends `message` to the open panel of `/ws` / `a` `count` times, one after the other. */
export const receiveTimes = async (api: DetailsApi, message: unknown, count: number): Promise<void> => {
  for (let sent = 0; sent < count; sent += 1) await api.receive('/ws', 'a', message);
};

/** The last message the first view was sent. */
export const lastSentOf = (fakes: HostFakes): unknown => fakes.views[0]?.send.mock.calls.at(-1)?.[0];

/** The arguments of the first dry run, or none when it never ran. */
export const dryRunCallOf = (fakes: HostFakes): Parameters<PanelHost['dryRun']> | [] => fakes.dryRun.mock.calls[0] ?? [];

/** The spy behind `root`'s `coordinator.ensureLoaded`. */
export const ensureLoadedOf = (roots: Roots, root: string): MockedFunction<Coordinator['ensureLoaded']> => {
  const ensureLoaded = roots.get(root)?.coordinator.ensureLoaded;

  if (ensureLoaded === undefined) throw new Error(`no root ${root}`);

  return vi.mocked(ensureLoaded);
};

/** Makes the next `ensureLoaded` of `root` wait for the spec. */
export const deferEnsureLoaded = (roots: Roots, root: string): PromiseWithResolvers<undefined> => {
  const loaded = Promise.withResolvers<undefined>();

  ensureLoadedOf(roots, root).mockReturnValueOnce(loaded.promise);

  return loaded;
};

/** Makes `root`'s coordinator report a skipped reload pending, as a watcher change that has not reloaded yet does. */
export const markStale = (roots: Roots, root: string): void => {
  const isStale = roots.get(root)?.coordinator.isStale;

  if (isStale === undefined) throw new Error(`no root ${root}`);

  vi.mocked(isStale).mockReturnValue(true);
};

/** How many `state` messages were posted to the panel of `/ws` / `a`. */
export const statesPostedOf = (api: DetailsApi): number => {
  const posted = api.posted('/ws', 'a');
  const states = posted.filter((message) => message.type === 'state');

  return states.length;
};
