import type { RunEntry } from '../../../run/common/run.type.ts';
import type { RunningTasks } from '../../common/tree-node.type.ts';

export const ROOT = '/ws';

export const OTHER_ROOT = '/other';

export const PKG = '@fx/e2e';

export const FILE_A = '@fx/e2e#e2e-ci--tests/a.spec.ts';

export const FILE_B = '@fx/e2e#e2e-ci--tests/b fails.spec.ts';

export const UMBRELLA_ID = '@fx/e2e#e2e-ci';

/** The spec paths of the base model: package `@fx/e2e`, group `e2e-ci`, files `FILE_A` and `FILE_B`. */
export const BASE_SPEC_PATHS: string[] = ['tests/a.spec.ts', 'tests/b fails.spec.ts'];

/** An elapsed tick that re-requests the children of the group umbrella. */
export const UMBRELLA_TICK: RunningTasks = new Map([[ROOT, new Set([UMBRELLA_ID])]]);

/** Run patches over `RUN_ENTRY_STUB`: the run of `FILE_A` in `PKG` is still running, ended while its summary is matching, or ended and matched. */
export const STILL_RUNNING: Partial<RunEntry> = { state: 'running' };

export const ENDED_MATCHING: Partial<RunEntry> = { state: 'passed', matching: true };

export const ENDED_MATCHED: Partial<RunEntry> = { state: 'passed' };

export const OTHER_ENDED: Partial<RunEntry> = { state: 'passed', packageName: 'a', taskId: 'a#build' };
