import type { CachedFile, ImportScanCaps, ImportScanLimit } from './import-scan.type.ts';

/** One scan's resolved input, shared by the walk and the read workers. */
export type ImportScanRun = {
  readonly dir: string;
  readonly skipDirs: ReadonlySet<string>;
  readonly caps: ImportScanCaps;
  readonly signal: AbortSignal;
  readonly isOverTime: () => boolean;
};

/** `file` posix relative to the scanned dir, the cache key; `path` absolute, OS separators. */
export type WalkedFile = {
  readonly file: string;
  readonly path: string;
};

export type ImportWalk = {
  readonly files: WalkedFile[];
  readonly limit: ImportScanLimit | null;
};

type ScannedOutcome = { readonly kind: 'scanned'; readonly cached: CachedFile };

type SkippedOutcome = { readonly kind: 'skipped' };

type UnreachedOutcome = { readonly kind: 'unreached' };

/** What one walked file came to: lexed (fresh or from the cache), skipped, or never reached before a stop. */
export type FileOutcome = ScannedOutcome | SkippedOutcome | UnreachedOutcome;
