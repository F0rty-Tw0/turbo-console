import type { ImportSite } from '../../../bridge/common/graph-imports.type.ts';
import type { ImportsState } from '../../common/imports-state.type.ts';
import { IMPORT_SITE_STUB } from '../stubs/graph-host-message.stub.ts';

type FoundState = Extract<ImportsState, Record<'kind', 'found'>>;

type NoneState = Extract<ImportsState, Record<'kind', 'none'>>;

/** `count` sites of `file`, one per 0-based line from 0, each spread from `IMPORT_SITE_STUB`. */
export const sitesOf = (count: number, file = 'src/a.ts'): ImportSite[] => {
  const siteAt = (line: number): ImportSite => {
    const site: ImportSite = { ...IMPORT_SITE_STUB, file, line };

    return site;
  };
  const lines = Array.from({ length: count }, (_blank, line): number => line);

  return lines.map(siteAt);
};

/** A fresh `found` state over `sites`, 3 files scanned and none skipped; `extra` overrides any field but `kind` and `sites`. */
export const foundOf = (sites: ImportSite[], extra: Partial<Omit<FoundState, 'kind' | 'sites'>> = {}): FoundState => {
  const state: FoundState = {
    kind: 'found',
    scanned: 3,
    skipped: 0,
    total: sites.length,
    sites,
    limit: null,
    isRefreshing: false,
    ...extra
  };

  return state;
};

/** A fresh `none` state, 3 files scanned and none skipped; `extra` overrides any field but `kind`. */
export const noneOf = (extra: Partial<Omit<NoneState, 'kind'>> = {}): NoneState => {
  const state: NoneState = { kind: 'none', scanned: 3, skipped: 0, limit: null, isRefreshing: false, ...extra };

  return state;
};
