import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  ICON_ID_PATTERN,
  TOOL_ICON_PREFIX,
  durationText,
  edgeIdOf,
  elapsedText,
  graphCsp,
  hiddenScriptsText,
  renderWebviewHtml,
  webviewCsp
  // eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '.' this rule asks for.
} from './index.ts';
import type {
  DetailsState,
  DryRunPhase,
  EdgeExplainResult,
  FocusInGraphMessage,
  GraphAtomFile,
  GraphAtomGroup,
  GraphAtomGroupState,
  GraphAtomOutcome,
  GraphAtomsMessage,
  GraphEdge,
  GraphEdgeExplainedMessage,
  GraphEdgeImportsMessage,
  GraphHostMessage,
  GraphPackage,
  GraphPrediction,
  GraphReady,
  GraphRunState,
  GraphRunsMessage,
  GraphSetViewToggleMessage,
  GraphShowPackageMessage,
  GraphShowRequest,
  GraphShowTasksMessage,
  GraphShownTaskPackagesMessage,
  GraphShownUmbrellasMessage,
  GraphState,
  GraphStateMessage,
  GraphTask,
  GraphViewState,
  GraphWebviewMessage,
  HostMessage,
  LayoutGrouping,
  ManifestContext,
  ManifestEntry,
  ManifestField,
  MissingPackage,
  OpenPackageJsonMessage,
  PackageDetails,
  Positions,
  ReadyMessage,
  RefreshMessage,
  Routes,
  RunStateMessage,
  RunView,
  ShowOutputMessage,
  StateMessage,
  TaskCard,
  TaskMessage,
  TaskViewState,
  ToolView,
  WebviewMessage,
  WebviewSlots
  // eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '.' this rule asks for.
} from './index.ts';

type ExpectedEdge = { readonly source: string; readonly target: string };
type ExpectedPackage = {
  readonly name: string;
  readonly bareName: string;
  readonly path: string;
  readonly tags: string[];
  readonly taskCount: number;
};
type ExpectedTask = {
  readonly id: string;
  readonly packageName: string;
  readonly name: string;
  readonly command: string | null;
  readonly isRunnable: boolean;
  readonly isTurboTask: boolean;
  readonly dependencies: string[];
};
type ExpectedAtomFile = { readonly id: string; readonly specPath: string; readonly isLive: boolean };
type ExpectedAtomGroup = { readonly umbrellaId: string; readonly files: GraphAtomFile[] };
type ExpectedAtomGroupState = { readonly counts: string; readonly files: Record<string, 'passed' | 'failed' | 'cached' | 'none'> };
type ExpectedAtomsMessage = { readonly type: 'atoms'; readonly groups: Record<string, GraphAtomGroupState> };
type ExpectedRunsMessage = {
  readonly type: 'runs';
  readonly runs: Readonly<Record<string, GraphRunState>>;
  readonly owners?: Readonly<Record<string, string>>;
  readonly predictions?: Readonly<Record<string, GraphPrediction>>;
};
type ExpectedShownTaskPackagesMessage = { readonly type: 'shownTaskPackages'; readonly packageNames: string[] };
type ExpectedShownUmbrellasMessage = { readonly type: 'shownUmbrellas'; readonly ids: string[] };
type ExpectedSetViewToggleMessage = {
  readonly type: 'setViewToggle';
  readonly toggle: 'scope' | 'scripts' | 'prediction';
  readonly shown: boolean;
};
type ExpectedPosition = { readonly x: number; readonly y: number };
type ExpectedEdgeRoute = { readonly start: ExpectedPosition; readonly bends: ExpectedPosition[]; readonly end: ExpectedPosition };
type ExpectedTaskView = {
  readonly chosen: string[];
  readonly capLifted: boolean;
  readonly depth: number;
  readonly selected: string | null;
  readonly search: string;
  readonly zoom: number;
  readonly pan: ExpectedPosition;
  readonly fitted: boolean;
  readonly layoutKey: string;
};
type ExpectedShowPackageMessage = { readonly type: 'showPackage'; readonly name: string };
type ExpectedStateMessage = { readonly type: 'state'; readonly state: GraphState };
type ExpectedContext = { readonly before?: string; readonly after?: string };
type ExpectedEntry = {
  readonly field: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';
  readonly key: string;
  readonly spec: string;
  readonly line: number;
  readonly context: ExpectedContext;
};
type ExpectedFound = { readonly kind: 'found'; readonly file: string; readonly entries: ExpectedEntry[] };
type ExpectedMissing = { readonly kind: 'missing'; readonly file: string };
type ExpectedUnreadable = { readonly kind: 'unreadable'; readonly file: string };
type ExpectedResult = ExpectedFound | ExpectedMissing | ExpectedUnreadable;
type ExpectedExplainedMessage = {
  readonly type: 'edgeExplained';
  readonly source: string;
  readonly target: string;
  readonly result: ExpectedResult;
};
type LayoutDoneKey = { readonly type: 'layoutDone' };
type OpenManifestKey = { readonly type: 'openManifest' };
type PositionsKey = { readonly type: 'positions' };
type ExportImageKey = { readonly type: 'exportImage' };
type RunTaskKey = { readonly type: 'runTask' };

/** The host-facing API: the HTML renderer, CSP, duration formatters, hidden-scripts hint and the icon-id pattern, tool-icon prefix, task cap, the import sites cap, root tasks title, root task package, layout version and route bend limit constants; everything else is wire-contract types. The webview-only bridge stays internal. */
const RUNTIME_EXPORTS = [
  'ENTRY_TEXT_MAX',
  'ICON_ID_PATTERN',
  'IMPORT_SITES_MAX',
  'LAYOUT_VERSION',
  'MANIFEST_ENTRIES_MAX',
  'MANIFEST_FIELDS',
  'MANIFEST_FILE_MAX',
  'MANIFEST_LINE_MAX',
  'ROOT_TASKS_TITLE',
  'ROOT_TASK_PACKAGE',
  'ROUTE_BENDS_MAX',
  'TASK_CAP',
  'TASK_COUNT_MAX',
  'TOOL_ICON_PREFIX',
  'durationText',
  'edgeIdOf',
  'elapsedText',
  'graphCsp',
  'hiddenScriptsText',
  'renderWebviewHtml',
  'webviewCsp'
];

describe('FEATURE: webview-ui package entry', () => {
  describe('GIVEN the package entry point', () => {
    it('WHEN its exports are listed THEN they are exactly the public API, and every public type has its exact shape', async () => {
      // eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '.' this rule asks for.
      const entry = await import('./index.ts');

      const names = Object.keys(entry).toSorted();

      expect(names).toStrictEqual(RUNTIME_EXPORTS);
      expect(entry.ENTRY_TEXT_MAX).toBe(200);
      expect(entry.MANIFEST_ENTRIES_MAX).toBe(8);
      expect(entry.MANIFEST_FILE_MAX).toBe(1_024);
      expect(entry.MANIFEST_LINE_MAX).toBe(1_000_000);
      expect(entry.ROOT_TASKS_TITLE).toBe('Workspace root (//)');
      expect(entry.ROOT_TASK_PACKAGE).toBe('//');
      expect(entry.TASK_CAP).toBe(300);
      expect(entry.TASK_COUNT_MAX).toBe(100_000);
      expect(entry.MANIFEST_FIELDS).toStrictEqual(['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']);
      expect(entry.ICON_ID_PATTERN).toBe(ICON_ID_PATTERN);
      expect(entry.LAYOUT_VERSION).toBe(3);
      expect(entry.ROUTE_BENDS_MAX).toBe(64);
      expect(entry.edgeIdOf).toBe(edgeIdOf);
      expect(entry.TOOL_ICON_PREFIX).toBe(TOOL_ICON_PREFIX);
      expect(entry.durationText).toBe(durationText);
      expect(entry.elapsedText).toBe(elapsedText);
      expect(entry.graphCsp).toBe(graphCsp);
      expect(entry.hiddenScriptsText).toBe(hiddenScriptsText);
      expect(entry.renderWebviewHtml).toBe(renderWebviewHtml);
      expect(entry.webviewCsp).toBe(webviewCsp);
      expectTypeOf<WebviewSlots>().toEqualTypeOf<Readonly<Record<string, string>>>();
      expectTypeOf<WebviewMessage>().toEqualTypeOf<
        ReadyMessage | TaskMessage | OpenPackageJsonMessage | FocusInGraphMessage | RefreshMessage | ShowOutputMessage
      >();
      expectTypeOf<FocusInGraphMessage['type']>().toEqualTypeOf<'focusInGraph'>();
      expectTypeOf<HostMessage>().toEqualTypeOf<StateMessage | RunStateMessage>();
      expectTypeOf<TaskMessage['type']>().toEqualTypeOf<'run' | 'stop' | 'copy' | 'showInTaskGraph'>();
      expectTypeOf<RefreshMessage['scope']>().toEqualTypeOf<'dryRun' | 'root'>();
      expectTypeOf<StateMessage['state']>().toEqualTypeOf<DetailsState>();
      expectTypeOf<RunStateMessage['run']>().toEqualTypeOf<RunView>();
      expectTypeOf<DetailsState>().toEqualTypeOf<PackageDetails | MissingPackage>();
      expectTypeOf<DryRunPhase>().toEqualTypeOf<'loading' | 'ready' | 'failed'>();
      expectTypeOf<PackageDetails['tasks']>().toEqualTypeOf<TaskCard[]>();
      expectTypeOf<PackageDetails['taskGraph']>().toEqualTypeOf<boolean>();
      expectTypeOf<TaskCard['cacheStatus']>().toEqualTypeOf<'HIT' | 'MISS' | 'deferred' | null>();
      expectTypeOf<RunView['colorVar']>().toEqualTypeOf<string | null>();
      expectTypeOf<RunView['elapsedMs']>().toEqualTypeOf<number | null>();
      expectTypeOf<TaskCard['persistent']>().toEqualTypeOf<boolean>();
      expectTypeOf<TaskCard['tool']>().toEqualTypeOf<ToolView | null>();
      expectTypeOf<ToolView['iconId']>().toEqualTypeOf<string | null>();
      expectTypeOf<GraphEdge>().toEqualTypeOf<ExpectedEdge>();
      expectTypeOf<GraphPackage>().toEqualTypeOf<ExpectedPackage>();
      expectTypeOf<Positions[string]>().toEqualTypeOf<ExpectedPosition>();
      expectTypeOf<GraphState['kind']>().toEqualTypeOf<'loading' | 'error' | 'graph'>();
      expectTypeOf<GraphReady['singlePackage']>().toEqualTypeOf<boolean>();
      expectTypeOf<GraphReady['rootLabel']>().toEqualTypeOf<string | null>();
      expectTypeOf<GraphReady['scopeShown']>().toEqualTypeOf<boolean>();
      expectTypeOf<GraphReady['scriptsShown']>().toEqualTypeOf<boolean>();
      expectTypeOf<GraphReady['predictionShown']>().toEqualTypeOf<boolean>();
      expectTypeOf<ManifestField>().toEqualTypeOf<ExpectedEntry['field']>();
      expectTypeOf<ManifestEntry>().toEqualTypeOf<ExpectedEntry>();
      expectTypeOf<ManifestContext>().toEqualTypeOf<ExpectedEntry['context']>();
      expectTypeOf<EdgeExplainResult>().toEqualTypeOf<ExpectedResult>();
      expectTypeOf<GraphEdgeExplainedMessage>().toEqualTypeOf<ExpectedExplainedMessage>();
      expectTypeOf<GraphStateMessage>().toEqualTypeOf<ExpectedStateMessage>();
      expectTypeOf<GraphTask>().toEqualTypeOf<ExpectedTask>();
      expectTypeOf<GraphRunState>().toEqualTypeOf<'running' | 'continuous' | 'passed' | 'failed' | 'stopped' | 'failed-to-start'>();
      expectTypeOf<GraphReady['tasks']>().toEqualTypeOf<GraphTask[]>();
      expectTypeOf<GraphReady['atomGroups']>().toEqualTypeOf<GraphAtomGroup[]>();
      expectTypeOf<GraphAtomGroup>().toEqualTypeOf<ExpectedAtomGroup>();
      expectTypeOf<GraphAtomFile>().toEqualTypeOf<ExpectedAtomFile>();
      expectTypeOf<GraphShowPackageMessage>().toEqualTypeOf<ExpectedShowPackageMessage>();
      expectTypeOf<GraphShowRequest>().toEqualTypeOf<GraphShowTasksMessage | GraphShowPackageMessage>();
      expectTypeOf<GraphHostMessage>().toEqualTypeOf<
        | ExpectedStateMessage
        | ExpectedExplainedMessage
        | GraphEdgeImportsMessage
        | GraphRunsMessage
        | GraphShowTasksMessage
        | ExpectedShowPackageMessage
        | GraphAtomsMessage
      >();
      expectTypeOf<GraphAtomOutcome>().toEqualTypeOf<'passed' | 'failed' | 'cached' | 'none'>();
      expectTypeOf<GraphAtomGroupState>().toEqualTypeOf<ExpectedAtomGroupState>();
      expectTypeOf<GraphAtomsMessage>().toEqualTypeOf<ExpectedAtomsMessage>();
      expectTypeOf<GraphPrediction>().toEqualTypeOf<'cached' | 'notCached' | 'unknown'>();
      expectTypeOf<GraphRunsMessage>().toEqualTypeOf<ExpectedRunsMessage>();
      expectTypeOf<GraphShownTaskPackagesMessage>().toEqualTypeOf<ExpectedShownTaskPackagesMessage>();
      expectTypeOf<GraphShownUmbrellasMessage>().toEqualTypeOf<ExpectedShownUmbrellasMessage>();
      expectTypeOf<GraphSetViewToggleMessage>().toEqualTypeOf<ExpectedSetViewToggleMessage>();
      expectTypeOf<GraphWebviewMessage['type']>().toEqualTypeOf<
        | 'ready'
        | 'reload'
        | 'openDetails'
        | 'positions'
        | 'layoutDone'
        | 'explainEdge'
        | 'openManifest'
        | 'scanImports'
        | 'openImport'
        | 'exportImage'
        | 'runTask'
        | 'stopTask'
        | 'shownUmbrellas'
        | 'shownTaskPackages'
        | 'setViewToggle'
      >();
      expectTypeOf<Extract<GraphWebviewMessage, RunTaskKey>['noCache']>().toEqualTypeOf<boolean>();
      expectTypeOf<Extract<GraphWebviewMessage, OpenManifestKey>['line']>().toEqualTypeOf<number>();
      expectTypeOf<Extract<GraphWebviewMessage, LayoutDoneKey>['engine']>().toEqualTypeOf<'elk' | 'fallback'>();
      expectTypeOf<Extract<GraphWebviewMessage, ExportImageKey>['png']>().toEqualTypeOf<string>();
      expectTypeOf<LayoutGrouping>().toEqualTypeOf<'flat' | 'folders'>();
      expectTypeOf<Extract<GraphWebviewMessage, PositionsKey>['grouping']>().toEqualTypeOf<LayoutGrouping>();
      expectTypeOf<GraphReady['folderPositions']>().toEqualTypeOf<Positions | null>();
      expectTypeOf<GraphReady['routes']>().toEqualTypeOf<Routes | null>();
      expectTypeOf<GraphReady['folderRoutes']>().toEqualTypeOf<Routes | null>();
      expectTypeOf<Extract<GraphWebviewMessage, PositionsKey>['routes']>().toEqualTypeOf<Routes>();
      expectTypeOf<Routes[string]>().toEqualTypeOf<ExpectedEdgeRoute>();
      expectTypeOf<GraphViewState['selected']>().toEqualTypeOf<string | null>();
      expectTypeOf<TaskViewState>().toEqualTypeOf<ExpectedTaskView>();
      expectTypeOf<GraphViewState['mode']>().toEqualTypeOf<'packages' | 'tasks'>();
      expectTypeOf<GraphViewState['task']>().toEqualTypeOf<TaskViewState | null>();
    });
  });
});
