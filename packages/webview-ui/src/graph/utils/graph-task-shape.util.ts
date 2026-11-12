import { ATOM_OUTCOMES, RUN_STATES, TASK_COUNT_MAX } from '../../bridge/common/graph-message.const.ts';
import { isCount } from '../../bridge/utils/number.util.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { isString } from '../../bridge/utils/string.util.ts';

const isStringList = (value: unknown): boolean => Array.isArray(value) && value.every(isString);

const isGraphTask = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { id, packageName, name, command, isRunnable, isTurboTask, dependencies } = value;
  const hasNames = isString(id) && isString(packageName) && isString(name);
  const hasCommand = command === null || isString(command);
  const hasFlags = typeof isRunnable === 'boolean' && typeof isTurboTask === 'boolean';

  return hasNames && hasCommand && hasFlags && isStringList(dependencies);
};

/** A graph state's `tasks`: an array of tasks with string names, a string or `null` command, two boolean flags and string dependencies. */
export const isGraphTaskList = (value: unknown): boolean => Array.isArray(value) && value.every(isGraphTask);

const isRunState = (value: unknown): boolean => RUN_STATES.some((state) => state === value);

/** A `runs` message's record: task ids to the six run-state words. */
export const isRunsRecord = (value: unknown): boolean => {
  if (!isRecord(value) || Array.isArray(value)) return false;

  return Object.values(value).every(isRunState);
};

const isOwnerId = (value: unknown): boolean => isString(value) && value !== '';

/** A `runs` message's `owners`: at most `TASK_COUNT_MAX` task ids to a non-empty owner task id. */
export const isOwnersRecord = (value: unknown): boolean => {
  if (!isRecord(value) || Array.isArray(value)) return false;

  const isCapped = Object.keys(value).length <= TASK_COUNT_MAX;

  return isCapped && Object.values(value).every(isOwnerId);
};

/** A `showTasks` message's `taskIds`: an array of strings. */
export const isTaskIdList = isStringList;

const isAtomFile = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { id, specPath, isLive } = value;

  return isString(id) && id !== '' && isString(specPath) && typeof isLive === 'boolean';
};

const isAtomGroup = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { umbrellaId, files } = value;
  const hasFiles = Array.isArray(files) && files.length <= TASK_COUNT_MAX && files.every(isAtomFile);

  return isString(umbrellaId) && hasFiles;
};

const umbrellaIdOf = (group: unknown): unknown => (isRecord(group) ? group['umbrellaId'] : undefined);

const hasDistinctUmbrellas = (groups: unknown[]): boolean => {
  const ids = groups.map(umbrellaIdOf);

  return new Set(ids).size === ids.length;
};

/**
 * A graph state's `atomGroups`: at most `TASK_COUNT_MAX` groups with distinct string umbrella ids, each with at most
 * `TASK_COUNT_MAX` files of non-empty string id, string spec path and boolean `isLive`.
 */
export const isAtomGroupList = (value: unknown): boolean => {
  if (!Array.isArray(value)) return false;

  const isCapped = value.length <= TASK_COUNT_MAX;

  return isCapped && value.every(isAtomGroup) && hasDistinctUmbrellas(value);
};

const isAtomOutcome = (value: unknown): boolean => ATOM_OUTCOMES.some((outcome) => outcome === value);

const isAtomOutcomeRecord = (value: unknown): boolean => {
  if (!isRecord(value) || Array.isArray(value)) return false;

  const isCapped = Object.keys(value).length <= TASK_COUNT_MAX;

  return isCapped && Object.values(value).every(isAtomOutcome);
};

const isCappedCount = (value: unknown): boolean => isCount(value) && value <= TASK_COUNT_MAX;

const isCappedCountOrNull = (value: unknown): boolean => value === null || isCappedCount(value);

/** An umbrella's counts: `files` a whole number in 0..`TASK_COUNT_MAX`, `cached` and `failed` each one too or `null`; a missing key fails. */
export const isAtomCounts = (value: unknown): boolean => {
  if (!isRecord(value) || Array.isArray(value)) return false;

  const { files, cached, failed } = value;

  return isCappedCount(files) && isCappedCountOrNull(cached) && isCappedCountOrNull(failed);
};

const isAtomState = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { counts, files } = value;

  return isAtomCounts(counts) && isAtomOutcomeRecord(files);
};

/**
 * An `atoms` message's `groups`: umbrella ids to counts `isAtomCounts` accepts and at most `TASK_COUNT_MAX` file ids to
 * the four outcome words.
 */
export const isAtomStateRecord = (value: unknown): boolean => {
  if (!isRecord(value) || Array.isArray(value)) return false;

  return Object.values(value).every(isAtomState);
};
