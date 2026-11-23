import { describe, expectTypeOf, it } from 'vitest';

import type {
  GraphAtomsMessage,
  GraphEdgeImportsMessage,
  GraphHostMessage,
  GraphPackageModulesMessage,
  GraphRunsMessage,
  GraphShowModulesMessage,
  GraphShowPackageMessage,
  GraphShowRequest,
  GraphShowTasksMessage,
  GraphState,
  GraphWebviewMessage
} from './index.ts';

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

describe('FEATURE: webview-ui package entry, graph message unions', () => {
  describe('GIVEN the package entry point', () => {
    // eslint-disable-next-line vitest/expect-expect -- type-only pins: the `expectTypeOf` checks fail in typecheck, not at run time.
    it('WHEN the graph message unions are read THEN each one has exactly its members', () => {
      expectTypeOf<GraphShowRequest>().toEqualTypeOf<GraphShowTasksMessage | GraphShowPackageMessage | GraphShowModulesMessage>();
      expectTypeOf<GraphHostMessage>().toEqualTypeOf<
        | ExpectedStateMessage
        | ExpectedExplainedMessage
        | GraphEdgeImportsMessage
        | GraphRunsMessage
        | GraphShowTasksMessage
        | ExpectedShowPackageMessage
        | GraphAtomsMessage
        | GraphPackageModulesMessage
        | GraphShowModulesMessage
      >();
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
        | 'scanModules'
      >();
    });
  });
});
