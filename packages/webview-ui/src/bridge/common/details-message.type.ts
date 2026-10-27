import type { DetailsState, RunView } from './details-state.type.ts';

export type ReadyMessage = { readonly type: 'ready' };

/** `taskId` must be a task of the panel's current state; the host drops any other. */
export type TaskMessage = {
  readonly type: 'run' | 'stop' | 'copy' | 'showInTaskGraph';
  readonly taskId: string;
};

export type OpenPackageJsonMessage = { readonly type: 'openPackageJson' };

export type FocusInGraphMessage = { readonly type: 'focusInGraph' };

export type RefreshMessage = {
  readonly type: 'refresh';
  readonly scope: 'dryRun' | 'root';
};

export type ShowOutputMessage = { readonly type: 'showOutput' };

/** Webview to host. The webview is a trust boundary: the host validates every message. */
export type WebviewMessage =
  ReadyMessage | TaskMessage | OpenPackageJsonMessage | FocusInGraphMessage | RefreshMessage | ShowOutputMessage;

export type StateMessage = {
  readonly type: 'state';
  readonly state: DetailsState;
};

export type RunStateMessage = {
  readonly type: 'runState';
  readonly taskId: string;
  readonly run: RunView;
};

/** Host to webview. */
export type HostMessage = StateMessage | RunStateMessage;
