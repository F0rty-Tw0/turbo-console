import type { DryRunRequest, TurboBinary } from '@turbo-console/core';
import type { Mock } from 'vitest';

import type { ViewFake } from '../../../shared/test/common/panel-fakes.type.ts';
import type { PanelHost } from '../../common/panel.type.ts';

/** The arguments of one `PanelHost.dryRun` call. */
export type DryRunCall = [binary: TurboBinary, request: DryRunRequest, signal: AbortSignal];

/** A `PanelHost` of spies: `open` hands out `views` in order (a fresh shown view each time unless the spec queued one). */
export type HostFakes = {
  readonly host: PanelHost;
  readonly open: Mock<PanelHost['open']>;
  readonly views: ViewFake[];
  readonly dryRun: Mock<PanelHost['dryRun']>;
  readonly execute: Mock<PanelHost['execute']>;
  readonly info: Mock<PanelHost['info']>;
  readonly error: Mock<PanelHost['error']>;
  readonly log: Mock<PanelHost['log']>;
  /** The next `open` returns this view. */
  readonly queue: (fake: ViewFake) => void;
};
