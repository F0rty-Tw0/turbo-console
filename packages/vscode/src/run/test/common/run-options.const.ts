import type { RunExtras } from '@turbo-console/core';

import { TURBO_BINARY_STUB } from '../../../roots/test/stubs/root.stub.ts';
import type { RunRequest } from '../../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../stubs/run.stub.ts';

/** The run of the build row of package a, with no picks, in a root loaded with `TURBO_BINARY_STUB`. */
export const PLAIN_REQUEST: RunRequest = { ...RUN_REQUEST_STUB, binaryPath: TURBO_BINARY_STUB.path };

/** The extras of a pick of Only alone. */
export const ONLY_EXTRAS: RunExtras = { only: true };
