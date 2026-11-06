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

const siteOf = (over: object = {}): object => {
  const site = {
    file: 'src/a.ts',
    line: 3,
    specifier: 'core',
    text: "import 'core';",
    kind: 'static',
    isType: false,
    via: 'name',
    ...over
  };

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

const ACCEPTED: [string, UnknownRecord][] = [
  ['a failed result', importsOf({ kind: 'failed' })],
  ['none, skipped 3 and no limit', importsOf(noneOf({ skipped: 3, limit: null }))],
  ['none, limit time', importsOf(noneOf({ limit: 'time' }))],
  ['found with one site', importsOf(foundOf())],
  ['found with 200 sites and a total of 250', importsOf(foundOf({ sites: sitesOf(IMPORT_SITES_MAX), total: 250 }))],
  ['a site on line 0', foundWithSite({ line: 0 })],
  ['a site on the highest line', foundWithSite({ line: MANIFEST_LINE_MAX })],
  ['a specifier and text of 201 characters', foundWithSite({ specifier: TEXT_MAX, text: TEXT_MAX })],
  ['a file of 1 024 characters', foundWithSite({ file: 'f'.repeat(MANIFEST_FILE_MAX) })],
  ['a type import', foundWithSite({ isType: true })],
  ['names like Object members', importsOf(noneOf(), { source: '__proto__', target: 'constructor' })]
];

const REJECTED: [string, UnknownRecord][] = [
  ['a numeric source', importsOf(noneOf(), { source: 1 })],
  ['no target', { type: 'edgeImports', source: 'web', result: noneOf() }],
  ['no result', { type: 'edgeImports', source: 'web', target: 'core' }],
  ['a null result', importsOf(null)],
  ['an unknown kind', importsOf({ kind: 'done' })],
  ['found with no sites', importsOf(foundOf({ sites: [], total: 0 }))],
  ['found with 201 sites', importsOf(foundOf({ sites: sitesOf(IMPORT_SITES_MAX + 1), total: 250 }))],
  ['a total below the sites sent', importsOf(foundOf({ sites: sitesOf(2), total: 1 }))],
  ['sites that are not an array', importsOf(foundOf({ sites: siteOf() }))],
  ['a null site', importsOf(foundOf({ sites: [null] }))],
  ['a scanned of -1', importsOf(foundOf({ scanned: -1 }))],
  ['a scanned of 1.5', importsOf(foundOf({ scanned: 1.5 }))],
  ['a string skipped', importsOf(foundOf({ skipped: '3' }))],
  ['a NaN total', importsOf(foundOf({ total: NaN }))],
  ['an unknown limit', importsOf(foundOf({ limit: 'disk' }))],
  ['no limit', importsOf(foundOf({ limit: undefined }))],
  ['none with a scanned of -1', importsOf(noneOf({ scanned: -1 }))],
  ['none with a string skipped', importsOf(noneOf({ skipped: '3' }))],
  ['none with an unknown limit', importsOf(noneOf({ limit: 'disk' }))],
  ['a site on line -1', foundWithSite({ line: -1 })],
  ['a site on line 1.5', foundWithSite({ line: 1.5 })],
  ['a site past the highest line', foundWithSite({ line: MANIFEST_LINE_MAX + 1 })],
  ['an empty file', foundWithSite({ file: '' })],
  ['a file of 1 025 characters', foundWithSite({ file: 'f'.repeat(MANIFEST_FILE_MAX + 1) })],
  ['a numeric file', foundWithSite({ file: 1 })],
  ['a specifier of 202 characters', foundWithSite({ specifier: OVER_TEXT })],
  ['a text of 202 characters', foundWithSite({ text: OVER_TEXT })],
  ['a kind outside the table', foundWithSite({ kind: 'import' })],
  ['a kind named like an Object member', foundWithSite({ kind: 'constructor' })],
  ['a via outside the table', foundWithSite({ via: 'path' })],
  ['a string isType', foundWithSite({ isType: 'yes' })]
];

describe('FEATURE: isEdgeImports', () => {
  describe('GIVEN a well-formed edgeImports record', () => {
    it.each(ACCEPTED)('WHEN it has %s THEN it is accepted', (_label, record) => {
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
    it.each(REJECTED)('WHEN it has %s THEN it is rejected', (_label, record) => {
      const isImports = isEdgeImports(record);

      expect(isImports).toBe(false);
    });
  });
});
