import type { ImportSite } from '../../../bridge/common/graph-imports.type.ts';
import { IMPORT_SITE_STUB } from '../stubs/graph-host-message.stub.ts';

/** `count` sites of `file`, one per 0-based line from 0, each spread from `IMPORT_SITE_STUB`. */
export const sitesOf = (count: number, file = 'src/a.ts'): ImportSite[] => {
  const siteAt = (line: number): ImportSite => {
    const site: ImportSite = { ...IMPORT_SITE_STUB, file, line };

    return site;
  };
  const lines = Array.from({ length: count }, (_blank, line): number => line);

  return lines.map(siteAt);
};
