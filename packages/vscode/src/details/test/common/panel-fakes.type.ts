import type { DryRunState } from '@turbo-console/core';
import type { Mock } from 'vitest';

import type { PanelHost, PanelView } from '../../common/panel.type.ts';

/** A `PanelView` the spec drives: `show` changes visibility and fires the view-state listeners, `close` is the user closing the tab. */
export type ViewFake = {
  readonly view: PanelView;
  readonly send: Mock<PanelView['send']>;
  readonly reveal: Mock<PanelView['reveal']>;
  readonly setTitle: Mock<PanelView['setTitle']>;
  readonly dispose: Mock<PanelView['dispose']>;
  readonly show: (visible: boolean) => void;
  readonly message: (value: unknown) => void;
  readonly close: () => void;
};

/** A `PanelHost` of spies: `open` hands out `views` in order (a fresh shown view each time unless the spec queued one). */
export type HostFakes = {
  readonly host: PanelHost;
  readonly open: Mock<PanelHost['open']>;
  readonly views: ViewFake[];
  readonly dryRun: Mock<(...args: Parameters<PanelHost['dryRun']>) => Promise<DryRunState[]>>;
  readonly execute: Mock<PanelHost['execute']>;
  readonly info: Mock<PanelHost['info']>;
  readonly error: Mock<PanelHost['error']>;
  readonly log: Mock<PanelHost['log']>;
  /** The next `open` returns this view. */
  readonly queue: (fake: ViewFake) => void;
};
