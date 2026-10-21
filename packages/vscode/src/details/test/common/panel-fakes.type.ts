import type { DryRunState } from '@turbo-console/core';
import type { HostMessage } from '@turbo-console/webview-ui';
import type { Mock } from 'vitest';

import type { EditorPanelView } from '../../../shared/common/panel-view.type.ts';
import type { PanelHost } from '../../common/panel.type.ts';

/** A `PanelView` the spec drives: `show` changes visibility and fires the view-state listeners, `close` is the user closing the tab. */
export type ViewFake<TMessage = HostMessage> = {
  readonly view: EditorPanelView<TMessage>;
  readonly send: Mock<EditorPanelView<TMessage>['send']>;
  readonly reveal: Mock<EditorPanelView<TMessage>['reveal']>;
  readonly setTitle: Mock<EditorPanelView<TMessage>['setTitle']>;
  readonly dispose: Mock<EditorPanelView<TMessage>['dispose']>;
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
