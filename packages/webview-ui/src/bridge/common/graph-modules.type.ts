import type { ImportLimit } from './graph-imports.type.ts';

/** One link between two modules: indexes into `files` (and, for a stub link, `to` into `stubs`), then its static, type-only and lazy import counts. */
export type ModuleLink = readonly [from: number, to: number, statics: number, types: number, lazies: number];

/** Imports the scan did not draw as a link: unresolved specifiers, external (npm) packages, asset files and the package's own name. */
export type ModuleCounts = {
  readonly unresolved: number;
  readonly external: number;
  readonly assets: number;
  readonly self: number;
};

/**
 * One package's modules: `files` are posix paths relative to its dir, `tests` the ascending indexes of test files in them, `stubs`
 * the other workspace packages its files import, sorted by name. `dropped` counts the files, stubs and links the host left out to
 * fit the caps.
 */
export type ModulesFound = {
  readonly kind: 'found';
  readonly files: string[];
  readonly tests: number[];
  readonly stubs: string[];
  readonly fileLinks: ModuleLink[];
  readonly stubLinks: ModuleLink[];
  readonly counts: ModuleCounts;
  readonly scanned: number;
  readonly skipped: number;
  readonly limit: ImportLimit | null;
  readonly dropped: number;
};

type ModulesFailed = { readonly kind: 'failed' };

/** What the host found when it scanned one package's source files for its modules. */
export type ModulesResult = ModulesFound | ModulesFailed;

/** The host's answer to a `scanModules` ask. */
export type GraphPackageModulesMessage = {
  readonly type: 'packageModules';
  readonly packageName: string;
  readonly result: ModulesResult;
};

/** The page asking the host to scan one package's source files for its modules. */
export type GraphScanModulesMessage = {
  readonly type: 'scanModules';
  readonly packageName: string;
};

/** Asks the page to show this package's modules. */
export type GraphShowModulesMessage = {
  readonly type: 'showModules';
  readonly name: string;
};
