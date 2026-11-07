import type { ImportScanCaps } from './import-scan.type.ts';

export const SOURCE_SUFFIXES: string[] = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

export const DECLARATION_SUFFIXES: string[] = ['.d.ts', '.d.mts', '.d.cts'];

/** Skipped directly under A's dir only; deeper dirs of these names are walked (T3). */
export const TOP_BUILD_DIRS: ReadonlySet<string> = new Set(['dist', 'build', 'out', 'coverage', 'storybook-static']);

export const NODE_MODULES_DIR = 'node_modules';

/** Read errors that leave one subdir out of a walk (OQ4); any other code (EMFILE, EIO) fails the scan. */
export const UNREADABLE_DIR_CODES: ReadonlySet<string> = new Set(['EACCES', 'EPERM', 'ENOENT', 'ENOTDIR', 'ENAMETOOLONG']);

/** D8 caps per package scan; `fileBytes` matches `readSmallFile`'s default, which is not exported. */
export const IMPORT_SCAN_CAPS: ImportScanCaps = { files: 5000, entries: 50_000, timeMs: 4000, fileBytes: 1024 * 1024, reads: 8 };

/** D9: entries across every dir's map before a swap clears them all. */
export const IMPORT_CACHE_MAX = 20_000;

export const TSCONFIG_NAME = 'tsconfig.json';

/** D6: candidate lists one chain read pops, A's own included, each opening at most one file (OQ1). */
export const TSCONFIG_CHAIN_MAX = 8;
