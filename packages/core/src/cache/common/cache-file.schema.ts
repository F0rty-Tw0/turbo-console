import { z } from 'zod';

import { CACHE_FORMAT_VERSION, LOCKFILE_NAMES } from './cache.const.ts';
import { PACKAGE_MANAGER_NAMES } from '../../workspace/common/package-manager.const.ts';

const nullableString = z.string().nullable();

const stringList = z.array(z.string());

const atomSchema = z.object({ group: z.string(), isLive: z.boolean() }).readonly();

const nullableAtom = atomSchema.nullable();

const taskKindSchema = z.enum(['atom-aggregate', 'atom-file', 'atom-umbrella', 'task']);

const taskObject = z.object({
  id: z.string(),
  name: z.string(),
  command: nullableString,
  description: nullableString,
  tags: stringList,
  dependencies: stringList,
  kind: taskKindSchema,
  atom: nullableAtom,
  isTurboTask: z.boolean(),
  persistent: z.boolean()
});

const taskSchema = taskObject.readonly();

const taskList = z.array(taskSchema);

const packageObject = z.object({ name: z.string(), path: z.string(), tags: stringList, tasks: taskList });

const packageSchema = packageObject.readonly();

const edgeSchema = z.object({ source: z.string(), target: z.string(), kind: z.string() }).readonly();

const affectedModeSchema = z.enum(['package', 'task']);

const packageList = z.array(packageSchema);

const edgeList = z.array(edgeSchema);

const packageManagerNameSchema = z.enum(PACKAGE_MANAGER_NAMES);

const lockfileNameSchema = z.enum(LOCKFILE_NAMES);

const fieldSource = z.object({ kind: z.literal('field') });

const lockfileSource = z.object({ kind: z.literal('lockfile'), file: lockfileNameSchema });

const defaultSource = z.object({ kind: z.literal('default') });

const sourceSchema = z.discriminatedUnion('kind', [fieldSource, lockfileSource, defaultSource]).readonly();

const packageManagerSchema = z.object({ name: packageManagerNameSchema, source: sourceSchema }).readonly();

const workspaceModelObject = z.object({
  root: z.string(),
  turboVersion: z.string(),
  packageManager: packageManagerSchema,
  affectedMode: affectedModeSchema,
  packages: packageList,
  edges: edgeList,
  warnings: stringList
});

/** Spec §4.4's `WorkspaceModel`, field by field. */
export const workspaceModelSchema = workspaceModelObject.readonly();

const formatVersionSchema = z.literal(CACHE_FORMAT_VERSION);

const cacheFileObject = z.object({
  formatVersion: formatVersionSchema,
  key: nullableString,
  keyedPaths: stringList,
  model: workspaceModelSchema
});

/**
 * `<cacheDir>/workspace-<hash>.json`. `keyedPaths` are hashed again on every read, so `readCacheFile` also refuses one
 * outside the root (a check this layer cannot import).
 */
export const cacheFileSchema = cacheFileObject.readonly();
