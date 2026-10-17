import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  ICON_ID_PATTERN,
  TOOL_ICON_PREFIX,
  durationText,
  elapsedText,
  hiddenScriptsText,
  renderWebviewHtml,
  webviewCsp
  // eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '.' this rule asks for.
} from './index.ts';
import type {
  DetailsState,
  DryRunPhase,
  HostMessage,
  MissingPackage,
  OpenPackageJsonMessage,
  PackageDetails,
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

/** The host-facing API: the HTML renderer, CSP, duration formatters, hidden-scripts hint and the icon-id pattern and tool-icon prefix constants; everything else is wire-contract types. The webview-only bridge stays internal. */
const RUNTIME_EXPORTS = [
  'ICON_ID_PATTERN',
  'TOOL_ICON_PREFIX',
  'durationText',
  'elapsedText',
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
      expect(entry.ICON_ID_PATTERN).toBe(ICON_ID_PATTERN);
      expect(entry.TOOL_ICON_PREFIX).toBe(TOOL_ICON_PREFIX);
      expect(entry.durationText).toBe(durationText);
      expect(entry.elapsedText).toBe(elapsedText);
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
    });
  });
});
