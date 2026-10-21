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
  TaskCard,
  ToolView
} from './bridge/common/details-state.type.ts';

export type { GraphHostMessage, GraphWebviewMessage } from './bridge/common/graph-message.type.ts';

export type { GraphEdge, GraphState, Positions } from './bridge/common/graph-state.type.ts';

export type { GraphViewState } from './bridge/common/graph-view-state.type.ts';

export type { WebviewSlots } from './shell/common/webview-html.type.ts';

export { ICON_ID_PATTERN, TOOL_ICON_PREFIX } from './details/common/run-view.const.ts';

export { durationText, elapsedText } from './bridge/utils/duration-text.util.ts';

export { hiddenScriptsText } from './details/utils/field-text.util.ts';

export { renderWebviewHtml, webviewCsp } from './shell/utils/webview-html.util.ts';
