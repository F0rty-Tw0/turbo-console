import type { PackageImportScan } from '@turbo-console/core';
import type { GraphPackage } from '@turbo-console/webview-ui';

/** One edge A → B as the matcher sees it: `names` = B's name, then A's `package.json` keys that alias B (raw, not cut); `targetDir` = B's absolute dir, `null` when B is the root package (D5: relative and alias rules skipped); `sourceDir` = A's absolute dir. */
export type ImportEdge = {
  readonly names: string[];
  readonly targetDir: string | null;
  readonly sourceDir: string;
};

/** The dirs one scan of A for edge A → B needs: A's, B's (`null` for the root package, D5) and the package dirs the walk of A never enters (D7). */
export type ScanDirs = {
  readonly sourceDir: string;
  readonly targetDir: string | null;
  readonly skipDirs: ReadonlySet<string>;
};

type ScannedOutcome = { readonly kind: 'scan'; readonly scan: PackageImportScan };

type FailedOutcome = { readonly kind: 'failed' };

type AbortedOutcome = { readonly kind: 'aborted' };

export type AnsweredOutcome = ScannedOutcome | FailedOutcome;

export type ScanOutcome = AnsweredOutcome | AbortedOutcome;

/**
 * One scan of `dir`; `asked` holds the key of each ask this run answers: `JSON.stringify([source, target])` for an edge,
 * `JSON.stringify([packageName])` for a package's modules, so the two never collide.
 */
export type ScanRun = {
  readonly dir: string;
  readonly controller: AbortController;
  readonly outcome: Promise<ScanOutcome>;
  readonly asked: Set<string>;
};

/** What a modules answer needs besides the scan: the workspace root, the scanned package's name and absolute dir, every listed package and its `package.json` text (`null` when unreadable). */
export type ModulesContext = {
  readonly root: string;
  readonly packageName: string;
  readonly dir: string;
  readonly packages: GraphPackage[];
  readonly manifestText: string | null;
};
