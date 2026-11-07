import type { ImportSite } from '../../../src/bridge/common/graph-imports.type.ts';
import type { FoundImportsResult } from '../../common/graph-imports.type.ts';

const SITES_PER_FILE = 10;

const siteAt = (index: number): ImportSite => {
  const fileNumber = Math.floor(index / SITES_PER_FILE);
  const site: ImportSite = {
    file: `src/m${fileNumber}.ts`,
    line: index % SITES_PER_FILE,
    specifier: 'ui',
    text: `import { part${index} } from 'ui';`,
    kind: 'static',
    isType: false,
    via: 'name'
  };

  return site;
};

/** A found reply with `count` sites sent of `total` matched, ten sites per file in host order: site 21 is the first line of `src/m2.ts`. */
export const foundOf = (count: number, total: number): FoundImportsResult => {
  const sites = Array.from({ length: count }, (_, index): ImportSite => siteAt(index));
  const found: FoundImportsResult = { kind: 'found', scanned: 40, skipped: 0, total, sites, limit: null };

  return found;
};
