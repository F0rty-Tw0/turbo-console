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
  it('GIVEN a package with command, umbrella and file tasks WHEN asked THEN only its shown tasks with a command go, filtered to it', () => {
    expect(dryRunRequestOf(DETAILS_MODEL_STUB, 'a')).toStrictEqual({ tasks: ['test', 'build'], packages: ['a'] });
  });

  it('GIVEN a package whose tasks have no command or are file tasks WHEN asked THEN there is no request', () => {
    const pkg = { ...A_PACKAGE_STUB, tasks: [CHECK_TASK_STUB, FILE_TASK_STUB] };
    const model = { ...DETAILS_MODEL_STUB, packages: [pkg] };

    expect(dryRunRequestOf(model, 'a')).toBeNull();
  });

  it('GIVEN a package with a script no turbo config defines WHEN asked THEN that script stays out of the request', () => {
    const pkg = { ...A_PACKAGE_STUB, tasks: [TEST_TASK_STUB, ADHOC_TASK_STUB, BUILD_TASK_STUB] };
    const model = { ...DETAILS_MODEL_STUB, packages: [pkg] };

    expect(dryRunRequestOf(model, 'a')).toStrictEqual({ tasks: ['test', 'build'], packages: ['a'] });
  });

  it('GIVEN a package whose only task with a command is not a turbo task WHEN asked THEN there is no request', () => {
    const pkg = { ...A_PACKAGE_STUB, tasks: [CHECK_TASK_STUB, ADHOC_TASK_STUB] };
    const model = { ...DETAILS_MODEL_STUB, packages: [pkg] };

    expect(dryRunRequestOf(model, 'a')).toBeNull();
  });

  it('GIVEN a model without the package WHEN asked THEN there is no request', () => {
    expect(dryRunRequestOf(DETAILS_MODEL_STUB, 'gone')).toBeNull();
  });

  it('GIVEN no model WHEN asked THEN there is no request', () => {
    expect(dryRunRequestOf(null, 'a')).toBeNull();
  });
});
