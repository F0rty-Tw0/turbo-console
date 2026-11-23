import { describe, expect, it } from 'vitest';

import { isPackageModules } from './package-modules.util.ts';
import type { UnknownRecord } from '../../bridge/common/bridge.type.ts';
import {
  MANIFEST_FILE_MAX,
  MODULE_FILES_MAX,
  MODULE_LINKS_MAX,
  MODULE_STUB_NAME_MAX
} from '../../bridge/common/graph-message.const.ts';
import type { ModuleLink } from '../../bridge/common/graph-modules.type.ts';
import { MODULES_FOUND_STUB } from '../test/stubs/graph-host-message.stub.ts';

const messageOf = (result: unknown, over: object = {}): UnknownRecord => {
  const message = { type: 'packageModules', packageName: 'web', result, ...over };

  return message;
};

const foundWith = (over: object): UnknownRecord => {
  const result = { ...MODULES_FOUND_STUB, ...over };

  return messageOf(result);
};

const filesOf = (count: number): string[] => Array.from({ length: count }, (_: unknown, index: number): string => `src/f${index}.ts`);

const linksOf = (count: number, link: ModuleLink): ModuleLink[] => Array.from({ length: count }, (): ModuleLink => link);

const STATIC_LINK: ModuleLink = [0, 1, 1, 0, 0];

const TYPE_STUB_LINK: ModuleLink = [0, 0, 0, 1, 0];

const LONG_PATH = 'f'.repeat(MANIFEST_FILE_MAX);

const OVER_PATH = 'f'.repeat(MANIFEST_FILE_MAX + 1);

const LONG_STUB = 's'.repeat(MODULE_STUB_NAME_MAX);

const OVER_STUB = 's'.repeat(MODULE_STUB_NAME_MAX + 1);

const FULL_FILE_LINKS = linksOf(MODULE_LINKS_MAX - 1, STATIC_LINK);

const OVER_FILE_LINKS = linksOf(MODULE_LINKS_MAX, STATIC_LINK);

const ONE_STUB_LINK = [TYPE_STUB_LINK];

const ARRAY_LIKE_LINKS = { length: 1, 0: STATIC_LINK };

const NEGATIVE_SELF = { unresolved: 0, external: 2, assets: 0, self: -1 };

const NO_ASSETS = { unresolved: 0, external: 2, self: 0 };

const NO_RESULT = { type: 'packageModules', packageName: 'web' };

const ACCEPTED = [
  { label: 'a found result', record: messageOf(MODULES_FOUND_STUB) },
  { label: 'a failed result', record: messageOf({ kind: 'failed' }) },
  { label: 'found with limit time', record: foundWith({ limit: 'time' }) },
  { label: `found with ${MODULE_FILES_MAX} files`, record: foundWith({ files: filesOf(MODULE_FILES_MAX) }) },
  { label: `a path of ${MANIFEST_FILE_MAX} characters`, record: foundWith({ files: [LONG_PATH, 'src/a.spec.ts'] }) },
  { label: `a stub of ${MODULE_STUB_NAME_MAX} characters`, record: foundWith({ stubs: [LONG_STUB] }) },
  {
    label: `file and stub links totalling ${MODULE_LINKS_MAX}`,
    record: foundWith({ fileLinks: FULL_FILE_LINKS, stubLinks: ONE_STUB_LINK })
  }
];

const REJECTED = [
  { label: 'a file link to past the files', record: foundWith({ fileLinks: [[0, 2, 1, 0, 0]] }) },
  { label: 'a stub link to past the stubs', record: foundWith({ stubLinks: [[0, 1, 1, 0, 0]] }) },
  { label: 'a file link from -1', record: foundWith({ fileLinks: [[-1, 0, 1, 0, 0]] }) },
  { label: 'a file link with 1.5 statics', record: foundWith({ fileLinks: [[0, 1, 1.5, 0, 0]] }) },
  { label: 'a file link of 4 columns', record: foundWith({ fileLinks: [[0, 1, 1, 0]] }) },
  { label: 'array-like file links', record: foundWith({ fileLinks: ARRAY_LIKE_LINKS }) },
  { label: 'a repeated test index', record: foundWith({ tests: [1, 1] }) },
  { label: 'descending test indexes', record: foundWith({ tests: [1, 0] }) },
  { label: 'a test index past the files', record: foundWith({ tests: [2] }) },
  { label: 'a numeric file', record: foundWith({ files: ['src/a.ts', 7] }) },
  { label: `found with ${MODULE_FILES_MAX + 1} files`, record: foundWith({ files: filesOf(MODULE_FILES_MAX + 1) }) },
  { label: `a path of ${MANIFEST_FILE_MAX + 1} characters`, record: foundWith({ files: [OVER_PATH, 'src/a.spec.ts'] }) },
  { label: `a stub of ${MODULE_STUB_NAME_MAX + 1} characters`, record: foundWith({ stubs: [OVER_STUB] }) },
  {
    label: `file and stub links totalling ${MODULE_LINKS_MAX + 1}`,
    record: foundWith({ fileLinks: OVER_FILE_LINKS, stubLinks: ONE_STUB_LINK })
  },
  { label: 'a self count of -1', record: foundWith({ counts: NEGATIVE_SELF }) },
  { label: 'counts with no assets', record: foundWith({ counts: NO_ASSETS }) },
  { label: 'a string dropped', record: foundWith({ dropped: '0' }) },
  { label: 'a scanned of 1.5', record: foundWith({ scanned: 1.5 }) },
  { label: 'an unknown limit', record: foundWith({ limit: 'disk' }) },
  { label: 'an unknown kind', record: foundWith({ kind: 'none' }) },
  { label: 'a numeric packageName', record: messageOf(MODULES_FOUND_STUB, { packageName: 7 }) },
  { label: 'no result', record: NO_RESULT }
];

describe('FEATURE: isPackageModules', () => {
  describe('GIVEN a well-formed packageModules record', () => {
    it.each(ACCEPTED)('WHEN it is $label THEN it is accepted', ({ record }) => {
      const isModules = isPackageModules(record);

      expect(isModules).toBe(true);
    });
  });

  describe('GIVEN a malformed packageModules record', () => {
    it.each(REJECTED)('WHEN it is $label THEN it is rejected', ({ record }) => {
      const isModules = isPackageModules(record);

      expect(isModules).toBe(false);
    });
  });
});
