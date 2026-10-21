import type { ManifestField } from './graph-message.type.ts';

/** The `package.json` fields an edge is explained from, in the order their entries are listed. */
export const MANIFEST_FIELDS: ManifestField[] = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

/** The longest `key` or `spec` of a manifest entry before the host cuts it. */
export const ENTRY_TEXT_MAX = 200;

/** The most entries one explained edge carries. */
export const MANIFEST_ENTRIES_MAX = 8;

/** The highest 0-based `package.json` line the page and the host accept. */
export const MANIFEST_LINE_MAX = 1_000_000;

/** The highest `taskCount` the page accepts. */
export const TASK_COUNT_MAX = 100_000;
