import { describe, expect, expectTypeOf, it } from 'vitest';

import { MODULE_FILES_MAX, MODULE_LINKS_MAX, MODULE_STUB_NAME_MAX } from './index.ts';
import type {
  GraphHostMessage,
  GraphPackageModulesMessage,
  GraphShowRequest,
  GraphWebviewMessage,
  ModuleEnd,
  ModuleLink,
  ModuleSitesResult,
  ModulesResult
} from './index.ts';

type ExpectedFileEnd = { readonly kind: 'file'; readonly path: string };

type ExpectedDirEnd = { readonly kind: 'dir'; readonly path: string };

type ExpectedStubEnd = { readonly kind: 'stub'; readonly name: string };

type ExpectedEnd = ExpectedFileEnd | ExpectedDirEnd | ExpectedStubEnd;

type ExpectedTarget = ExpectedFileEnd | ExpectedStubEnd;

type ExpectedSite = {
  readonly file: string;
  readonly line: number;
  readonly text: string;
  readonly kind: 'static' | 'dynamic' | 'require' | 'reexport';
  readonly isType: boolean;
  readonly target: ExpectedTarget;
};

type ExpectedSitesFound = {
  readonly kind: 'found';
  readonly imports: ExpectedSite[];
  readonly importsTotal: number;
  readonly importedBy: ExpectedSite[];
  readonly importedByTotal: number;
  readonly limit: 'files' | 'entries' | 'time' | null;
};

type ModuleSitesKey = { readonly type: 'moduleSites' };

type ScanModuleSitesKey = { readonly type: 'scanModuleSites' };

type ExpectedModuleSites = {
  readonly type: 'moduleSites';
  readonly packageName: string;
  readonly from: ExpectedEnd;
  readonly to: ExpectedEnd | null;
  readonly result: ExpectedSitesFound | ExpectedFailed;
};

type ExpectedScanModuleSites = {
  readonly type: 'scanModuleSites';
  readonly packageName: string;
  readonly from: ExpectedEnd;
  readonly to: ExpectedEnd | null;
};

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

    // eslint-disable-next-line vitest/expect-expect -- type-only pins: the `expectTypeOf` checks fail in typecheck, not at run time.
    it('WHEN the module sites contract is read THEN each module sites type has its exact shape', () => {
      expectTypeOf<ModuleEnd>().toEqualTypeOf<ExpectedEnd>();
      expectTypeOf<ModuleSitesResult>().toEqualTypeOf<ExpectedSitesFound | ExpectedFailed>();
      expectTypeOf<Extract<GraphHostMessage, ModuleSitesKey>>().toEqualTypeOf<ExpectedModuleSites>();
      expectTypeOf<Extract<GraphWebviewMessage, ScanModuleSitesKey>>().toEqualTypeOf<ExpectedScanModuleSites>();
    });
  });
});
