import type { HostMessage } from '@turbo-console/webview-ui';
import type { Mock } from 'vitest';

import type { EditorPanelView } from '../../common/panel-view.type.ts';

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
