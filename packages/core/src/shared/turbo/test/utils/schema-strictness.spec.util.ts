import type { ZodType } from 'zod';

const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

const childAt = (value: unknown, key: string): unknown => {
  if (!isObject(value)) return undefined;

  const child: unknown = Reflect.get(value, key);

  return child;
};

/** Every object key path under `value`, recursing into nested objects and the first element of each array. */
const keyPaths = (value: unknown, path: string[]): string[][] => {
  if (Array.isArray(value)) return keyPaths(childAt(value, '0'), [...path, '0']);

  if (!isObject(value)) return [];

  const pathsUnder = (key: string): string[][] => {
    const keyPath = [...path, key];
    const nested = keyPaths(childAt(value, key), keyPath);

    return [keyPath, ...nested];
  };

  return Object.keys(value).flatMap(pathsUnder);
};

const withoutKey = (value: unknown, path: string[]): unknown => {
  const clone: unknown = structuredClone(value);
  const parent = path.slice(0, -1).reduce(childAt, clone);
  const key = path.at(-1) ?? '';

  if (isObject(parent)) Reflect.deleteProperty(parent, key);

  return clone;
};

/**
 * Dotted key paths of `output` that `schema` still accepts once that key is deleted; empty when every key the schema
 * lists is required. `output` is parsed first, so only schema-listed keys are probed; arrays are probed through their
 * first element.
 */
export const optionalKeyPaths = (schema: ZodType, output: unknown): string[] => {
  const parsed: unknown = schema.parse(output);

  const isAccepted = (path: string[]): boolean => {
    const mutant = withoutKey(parsed, path);

    return schema.safeParse(mutant).success;
  };

  const accepted = keyPaths(parsed, []).filter(isAccepted);

  return accepted.map((path) => path.join('.'));
};
