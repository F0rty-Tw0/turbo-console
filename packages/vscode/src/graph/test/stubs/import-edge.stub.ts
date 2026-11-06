import type { ImportEdge } from '../../common/import-match.type.ts';
import { SOURCE_DIR, TARGET_DIR, TARGET_NAME } from '../common/import-edge.const.ts';

/** The edge A → B the answer specs ask about. */
export const IMPORT_EDGE_STUB: ImportEdge = {
  names: [TARGET_NAME],
  targetDir: TARGET_DIR,
  sourceDir: SOURCE_DIR
};
