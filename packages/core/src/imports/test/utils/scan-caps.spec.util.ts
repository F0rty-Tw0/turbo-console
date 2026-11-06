import { IMPORT_SCAN_CAPS } from '../../common/import-scan.const.ts';
import type { ImportScanCaps } from '../../common/import-scan.type.ts';

/** The D8 caps with `patch` over them. */
export const capsOf = (patch: Partial<ImportScanCaps>): ImportScanCaps => {
  const caps: ImportScanCaps = { ...IMPORT_SCAN_CAPS, ...patch };

  return caps;
};
