/** A task whose script exits 3. */
export const FAILING_NAME = 'fail-3';

/** A task that depends on `FAILING_NAME`, so it never runs. */
export const DEPENDENT_NAME = 'after-fail';

export const SCRIPTS_ANCHOR = '"scripts": {';

export const TASKS_ANCHOR = '"tasks": {';
