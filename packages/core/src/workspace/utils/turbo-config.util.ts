import { getNodeValue, parseTree, printParseErrorCode } from 'jsonc-parser';
import type { ParseError } from 'jsonc-parser';
import { z } from 'zod';

import type { TaskPresence, TurboConfigError, TurboConfigFile, TurboConfigOk } from '../common/turbo-config.type.ts';

/** zod 4 rejects a missing `z.unknown()` key; `.optional()` lets a task or the flags block omit it. */
const optionalUnknown = z.unknown().optional();

const taskSchema = z.looseObject({ description: optionalUnknown, extends: optionalUnknown, persistent: optionalUnknown });

const tasksSchema = z.record(z.string(), taskSchema).optional();

const futureFlagsSchema = z.looseObject({ affectedUsingTaskInputs: optionalUnknown }).optional();

const configSchema = z.looseObject({ extends: optionalUnknown, tasks: tasksSchema, futureFlags: futureFlagsSchema });

const PARSE_OPTIONS = { allowTrailingComma: true };

const TOO_DEEP = 'too deeply nested';

type TaskConfig = z.infer<typeof taskSchema>;

const toError = (path: string, error: string): TurboConfigError => {
  const config: TurboConfigError = { path, error };

  return config;
};

/** `Object.fromEntries` defines own keys, so no task name can change the record's prototype. */
const descriptionsOf = (tasks: Record<string, TaskConfig>): Record<string, string> => {
  const entries: [string, string][] = [];

  for (const [name, task] of Object.entries(tasks)) {
    if (typeof task.description === 'string') entries.push([name, task.description]);
  }

  return Object.fromEntries(entries);
};

const isSetValue = (value: unknown): boolean => value !== undefined;

/**
 * Turbo drops an inherited task whose entry is exactly `{ "extends": false }`; `extends: false` beside other keys is a
 * fresh definition that inherits no field.
 */
const presenceOf = (task: TaskConfig): TaskPresence => {
  if (task.extends !== false) return 'defined';

  const setValues = Object.values(task).filter(isSetValue);

  return setValues.length === 1 ? 'excluded' : 'fresh';
};

const presenceEntry = ([name, task]: [string, TaskConfig]): [string, TaskPresence] => [name, presenceOf(task)];

/** `Object.fromEntries` defines own keys, so a task named `__proto__` stays a key, as in `descriptionsOf`. */
const presencesOf = (tasks: Record<string, TaskConfig>): Record<string, TaskPresence> => {
  const entries = Object.entries(tasks).map(presenceEntry);

  return Object.fromEntries(entries);
};

/** `Object.fromEntries` defines own keys, so a task named `__proto__` stays a key, as in `descriptionsOf`. */
const persistentsOf = (tasks: Record<string, TaskConfig>): Record<string, boolean> => {
  const entries: [string, boolean][] = [];

  for (const [name, task] of Object.entries(tasks)) {
    if (typeof task.persistent === 'boolean') entries.push([name, task.persistent]);
  }

  return Object.fromEntries(entries);
};

const isText = (value: unknown): value is string => typeof value === 'string';

/** The config's top-level `extends` names (`//` for the root, else package names); not an array reads as none. */
const extendsOf = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter(isText);
};

/**
 * `parseTree` + `getNodeValue` build objects with no prototype, so a `__proto__` key stays a plain key: `parse` assigns
 * it, which swaps the object's prototype and lets zod read inherited `description` or `futureFlags` values.
 */
const parsedConfig = (path: string, text: string): TurboConfigFile => {
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, PARSE_OPTIONS);
  const [firstError] = errors;

  if (firstError !== undefined) {
    const code = printParseErrorCode(firstError.error);

    return toError(path, `${code} at ${firstError.offset}`);
  }

  const isObject = tree?.type === 'object';

  if (!isObject) return toError(path, 'not an object');

  const json: unknown = getNodeValue(tree);
  const parsed = configSchema.safeParse(json);

  if (!parsed.success) return toError(path, 'not an object');

  const tasks = parsed.data.tasks ?? {};
  const descriptions = descriptionsOf(tasks);
  const presences = presencesOf(tasks);
  const persistent = persistentsOf(tasks);
  const extendsNames = extendsOf(parsed.data.extends);
  const affectedUsingTaskInputs = parsed.data.futureFlags?.affectedUsingTaskInputs === true;
  const config: TurboConfigOk = {
    path,
    descriptions,
    tasks: presences,
    persistent,
    extends: extendsNames,
    affectedUsingTaskInputs
  };

  return config;
};

/**
 * One `turbo.json(c)` text: comments and trailing commas allowed; only `extends`, the task keys, task descriptions and
 * `futureFlags.affectedUsingTaskInputs` are read. The parser recurses once per nesting level, so a text nested deep
 * enough to overflow the stack is an error entry, never a throw.
 */
export const parseTurboConfig = (path: string, text: string): TurboConfigFile => {
  try {
    return parsedConfig(path, text);
  } catch (error) {
    if (error instanceof RangeError) return toError(path, TOO_DEEP);

    throw error;
  }
};
