import { join, resolve } from 'node:path';

export const IMPORT_ROOT = resolve('/ws');

/** A's dir in the edge stub: A and B are sibling packages under `IMPORT_ROOT`. */
export const SOURCE_DIR = join(IMPORT_ROOT, 'packages', 'a');

export const TARGET_DIR = join(IMPORT_ROOT, 'packages', 'b');

/** B's package name in the edge stub. */
export const TARGET_NAME = '@company/ui';
