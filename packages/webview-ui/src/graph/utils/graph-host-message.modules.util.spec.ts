import { describe, expect, it } from 'vitest';

import { isGraphHostMessage } from './graph-host-message.util.ts';
import { MODULES_FOUND_STUB, MODULE_SITES_FOUND_STUB } from '../test/stubs/graph-host-message.stub.ts';

const REPEATED_TESTS = { ...MODULES_FOUND_STUB, tests: [1, 1] };

const FROM_FILE = { kind: 'file', path: 'src/a.ts' };

const FOUND_SITES_MESSAGE = { type: 'moduleSites', packageName: 'web', from: FROM_FILE, to: null, result: MODULE_SITES_FOUND_STUB };

const DIR_TARGET = { kind: 'dir', path: 'src' };

const DIR_TARGET_SITE = { ...MODULE_SITES_FOUND_STUB.imports[0], target: DIR_TARGET };

const DIR_TARGET_RESULT = { ...MODULE_SITES_FOUND_STUB, imports: [DIR_TARGET_SITE] };

const DIR_TARGET_MESSAGE = { ...FOUND_SITES_MESSAGE, result: DIR_TARGET_RESULT };

const FOUND_MODULES_MESSAGE = { type: 'packageModules', packageName: 'web', result: MODULES_FOUND_STUB };

const REPEATED_TESTS_MESSAGE = { type: 'packageModules', packageName: 'web', result: REPEATED_TESTS };

describe('FEATURE: isGraphHostMessage, package modules', () => {
  describe('GIVEN a packageModules message', () => {
    it('WHEN it carries a found result THEN it is accepted', () => {
      const isMessage = isGraphHostMessage(FOUND_MODULES_MESSAGE);

      expect(isMessage).toBe(true);
    });

    it('WHEN its test indexes repeat THEN it is rejected', () => {
      const isMessage = isGraphHostMessage(REPEATED_TESTS_MESSAGE);

      expect(isMessage).toBe(false);
    });
  });

  describe('GIVEN a moduleSites message', () => {
    it('WHEN it carries a found result THEN it is accepted', () => {
      const isMessage = isGraphHostMessage(FOUND_SITES_MESSAGE);

      expect(isMessage).toBe(true);
    });

    it('WHEN a site targets a dir THEN it is rejected', () => {
      const isMessage = isGraphHostMessage(DIR_TARGET_MESSAGE);

      expect(isMessage).toBe(false);
    });
  });

  describe('GIVEN a showModules message', () => {
    it('WHEN it names a package THEN it is accepted', () => {
      const isMessage = isGraphHostMessage({ type: 'showModules', name: 'web' });

      expect(isMessage).toBe(true);
    });

    it.each([
      ['a showModules message with no name', { type: 'showModules' }],
      ['a showModules message with a numeric name', { type: 'showModules', name: 7 }]
    ])('WHEN it is %s THEN it is rejected', (_name, raw) => {
      const isMessage = isGraphHostMessage(raw);

      expect(isMessage).toBe(false);
    });
  });
});
