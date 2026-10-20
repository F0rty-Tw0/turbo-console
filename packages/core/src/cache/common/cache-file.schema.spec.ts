import { describe, expect, it } from 'vitest';

import { cacheFileSchema, workspaceModelSchema } from './cache-file.schema.ts';
import { CACHE_FORMAT_VERSION } from './cache.const.ts';
import { SINGLE_PACKAGE_MODEL_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/cache.stub.ts';

const FILE = { formatVersion: CACHE_FORMAT_VERSION, key: 'abc', keyedPaths: ['package.json'], model: WORKSPACE_MODEL_STUB };

const NULL_KEY_FILE = { ...FILE, key: null };

const NO_KEY_FILE = { formatVersion: CACHE_FORMAT_VERSION, keyedPaths: ['package.json'], model: WORKSPACE_MODEL_STUB };

const EXTRA_KEY_FILE = { ...FILE, extra: 1 };

const EXTRA_KEY_MODEL = { ...WORKSPACE_MODEL_STUB, extra: 1 };

/** A copy of the stub model whose first task has no `atom` key at all, where the stub holds `null`. */
const modelWithoutAtomKey = (): unknown => {
  const model = structuredClone(WORKSPACE_MODEL_STUB);
  const tasks = model.packages.flatMap((pkg) => pkg.tasks);
  const [task] = tasks;

  if (task === undefined) throw new Error('the stub model has no task');

  Reflect.deleteProperty(task, 'atom');

  return model;
};

/** A copy of the stub model without one key, where the stub holds a value. */
const modelWithoutKey = (key: string): unknown => {
  const model = structuredClone(WORKSPACE_MODEL_STUB);

  Reflect.deleteProperty(model, key);

  return model;
};

const modelWithoutPackageLabel = (): unknown => {
  const model = structuredClone(WORKSPACE_MODEL_STUB);
  const [pkg] = model.packages;

  if (pkg === undefined) throw new Error('the stub model has no package');

  Reflect.deleteProperty(pkg, 'label');

  return model;
};

describe('FEATURE: cache file schema', () => {
  describe('GIVEN a valid workspace model', () => {
    it('WHEN parsed THEN the model is frozen', () => {
      const parsed = workspaceModelSchema.parse(WORKSPACE_MODEL_STUB);

      expect(Object.isFrozen(parsed)).toBe(true);
    });

    it('WHEN parsed THEN every package, task, edge and the package manager are frozen', () => {
      const parsed = workspaceModelSchema.parse(WORKSPACE_MODEL_STUB);
      const tasks = parsed.packages.flatMap((pkg) => pkg.tasks);
      const nested = [...parsed.packages, ...tasks, ...parsed.edges, parsed.packageManager, parsed.packageManager.source];

      expect(nested.every(Object.isFrozen)).toBe(true);
    });

    it('WHEN it holds a key the schema does not list THEN the parsed model drops it', () => {
      const parsed = workspaceModelSchema.parse(EXTRA_KEY_MODEL);

      expect(parsed).toStrictEqual(WORKSPACE_MODEL_STUB);
    });
  });

  describe('GIVEN a single-package model with a labelled package', () => {
    it('WHEN parsed THEN it parses unchanged', () => {
      const parsed = workspaceModelSchema.parse(SINGLE_PACKAGE_MODEL_STUB);

      expect(parsed).toStrictEqual(SINGLE_PACKAGE_MODEL_STUB);
    });
  });

  describe('GIVEN a model without singlePackage', () => {
    it('WHEN parsed THEN it fails', () => {
      const result = workspaceModelSchema.safeParse(modelWithoutKey('singlePackage'));

      expect(result.success).toBe(false);
    });
  });

  describe('GIVEN a package with no label key', () => {
    it('WHEN parsed THEN it fails: label is nullable, never optional', () => {
      const result = workspaceModelSchema.safeParse(modelWithoutPackageLabel());

      expect(result.success).toBe(false);
    });
  });

  describe('GIVEN a task with no atom key', () => {
    it('WHEN parsed THEN it fails: atom is nullable, never optional', () => {
      const result = workspaceModelSchema.safeParse(modelWithoutAtomKey());

      expect(result.success).toBe(false);
    });
  });

  describe('GIVEN a cache file', () => {
    it('WHEN its key is null THEN it parses', () => {
      const result = cacheFileSchema.safeParse(NULL_KEY_FILE);

      expect(result.success).toBe(true);
    });

    it('WHEN it has no key THEN it fails: key is nullable, never optional', () => {
      const result = cacheFileSchema.safeParse(NO_KEY_FILE);

      expect(result.success).toBe(false);
    });

    it('WHEN it holds a key the schema does not list THEN the parsed file drops it', () => {
      const parsed = cacheFileSchema.parse(EXTRA_KEY_FILE);

      expect(parsed).toStrictEqual(FILE);
    });
  });
});
