import type { TaskRuns } from '../../../src/graph/common/task-details.type.ts';

/** web builds while its test failed. */
export const WEB_RUNNING_AND_FAILED_STUB: TaskRuns = { 'web#build': 'running', 'web#test': 'failed' };

/** web built and its test failed. */
export const WEB_PASSED_AND_FAILED_STUB: TaskRuns = { 'web#build': 'passed', 'web#test': 'failed' };

/** ui builds while utils built. */
export const UI_RUNNING_UTILS_PASSED_STUB: TaskRuns = { '@acme/ui#build': 'running', '@acme/utils#build': 'passed' };
