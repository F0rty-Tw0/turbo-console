import type { DryRunState } from '@turbo-console/core';
import { vi } from 'vitest';

import type { ViewFake } from '../../../shared/test/common/panel-fakes.type.ts';
import { viewMock } from '../../../shared/test/mocks/panel-view.mock.ts';
import type { PanelHost } from '../../common/panel.type.ts';
import type { HostFakes } from '../common/panel-fakes.type.ts';

const FOLDER_ROOTS = ['/ws', '/other', '/bare'];

/** Every host effect a spy; `dryRun` and `execute` resolve at once. */
export const hostMock = (): HostFakes => {
  const views: ViewFake[] = [];
  const queued: ViewFake[] = [];
  const open = vi.fn<PanelHost['open']>(() => {
    const fake = queued.shift() ?? viewMock();

    views.push(fake);

    return fake.view;
  });
  const dryRun = vi.fn<(...args: Parameters<PanelHost['dryRun']>) => Promise<DryRunState[]>>().mockResolvedValue([]);
  const execute = vi.fn<PanelHost['execute']>().mockResolvedValue(undefined);
  const info = vi.fn<PanelHost['info']>();
  const error = vi.fn<PanelHost['error']>();
  const log = vi.fn<PanelHost['log']>();
  const rootOf = (file: string): string | null => {
    const holding = FOLDER_ROOTS.find((root) => file.startsWith(`${root}/`));

    return holding ?? null;
  };
  const host: PanelHost = { open, rootOf, dryRun, execute, info, error, log };
  const queue = (fake: ViewFake): void => {
    queued.push(fake);
  };
  const fakes: HostFakes = { host, open, views, dryRun, execute, info, error, log, queue };

  return fakes;
};
