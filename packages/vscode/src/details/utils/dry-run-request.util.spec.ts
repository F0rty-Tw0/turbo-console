import { describe, expect, it } from 'vitest';

import { dryRunRequestOf } from './dry-run-request.util.ts';
import {
  ADHOC_TASK_STUB,
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  CHECK_TASK_STUB,
  DETAILS_MODEL_STUB,
  FILE_TASK_STUB,
  TEST_TASK_STUB
} from '../test/stubs/details-model.stub.ts';

describe('FEATURE: details dry-run request', () => {
  describe('GIVEN a package with command, umbrella and file tasks', () => {
    it('WHEN asked THEN only its shown tasks with a command go, filtered to it', () => {
      expect(dryRunRequestOf(DETAILS_MODEL_STUB, 'a')).toStrictEqual({
        tasks: ['test', 'build'],
        packages: ['a'],
        singlePackage: false
      });
    });
  });

  describe('GIVEN a package whose tasks have no command or are file tasks', () => {
    it('WHEN asked THEN there is no request', () => {
      const pkg = { ...A_PACKAGE_STUB, tasks: [CHECK_TASK_STUB, FILE_TASK_STUB] };
      const model = { ...DETAILS_MODEL_STUB, packages: [pkg] };

      expect(dryRunRequestOf(model, 'a')).toBeNull();
    });
  });

  describe('GIVEN a package with a script no turbo config defines', () => {
    it('WHEN asked THEN that script stays out of the request', () => {
      const pkg = { ...A_PACKAGE_STUB, tasks: [TEST_TASK_STUB, ADHOC_TASK_STUB, BUILD_TASK_STUB] };
      const model = { ...DETAILS_MODEL_STUB, packages: [pkg] };

      expect(dryRunRequestOf(model, 'a')).toStrictEqual({ tasks: ['test', 'build'], packages: ['a'], singlePackage: false });
    });
  });

  describe('GIVEN a package whose only task with a command is not a turbo task', () => {
    it('WHEN asked THEN there is no request', () => {
      const pkg = { ...A_PACKAGE_STUB, tasks: [CHECK_TASK_STUB, ADHOC_TASK_STUB] };
      const model = { ...DETAILS_MODEL_STUB, packages: [pkg] };

      expect(dryRunRequestOf(model, 'a')).toBeNull();
    });
  });

  describe('GIVEN a model without the package', () => {
    it('WHEN asked THEN there is no request', () => {
      expect(dryRunRequestOf(DETAILS_MODEL_STUB, 'gone')).toBeNull();
    });
  });

  describe('GIVEN no model', () => {
    it('WHEN asked THEN there is no request', () => {
      expect(dryRunRequestOf(null, 'a')).toBeNull();
    });
  });

  describe('GIVEN a single-package model', () => {
    it('WHEN asked THEN the request carries singlePackage true and filters to //', () => {
      const root = { ...A_PACKAGE_STUB, name: '//', path: '', tasks: [TEST_TASK_STUB, BUILD_TASK_STUB] };
      const model = { ...DETAILS_MODEL_STUB, singlePackage: true, packages: [root] };

      expect(dryRunRequestOf(model, '//')).toStrictEqual({ tasks: ['test', 'build'], packages: ['//'], singlePackage: true });
    });
  });
});
