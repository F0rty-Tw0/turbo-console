import { describe, expect, it } from 'vitest';

import { isModuleSitesMessage } from './module-sites.util.ts';
import type { UnknownRecord } from '../../bridge/common/bridge.type.ts';
import {
  ENTRY_TEXT_MAX,
  IMPORT_SITES_MAX,
  MANIFEST_FILE_MAX,
  MANIFEST_LINE_MAX,
  MODULE_STUB_NAME_MAX
} from '../../bridge/common/graph-message.const.ts';
import { MODULE_SITES_FOUND_STUB } from '../test/stubs/graph-host-message.stub.ts';

const FROM_FILE = { kind: 'file', path: 'src/a.ts' };

const messageOf = (over: object): UnknownRecord => {
  const message = { type: 'moduleSites', packageName: 'web', from: FROM_FILE, to: null, result: MODULE_SITES_FOUND_STUB, ...over };

  return message;
};

const foundWith = (over: object): UnknownRecord => {
  const result = { ...MODULE_SITES_FOUND_STUB, ...over };

  return messageOf({ result });
};

const siteWith = (over: object): UnknownRecord => {
  const site = { ...MODULE_SITES_FOUND_STUB.imports[0], ...over };

  return foundWith({ imports: [site] });
};

const sitesOf = (count: number): unknown[] => Array.from({ length: count }, (): unknown => MODULE_SITES_FOUND_STUB.imports[0]);

const NO_FROM = { type: 'moduleSites', packageName: 'web', to: null, result: MODULE_SITES_FOUND_STUB };

const NO_TO = { type: 'moduleSites', packageName: 'web', from: FROM_FILE, result: MODULE_SITES_FOUND_STUB };

const NO_RESULT = { type: 'moduleSites', packageName: 'web', from: FROM_FILE, to: null };

const NO_TARGET_SITE = { file: 'src/a.ts', line: 3, text: "import './b.ts';", kind: 'static', isType: false };

const EMPTY_LISTS = { imports: [], importsTotal: 0, importedBy: [], importedByTotal: 0 };

const LONG_TARGET = { kind: 'file', path: 'f'.repeat(MANIFEST_FILE_MAX) };

const OVER_TARGET = { kind: 'file', path: 'f'.repeat(MANIFEST_FILE_MAX + 1) };

const OVER_STUB_TARGET = { kind: 'stub', name: 's'.repeat(MODULE_STUB_NAME_MAX + 1) };

const FAILED = { kind: 'failed' };

const NONE = { kind: 'none' };

const EMPTY_FOUND = { ...MODULE_SITES_FOUND_STUB, ...EMPTY_LISTS };

const TO_DIR = { kind: 'dir', path: 'src/lib' };

const FROM_STUB = { kind: 'stub', name: '@s/core' };

const FROM_FOLDER = { kind: 'folder', path: 'src' };

const FROM_EMPTY_DIR = { kind: 'dir', path: '' };

const TO_NAMELESS_STUB = { kind: 'stub' };

const DIR_TARGET = { kind: 'dir', path: 'src' };

const EMPTY_FILE_TARGET = { kind: 'file', path: '' };

const EMPTY_STUB_TARGET = { kind: 'stub', name: '' };

const ACCEPTED = [
  { label: 'a found result', record: messageOf({}) },
  { label: 'a failed result', record: messageOf({ result: FAILED }) },
  { label: 'a link to a dir with empty lists', record: messageOf({ to: TO_DIR, result: EMPTY_FOUND }) },
  { label: 'from a stub', record: messageOf({ from: FROM_STUB }) },
  { label: 'found with limit time', record: foundWith({ limit: 'time' }) },
  {
    label: `found with ${IMPORT_SITES_MAX} imports`,
    record: foundWith({ imports: sitesOf(IMPORT_SITES_MAX), importsTotal: 500 })
  },
  { label: `a site text of ${ENTRY_TEXT_MAX + 1} chars`, record: siteWith({ text: 't'.repeat(ENTRY_TEXT_MAX + 1) }) },
  { label: `a target path of ${MANIFEST_FILE_MAX} chars`, record: siteWith({ target: LONG_TARGET }) },
  { label: `a site line of ${MANIFEST_LINE_MAX}`, record: siteWith({ line: MANIFEST_LINE_MAX }) }
];

const REJECTED = [
  { label: 'a numeric packageName', record: messageOf({ packageName: 7 }) },
  { label: 'a message with no from', record: NO_FROM },
  { label: 'from kind folder', record: messageOf({ from: FROM_FOLDER }) },
  { label: 'from an empty dir path', record: messageOf({ from: FROM_EMPTY_DIR }) },
  { label: 'a message with no to', record: NO_TO },
  { label: 'to a stub with no name', record: messageOf({ to: TO_NAMELESS_STUB }) },
  { label: 'a message with no result', record: NO_RESULT },
  { label: 'result kind none', record: messageOf({ result: NONE }) },
  { label: 'imports that are not an array', record: foundWith({ imports: {} }) },
  {
    label: `found with ${IMPORT_SITES_MAX + 1} imports`,
    record: foundWith({ imports: sitesOf(IMPORT_SITES_MAX + 1), importsTotal: 500 })
  },
  { label: 'importsTotal below its list length', record: foundWith({ importsTotal: 0 }) },
  { label: 'a fractional importsTotal', record: foundWith({ importsTotal: 1.5 }) },
  { label: 'a negative importedByTotal', record: foundWith({ importedByTotal: -1 }) },
  { label: 'limit disk', record: foundWith({ limit: 'disk' }) },
  { label: 'a site with an empty file', record: siteWith({ file: '' }) },
  { label: 'a site line of -1', record: siteWith({ line: -1 }) },
  { label: `a site line of ${MANIFEST_LINE_MAX + 1}`, record: siteWith({ line: MANIFEST_LINE_MAX + 1 }) },
  { label: `a site text of ${ENTRY_TEXT_MAX + 2} chars`, record: siteWith({ text: 't'.repeat(ENTRY_TEXT_MAX + 2) }) },
  { label: 'a site kind import', record: siteWith({ kind: 'import' }) },
  { label: 'a site isType no', record: siteWith({ isType: 'no' }) },
  { label: 'a site with no target', record: foundWith({ imports: [NO_TARGET_SITE] }) },
  { label: 'a site targeting a dir', record: siteWith({ target: DIR_TARGET }) },
  { label: 'a site targeting an empty file path', record: siteWith({ target: EMPTY_FILE_TARGET }) },
  { label: `a target path of ${MANIFEST_FILE_MAX + 1} chars`, record: siteWith({ target: OVER_TARGET }) },
  { label: 'a site targeting an empty stub name', record: siteWith({ target: EMPTY_STUB_TARGET }) },
  { label: `a target stub name of ${MODULE_STUB_NAME_MAX + 1} chars`, record: siteWith({ target: OVER_STUB_TARGET }) }
];

describe('FEATURE: isModuleSitesMessage', () => {
  describe('GIVEN a moduleSites message', () => {
    it.each(ACCEPTED)('WHEN it is $label THEN it is accepted', ({ record }) => {
      expect(isModuleSitesMessage(record)).toBe(true);
    });

    it.each(REJECTED)('WHEN it is $label THEN it is rejected', ({ record }) => {
      expect(isModuleSitesMessage(record)).toBe(false);
    });
  });
});
