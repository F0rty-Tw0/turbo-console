import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';

const isString = (value: unknown): value is string => typeof value === 'string';

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
