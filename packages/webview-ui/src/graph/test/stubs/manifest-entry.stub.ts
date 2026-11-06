import type { ManifestEntry } from '../../../bridge/common/graph-message.type.ts';

/** `web`'s `ui` entry in `dependencies`, with no context lines around it. */
export const MANIFEST_ENTRY_STUB: ManifestEntry = { field: 'dependencies', key: 'ui', spec: '^1.0.0', line: 9, context: {} };

/** The manifest file `MANIFEST_ENTRY_STUB` sits in. */
export const MANIFEST_FILE_STUB: string = 'apps/web/package.json';
