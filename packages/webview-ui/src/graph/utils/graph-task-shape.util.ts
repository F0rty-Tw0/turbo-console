import { ATOM_OUTCOMES, RUN_STATES, TASK_COUNT_MAX } from '../../bridge/common/graph-message.const.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { isString } from '../../bridge/utils/string.util.ts';
import { ATOM_COUNTS_TEXT_MAX } from '../common/graph-atom.const.ts';

const isStringList = (value: unknown): boolean => Array.isArray(value) && value.every(isString);

const isGraphTask = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { id, packageName, name, command, isRunnable, dependencies } = value;
  const hasNames = isString(id) && isString(packageName) && isString(name);
  const hasCommand = command === null || isString(command);
  const hasFlag = typeof isRunnable === 'boolean';

  return hasNames && hasCommand && hasFlag && isStringList(dependencies);
};

/** A graph state's `tasks`: an array of tasks with string names, a string or `null` command, a boolean flag and string dependencies. */
export const isGraphTaskList = (value: unknown): boolean => Array.isArray(value) && value.every(isGraphTask);

const isRunState = (value: unknown): boolean => RUN_STATES.some((state) => state === value);

/** A `runs` message's record: task ids to the five run-state words. */
export const isRunsRecord = (value: unknown): boolean => {
  if (!isRecord(value) || Array.isArray(value)) return false;

  return Object.values(value).every(isRunState);
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

const isCountsLine = (value: unknown): boolean => isString(value) && value.length <= ATOM_COUNTS_TEXT_MAX && !value.includes('\n');

const isAtomState = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { counts, files } = value;

  return isCountsLine(counts) && isAtomOutcomeRecord(files);
};

/**
 * An `atoms` message's `groups`: umbrella ids to a one-line counts string of at most `ATOM_COUNTS_TEXT_MAX` characters
 * and at most `TASK_COUNT_MAX` file ids to the four outcome words.
 */
export const isAtomStateRecord = (value: unknown): boolean => {
  if (!isRecord(value) || Array.isArray(value)) return false;

  return Object.values(value).every(isAtomState);
};
