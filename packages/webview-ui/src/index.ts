// The host gets the wire contract only: `bridge.type.ts` declares the webview-only `acquireVsCodeApi` global.
export type {
  FocusInGraphMessage,
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

export type {
  EdgeExplainResult,
  GraphAtomGroupState,
  GraphAtomOutcome,
  GraphAtomsMessage,
  GraphEdgeExplainedMessage,
  GraphHostMessage,
  GraphPrediction,
  GraphRunsMessage,
  GraphSetViewToggleMessage,
  GraphShowPackageMessage,
  GraphShowRequest,
  GraphShowTasksMessage,
  GraphShownTaskPackagesMessage,
  GraphShownUmbrellasMessage,
  GraphStateMessage,
  GraphWebviewMessage,
  LayoutGrouping,
  ManifestContext,
  ManifestEntry,
  ManifestField
} from './bridge/common/graph-message.type.ts';

export type {
  EdgeImportsResult,
  GraphEdgeImportsMessage,
  ImportKind,
  ImportLimit,
  ImportSite,
  ImportVia
} from './bridge/common/graph-imports.type.ts';

export type {
  EdgeRoute,
  GraphAtomFile,
  GraphAtomGroup,
  GraphEdge,
  GraphPackage,
  GraphReady,
  GraphRunState,
  GraphState,
  GraphTask,
  Position,
  Positions,
  Routes
} from './bridge/common/graph-state.type.ts';

export type { GraphViewState, TaskViewState } from './bridge/common/graph-view-state.type.ts';

export type { WebviewSlots } from './shell/common/webview-html.type.ts';

export {
  ENTRY_TEXT_MAX,
  IMPORT_SITES_MAX,
  MANIFEST_ENTRIES_MAX,
  MANIFEST_FIELDS,
  MANIFEST_FILE_MAX,
  MANIFEST_LINE_MAX,
  TASK_COUNT_MAX
} from './bridge/common/graph-message.const.ts';

export { LAYOUT_VERSION, ROUTE_BENDS_MAX } from './graph/common/graph-layout.const.ts';

export { ROOT_TASKS_TITLE, ROOT_TASK_PACKAGE, TASK_CAP } from './graph/common/graph-task.const.ts';

export { ICON_ID_PATTERN, TOOL_ICON_PREFIX } from './details/common/run-view.const.ts';

export { durationText, elapsedText } from './bridge/utils/duration-text.util.ts';

export { edgeIdOf } from './graph/utils/edge-id.util.ts';

export { hiddenScriptsText } from './details/utils/field-text.util.ts';

export { graphCsp, renderWebviewHtml, webviewCsp } from './shell/utils/webview-html.util.ts';
