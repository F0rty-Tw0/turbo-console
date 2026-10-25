import { ATOM_OUTCOMES, RUN_STATES, TASK_COUNT_MAX } from '../../bridge/common/graph-message.const.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { isString } from '../../bridge/utils/string.util.ts';

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

  return isString(id) && isString(specPath) && typeof isLive === 'boolean';
};

const isAtomGroup = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { umbrellaId, files } = value;
  const hasFiles = Array.isArray(files) && files.length <= TASK_COUNT_MAX && files.every(isAtomFile);

  return isString(umbrellaId) && hasFiles;
};

/** A graph state's `atomGroups`: an array of groups with a string umbrella id and at most `TASK_COUNT_MAX` files of string id, string spec path and boolean `isLive`. */
export const isAtomGroupList = (value: unknown): boolean => Array.isArray(value) && value.every(isAtomGroup);

const isAtomOutcome = (value: unknown): boolean => ATOM_OUTCOMES.some((outcome) => outcome === value);

const isAtomOutcomeRecord = (value: unknown): boolean => {
  if (!isRecord(value) || Array.isArray(value)) return false;

  return Object.values(value).every(isAtomOutcome);
};

const isAtomState = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { counts, files } = value;

  return isString(counts) && isAtomOutcomeRecord(files);
};

/** An `atoms` message's `groups`: umbrella ids to a string counts line and file ids to the four outcome words. */
export const isAtomStateRecord = (value: unknown): boolean => {
  if (!isRecord(value) || Array.isArray(value)) return false;

  return Object.values(value).every(isAtomState);
};
