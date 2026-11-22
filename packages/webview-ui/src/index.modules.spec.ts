import { describe, expect, expectTypeOf, it } from 'vitest';

import { MODULE_FILES_MAX, MODULE_LINKS_MAX, MODULE_STUB_NAME_MAX } from './index.ts';
import type {
  GraphHostMessage,
  GraphPackageModulesMessage,
  GraphShowRequest,
  GraphWebviewMessage,
  ModuleLink,
  ModulesResult
} from './index.ts';

type ExpectedCounts = {
  readonly unresolved: number;
  readonly external: number;
  readonly assets: number;
  readonly self: number;
};

type ExpectedLink = readonly [number, number, number, number, number];

type ExpectedFound = {
  readonly kind: 'found';
  readonly files: string[];
  readonly tests: number[];
  readonly stubs: string[];
  readonly fileLinks: ExpectedLink[];
  readonly stubLinks: ExpectedLink[];
  readonly counts: ExpectedCounts;
  readonly scanned: number;
  readonly skipped: number;
  readonly limit: 'files' | 'entries' | 'time' | null;
  readonly dropped: number;
};

type ExpectedFailed = { readonly kind: 'failed' };

type ExpectedPackageModules = {
  readonly type: 'packageModules';
  readonly packageName: string;
  readonly result: ExpectedFound | ExpectedFailed;
};

type ScanModulesKey = { readonly type: 'scanModules' };

type ShowModulesKey = { readonly type: 'showModules' };

type ExpectedScanModules = { readonly type: 'scanModules'; readonly packageName: string };

type ExpectedShowModules = { readonly type: 'showModules'; readonly name: string };

describe('FEATURE: webview-ui package entry, modules contract', () => {
  describe('GIVEN the package entry point', () => {
    it('WHEN the modules contract is read THEN the three caps hold and each modules type has its exact shape', () => {
      expect(MODULE_FILES_MAX).toBe(5000);
      expect(MODULE_LINKS_MAX).toBe(50_000);
      expect(MODULE_STUB_NAME_MAX).toBe(214);
      expectTypeOf<ModuleLink>().toEqualTypeOf<ExpectedLink>();
      expectTypeOf<ModulesResult>().toEqualTypeOf<ExpectedFound | ExpectedFailed>();
      expectTypeOf<GraphPackageModulesMessage>().toEqualTypeOf<ExpectedPackageModules>();
      expectTypeOf<Extract<GraphWebviewMessage, ScanModulesKey>>().toEqualTypeOf<ExpectedScanModules>();
      expectTypeOf<Extract<GraphShowRequest, ShowModulesKey>>().toEqualTypeOf<ExpectedShowModules>();
      expectTypeOf<Extract<GraphHostMessage, ShowModulesKey>>().toEqualTypeOf<ExpectedShowModules>();
    });
  });
});
