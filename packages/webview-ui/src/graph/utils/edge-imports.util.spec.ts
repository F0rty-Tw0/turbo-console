import { describe, expect, it } from 'vitest';

import { isEdgeImports } from './edge-imports.util.ts';
import type { UnknownRecord } from '../../bridge/common/bridge.type.ts';
import {
  ENTRY_TEXT_MAX,
  IMPORT_KINDS,
  IMPORT_LIMITS,
  IMPORT_SITES_MAX,
  IMPORT_VIAS,
  MANIFEST_FILE_MAX,
  MANIFEST_LINE_MAX
} from '../../bridge/common/graph-message.const.ts';
import { IMPORT_SITE_STUB } from '../test/stubs/graph-host-message.stub.ts';

const siteOf = (over: object = {}): object => {
  const site = { ...IMPORT_SITE_STUB, ...over };

  return site;
};

const foundOf = (over: object = {}): object => {
  const result = { kind: 'found', scanned: 4, skipped: 0, total: 1, limit: null, sites: [siteOf()], ...over };

  return result;
};

const noneOf = (over: object = {}): object => {
  const result = { kind: 'none', scanned: 4, skipped: 0, limit: null, ...over };

  return result;
};

const importsOf = (result: unknown, over: object = {}): UnknownRecord => {
  const message = { type: 'edgeImports', source: 'web', target: 'core', result, ...over };

  return message;
};

const sitesOf = (count: number): object[] => Array.from({ length: count }, (): object => siteOf());

const foundWithSite = (over: object): UnknownRecord => importsOf(foundOf({ sites: [siteOf(over)] }));

const TEXT_MAX = 'c'.repeat(ENTRY_TEXT_MAX + 1);

const OVER_TEXT = 'c'.repeat(ENTRY_TEXT_MAX + 2);

const NO_TARGET = { type: 'edgeImports', source: 'web', result: noneOf() };

const NO_RESULT = { type: 'edgeImports', source: 'web', target: 'core' };

const ARRAY_LIKE_SITES = { length: 1, 0: siteOf() };

const ACCEPTED = [
  { label: 'a failed result', record: importsOf({ kind: 'failed' }) },
  { label: 'none, skipped 3 and no limit', record: importsOf(noneOf({ skipped: 3, limit: null })) },
  { label: 'none, limit time', record: importsOf(noneOf({ limit: 'time' })) },
  { label: 'found with one site', record: importsOf(foundOf()) },
  { label: 'found with 200 sites and a total of 250', record: importsOf(foundOf({ sites: sitesOf(IMPORT_SITES_MAX), total: 250 })) },
  { label: 'a site on line 0', record: foundWithSite({ line: 0 }) },
  { label: 'a site on the highest line', record: foundWithSite({ line: MANIFEST_LINE_MAX }) },
  { label: 'a specifier and text of 201 characters', record: foundWithSite({ specifier: TEXT_MAX, text: TEXT_MAX }) },
  { label: 'a file of 1 024 characters', record: foundWithSite({ file: 'f'.repeat(MANIFEST_FILE_MAX) }) },
  { label: 'a type import', record: foundWithSite({ isType: true }) },
  { label: 'names like Object members', record: importsOf(noneOf(), { source: '__proto__', target: 'constructor' }) }
];

const REJECTED = [
  { label: 'a numeric source', record: importsOf(noneOf(), { source: 1 }) },
  { label: 'no target', record: NO_TARGET },
  { label: 'no result', record: NO_RESULT },
  { label: 'a null result', record: importsOf(null) },
  { label: 'an unknown kind', record: importsOf({ kind: 'done' }) },
  { label: 'found with no sites', record: importsOf(foundOf({ sites: [], total: 0 })) },
  { label: 'found with 201 sites', record: importsOf(foundOf({ sites: sitesOf(IMPORT_SITES_MAX + 1), total: 250 })) },
  { label: 'a total below the sites sent', record: importsOf(foundOf({ sites: sitesOf(2), total: 1 })) },
  { label: 'sites that are not an array', record: importsOf(foundOf({ sites: siteOf() })) },
  { label: 'array-like sites', record: importsOf(foundOf({ sites: ARRAY_LIKE_SITES })) },
  { label: 'a null site', record: importsOf(foundOf({ sites: [null] })) },
  { label: 'a sparse sites array of length 1', record: importsOf(foundOf({ sites: new Array(1), total: 1 })) },
  { label: 'a scanned of -1', record: importsOf(foundOf({ scanned: -1 })) },
  { label: 'a scanned of 1.5', record: importsOf(foundOf({ scanned: 1.5 })) },
  { label: 'an Infinity scanned', record: importsOf(foundOf({ scanned: Infinity })) },
  { label: 'a scanned of 2 ** 53', record: importsOf(foundOf({ scanned: 2 ** 53 })) },
  { label: 'a string skipped', record: importsOf(foundOf({ skipped: '3' })) },
  { label: 'a NaN total', record: importsOf(foundOf({ total: NaN })) },
  { label: 'an unknown limit', record: importsOf(foundOf({ limit: 'disk' })) },
  { label: 'a limit named like an Object member', record: importsOf(foundOf({ limit: '__proto__' })) },
  { label: 'no limit', record: importsOf(foundOf({ limit: undefined })) },
  { label: 'none with a scanned of -1', record: importsOf(noneOf({ scanned: -1 })) },
  { label: 'none with a string skipped', record: importsOf(noneOf({ skipped: '3' })) },
  { label: 'none with an unknown limit', record: importsOf(noneOf({ limit: 'disk' })) },
  { label: 'a site on line -1', record: foundWithSite({ line: -1 }) },
  { label: 'a site on line 1.5', record: foundWithSite({ line: 1.5 }) },
  { label: 'a site past the highest line', record: foundWithSite({ line: MANIFEST_LINE_MAX + 1 }) },
  { label: 'an empty file', record: foundWithSite({ file: '' }) },
  { label: 'a file of 1 025 characters', record: foundWithSite({ file: 'f'.repeat(MANIFEST_FILE_MAX + 1) }) },
  { label: 'a numeric file', record: foundWithSite({ file: 1 }) },
  { label: 'a specifier of 202 characters', record: foundWithSite({ specifier: OVER_TEXT }) },
  { label: 'a text of 202 characters', record: foundWithSite({ text: OVER_TEXT }) },
  { label: 'a kind outside the table', record: foundWithSite({ kind: 'import' }) },
  { label: 'a kind named like an Object member', record: foundWithSite({ kind: 'constructor' }) },
  { label: 'a via outside the table', record: foundWithSite({ via: 'path' }) },
  { label: 'a via named like an Object member', record: foundWithSite({ via: 'toString' }) },
  { label: 'a string isType', record: foundWithSite({ isType: 'yes' }) }
];

describe('FEATURE: isEdgeImports', () => {
  describe('GIVEN a well-formed edgeImports record', () => {
    it.each(ACCEPTED)('WHEN it has $label THEN it is accepted', ({ record }) => {
      const isImports = isEdgeImports(record);

      expect(isImports).toBe(true);
    });

    it.each(Object.keys(IMPORT_KINDS))('WHEN a site has the kind %s THEN it is accepted', (kind) => {
      const isImports = isEdgeImports(foundWithSite({ kind }));

      expect(isImports).toBe(true);
    });

    it.each(Object.keys(IMPORT_VIAS))('WHEN a site has the via %s THEN it is accepted', (via) => {
      const isImports = isEdgeImports(foundWithSite({ via }));

      expect(isImports).toBe(true);
    });

    it.each(Object.keys(IMPORT_LIMITS))('WHEN it has the limit %s THEN it is accepted', (limit) => {
      const isImports = isEdgeImports(importsOf(noneOf({ limit })));

      expect(isImports).toBe(true);
    });
  });

  describe('GIVEN a malformed edgeImports record', () => {
    it.each(REJECTED)('WHEN it has $label THEN it is rejected', ({ record }) => {
      const isImports = isEdgeImports(record);

      expect(isImports).toBe(false);
    });
  });
});
