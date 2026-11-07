import { isAbsolute, resolve } from 'node:path';

import { getNodeValue, parseTree } from 'jsonc-parser';
import type { ParseError } from 'jsonc-parser';
import { looseObject, optional, unknown } from 'zod/mini';

import { BYTE_ORDER_MARK } from '../../shared/text/common/text.const.ts';
import type { TsconfigFile } from '../common/tsconfig.type.ts';

/** zod 4 rejects a missing `unknown()` key; `optional` lets a file omit it. */
const optionalUnknown = optional(unknown());

const optionsSchema = looseObject({ paths: optionalUnknown, baseUrl: optionalUnknown });

const fileSchema = looseObject({ extends: optionalUnknown, compilerOptions: optional(optionsSchema) });

const PARSE_OPTIONS = { allowTrailingComma: true };

const isText = (value: unknown): value is string => typeof value === 'string';

const isAtMostOneStar = (text: string): boolean => {
  const first = text.indexOf('*');
  const last = text.lastIndexOf('*');

  return first === last;
};

const extendsOf = (value: unknown): string[] => {
  if (isText(value)) return [value];

  const isArray = Array.isArray(value);

  if (!isArray) return [];

  return value.filter(isText);
};

const targetsOf = (value: unknown): string[] => {
  const isArray = Array.isArray(value);

  if (!isArray) return [];

  const texts = value.filter(isText);

  return texts.filter(isAtMostOneStar);
};

/** `Object.fromEntries` defines own keys, so a pattern named `__proto__` stays a key and no prototype is swapped. */
const patternsOf = (value: object): Record<string, string[]> => {
  const entries: [string, string[]][] = [];

  for (const [key, targets] of Object.entries(value)) {
    const kept = targetsOf(targets);
    const isKeyKept = isAtMostOneStar(key);
    const isPatternKept = isKeyKept && kept.length > 0;

    if (!isPatternKept) continue;

    entries.push([key, kept]);
  }

  return Object.fromEntries(entries);
};

const pathsOf = (value: unknown): Record<string, string[]> | null | undefined => {
  if (value === null) return null;

  const isArray = Array.isArray(value);

  if (typeof value !== 'object' || isArray) return undefined;

  return patternsOf(value);
};

const baseUrlOf = (value: unknown): string | undefined => (isText(value) ? value : undefined);

const parsedFile = (text: string): TsconfigFile | null => {
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, PARSE_OPTIONS);
  const hasErrors = errors.length > 0;
  const isObject = tree?.type === 'object';

  if (hasErrors || !isObject) return null;

  const json: unknown = getNodeValue(tree);
  const parsed = fileSchema.safeParse(json);

  if (!parsed.success) return null;

  const options = parsed.data.compilerOptions;
  const file: TsconfigFile = {
    extends: extendsOf(parsed.data.extends),
    paths: pathsOf(options?.paths),
    baseUrl: baseUrlOf(options?.baseUrl)
  };

  return file;
};

/**
 * One `tsconfig.json` text (a leading BOM is ignored, as TS does) as the chain needs it (D6): `extends` strings,
 * `compilerOptions.paths` with keys and targets of at most one `*` (a key left with no target is dropped),
 * `compilerOptions.baseUrl` when a string. `null` for a JSONC error, a non-object root or a bad shape; never a throw (a
 * text nested too deep overflows the parser's stack with a `RangeError` and is `null` too).
 */
export const tsconfigFileOf = (text: string): TsconfigFile | null => {
  try {
    const bare = text.replace(BYTE_ORDER_MARK, '');

    return parsedFile(bare);
  } catch {
    return null;
  }
};

/**
 * Where one `extends` entry of a file in `dir` points, in the order TS tries them: `[path]` for a `.json` path,
 * `[path, path + '.json']` otherwise; `[]` for a package specifier (D6: ends that branch).
 */
export const extendedPathsOf = (dir: string, entry: string): string[] => {
  const normalized = entry.replaceAll('\\', '/');
  const isDotSlash = normalized.startsWith('./');
  const isDotDotSlash = normalized.startsWith('../');
  const isRooted = isAbsolute(normalized);
  const isPath = isDotSlash || isDotDotSlash || isRooted;

  if (!isPath) return [];

  const path = resolve(dir, normalized);
  const isJson = path.endsWith('.json');

  if (isJson) return [path];

  return [path, `${path}.json`];
};
