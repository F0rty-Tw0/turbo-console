import type { CachedFile, SourceImport } from '../../common/import-scan.type.ts';

export const SOURCE_IMPORT_STUB: SourceImport = {
  specifier: 'S',
  kind: 'static',
  isType: false,
  line: 0,
  text: ''
};

export const CACHED_FILE_STUB: CachedFile = { mtimeMs: 1, size: 1, imports: [SOURCE_IMPORT_STUB] };
