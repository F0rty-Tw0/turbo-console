import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  ICON_ID_PATTERN,
  TOOL_ICON_PREFIX,
  durationText,
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
  GraphEdge,
  GraphEdgeExplainedMessage,
  GraphHostMessage,
  GraphPackage,
  GraphState,
  GraphStateMessage,
  GraphViewState,
  GraphWebviewMessage,
  HostMessage,
  ManifestEntry,
  ManifestField,
  MissingPackage,
  OpenPackageJsonMessage,
  PackageDetails,
  Positions,
  ReadyMessage,
  RefreshMessage,
  RunStateMessage,
  RunView,
  ShowOutputMessage,
  StateMessage,
  TaskCard,
  TaskMessage,
  ToolView,
  WebviewMessage,
  WebviewSlots
  // eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '.' this rule asks for.
} from './index.ts';

type ExpectedEdge = { readonly source: string; readonly target: string };
type ExpectedPackage = { readonly name: string; readonly path: string; readonly tags: string[]; readonly taskCount: number };
type ExpectedPosition = { readonly x: number; readonly y: number };
type ExpectedStateMessage = { readonly type: 'state'; readonly state: GraphState };
type ExpectedEntry = {
  readonly field: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';
  readonly key: string;
  readonly spec: string;
  readonly line: number;
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

/** The host-facing API: the HTML renderer, CSP, duration formatters, hidden-scripts hint and the icon-id pattern and tool-icon prefix constants; everything else is wire-contract types. The webview-only bridge stays internal. */
const RUNTIME_EXPORTS = [
  'ENTRY_TEXT_MAX',
  'ICON_ID_PATTERN',
  'MANIFEST_ENTRIES_MAX',
  'MANIFEST_FIELDS',
  'MANIFEST_LINE_MAX',
  'TASK_COUNT_MAX',
  'TOOL_ICON_PREFIX',
  'durationText',
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
      expect(entry.MANIFEST_LINE_MAX).toBe(1_000_000);
      expect(entry.TASK_COUNT_MAX).toBe(100_000);
      expect(entry.MANIFEST_FIELDS).toStrictEqual(['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']);
      expect(entry.ICON_ID_PATTERN).toBe(ICON_ID_PATTERN);
      expect(entry.TOOL_ICON_PREFIX).toBe(TOOL_ICON_PREFIX);
      expect(entry.durationText).toBe(durationText);
      expect(entry.elapsedText).toBe(elapsedText);
      expect(entry.graphCsp).toBe(graphCsp);
      expect(entry.hiddenScriptsText).toBe(hiddenScriptsText);
      expect(entry.renderWebviewHtml).toBe(renderWebviewHtml);
      expect(entry.webviewCsp).toBe(webviewCsp);
      expectTypeOf<WebviewSlots>().toEqualTypeOf<Readonly<Record<string, string>>>();
      expectTypeOf<WebviewMessage>().toEqualTypeOf<
        ReadyMessage | TaskMessage | OpenPackageJsonMessage | RefreshMessage | ShowOutputMessage
      >();
      expectTypeOf<HostMessage>().toEqualTypeOf<StateMessage | RunStateMessage>();
      expectTypeOf<TaskMessage['type']>().toEqualTypeOf<'run' | 'stop' | 'copy'>();
      expectTypeOf<RefreshMessage['scope']>().toEqualTypeOf<'dryRun' | 'root'>();
      expectTypeOf<StateMessage['state']>().toEqualTypeOf<DetailsState>();
      expectTypeOf<RunStateMessage['run']>().toEqualTypeOf<RunView>();
      expectTypeOf<DetailsState>().toEqualTypeOf<PackageDetails | MissingPackage>();
      expectTypeOf<DryRunPhase>().toEqualTypeOf<'loading' | 'ready' | 'failed'>();
      expectTypeOf<PackageDetails['tasks']>().toEqualTypeOf<TaskCard[]>();
      expectTypeOf<TaskCard['cacheStatus']>().toEqualTypeOf<'HIT' | 'MISS' | 'deferred' | null>();
      expectTypeOf<RunView['colorVar']>().toEqualTypeOf<string | null>();
      expectTypeOf<RunView['elapsedMs']>().toEqualTypeOf<number | null>();
      expectTypeOf<TaskCard['persistent']>().toEqualTypeOf<boolean>();
      expectTypeOf<TaskCard['tool']>().toEqualTypeOf<ToolView | null>();
      expectTypeOf<ToolView['iconId']>().toEqualTypeOf<string | null>();
      expectTypeOf<GraphEdge>().toEqualTypeOf<ExpectedEdge>();
      expectTypeOf<GraphPackage>().toEqualTypeOf<ExpectedPackage>();
      expectTypeOf<Positions[string]>().toEqualTypeOf<ExpectedPosition>();
      expectTypeOf<GraphState['kind']>().toEqualTypeOf<'loading' | 'error' | 'singlePackage' | 'graph'>();
      expectTypeOf<ManifestField>().toEqualTypeOf<ExpectedEntry['field']>();
      expectTypeOf<ManifestEntry>().toEqualTypeOf<ExpectedEntry>();
      expectTypeOf<EdgeExplainResult>().toEqualTypeOf<ExpectedResult>();
      expectTypeOf<GraphEdgeExplainedMessage>().toEqualTypeOf<ExpectedExplainedMessage>();
      expectTypeOf<GraphStateMessage>().toEqualTypeOf<ExpectedStateMessage>();
      expectTypeOf<GraphHostMessage>().toEqualTypeOf<ExpectedStateMessage | ExpectedExplainedMessage>();
      expectTypeOf<GraphWebviewMessage['type']>().toEqualTypeOf<
        'ready' | 'reload' | 'openDetails' | 'positions' | 'layoutDone' | 'explainEdge' | 'openManifest'
      >();
      expectTypeOf<Extract<GraphWebviewMessage, OpenManifestKey>['line']>().toEqualTypeOf<number>();
      expectTypeOf<Extract<GraphWebviewMessage, LayoutDoneKey>['engine']>().toEqualTypeOf<'elk' | 'fallback'>();
      expectTypeOf<GraphViewState['selected']>().toEqualTypeOf<string | null>();
    });
  });
});
