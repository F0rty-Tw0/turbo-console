import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  IMPORT_SITES_MAX
  // eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '.' this rule asks for.
} from './index.ts';
import type {
  EdgeImportsResult,
  GraphEdgeImportsMessage,
  GraphWebviewMessage,
  ImportKind,
  ImportLimit,
  ImportSite,
  ImportVia
  // eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '.' this rule asks for.
} from './index.ts';

type ExpectedSite = {
  readonly file: string;
  readonly line: number;
  readonly specifier: string;
  readonly text: string;
  readonly kind: 'static' | 'reexport' | 'dynamic' | 'require';
  readonly isType: boolean;
  readonly via: 'name' | 'relative' | 'alias';
};

type ExpectedFound = {
  readonly kind: 'found';
  readonly scanned: number;
  readonly skipped: number;
  readonly total: number;
  readonly sites: ExpectedSite[];
  readonly limit: 'files' | 'entries' | 'time' | null;
};

type ExpectedNone = {
  readonly kind: 'none';
  readonly scanned: number;
  readonly skipped: number;
  readonly limit: 'files' | 'entries' | 'time' | null;
};

type ExpectedFailed = { readonly kind: 'failed' };

type ExpectedResult = ExpectedFound | ExpectedNone | ExpectedFailed;

type ExpectedMessage = {
  readonly type: 'edgeImports';
  readonly source: string;
  readonly target: string;
  readonly result: ExpectedResult;
};

type ScanImportsKey = { readonly type: 'scanImports' };

type OpenImportKey = { readonly type: 'openImport' };

type ExpectedScanImportsMessage = {
  readonly type: 'scanImports';
  readonly source: string;
  readonly target: string;
};

type ExpectedOpenImportMessage = {
  readonly type: 'openImport';
  readonly packageName: string;
  readonly file: string;
  readonly line: number;
};

describe('FEATURE: webview-ui package entry, import contract', () => {
  describe('GIVEN the package entry point', () => {
    it('WHEN the import contract is read THEN IMPORT_SITES_MAX is 200 and each import type has its exact shape', () => {
      expect(IMPORT_SITES_MAX).toBe(200);
      expectTypeOf<ImportKind>().toEqualTypeOf<'static' | 'reexport' | 'dynamic' | 'require'>();
      expectTypeOf<ImportVia>().toEqualTypeOf<'name' | 'relative' | 'alias'>();
      expectTypeOf<ImportLimit>().toEqualTypeOf<'files' | 'entries' | 'time'>();
      expectTypeOf<ImportSite>().toEqualTypeOf<ExpectedSite>();
      expectTypeOf<EdgeImportsResult>().toEqualTypeOf<ExpectedResult>();
      expectTypeOf<GraphEdgeImportsMessage>().toEqualTypeOf<ExpectedMessage>();
      expectTypeOf<Extract<GraphWebviewMessage, ScanImportsKey>>().toEqualTypeOf<ExpectedScanImportsMessage>();
      expectTypeOf<Extract<GraphWebviewMessage, OpenImportKey>>().toEqualTypeOf<ExpectedOpenImportMessage>();
    });
  });
});
