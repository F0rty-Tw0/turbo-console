// The host gets the wire contract only: `bridge.type.ts` declares the webview-only `acquireVsCodeApi` global.
export type {
  HostMessage,
  OpenPackageJsonMessage,
  ReadyMessage,
  RefreshMessage,
  RunStateMessage,
  ShowOutputMessage,
  StateMessage,
  TaskMessage,
  WebviewMessage
} from './bridge/common/details-message.type.ts';

export type {
  DetailsState,
  DryRunPhase,
  MissingPackage,
  PackageDetails,
  RunView,
  TaskCard
} from './bridge/common/details-state.type.ts';

export type { WebviewSlots } from './shell/common/webview-html.type.ts';

export { durationText, elapsedText } from './bridge/utils/duration-text.util.ts';

export { renderWebviewHtml, webviewCsp } from './shell/utils/webview-html.util.ts';
