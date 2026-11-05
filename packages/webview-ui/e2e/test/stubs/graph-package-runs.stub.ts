import type { TaskRuns } from '../../../src/graph/common/task-details.type.ts';

/** The shot's packages by state: web and lint are building, ui failed, core passed; tools is collapsed, so it reads running. */
export const PACKAGE_RUN_SHOT_RUNS_STUB: TaskRuns = {
  'web#build': 'running',
  'ui#build': 'failed',
  'core#build': 'passed',
  'lint#build': 'running'
};

/** web builds while its test failed. */
export const WEB_RUNNING_AND_FAILED_STUB: TaskRuns = { 'web#build': 'running', 'web#test': 'failed' };

/** web built and its test failed. */
export const WEB_PASSED_AND_FAILED_STUB: TaskRuns = { 'web#build': 'passed', 'web#test': 'failed' };

/** ui builds while utils built. */
export const UI_RUNNING_UTILS_PASSED_STUB: TaskRuns = { '@acme/ui#build': 'running', '@acme/utils#build': 'passed' };

/** Only web's build runs. */
export const WEB_RUNNING_STUB: TaskRuns = { 'web#build': 'running' };

/** Only ui's build runs. */
export const UI_RUNNING_STUB: TaskRuns = { '@acme/ui#build': 'running' };

/** web's build did not start while its test passed. */
export const WEB_FAILED_TO_START_AND_PASSED_STUB: TaskRuns = { 'web#build': 'failed-to-start', 'web#test': 'passed' };

/** web's build is a continuous task while its test did not start. */
export const WEB_CONTINUOUS_AND_FAILED_TO_START_STUB: TaskRuns = { 'web#build': 'continuous', 'web#test': 'failed-to-start' };

/** web's build is continuous while its test runs. */
export const WEB_CONTINUOUS_AND_RUNNING_STUB: TaskRuns = { 'web#build': 'continuous', 'web#test': 'running' };
