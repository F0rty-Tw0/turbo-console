import { array, boolean, discriminatedUnion, literal, nullable, object, readonly, string, enum as zodEnum } from 'zod/mini';

import { CACHE_FORMAT_VERSION, LOCKFILE_NAMES } from './cache.const.ts';
import { PACKAGE_MANAGER_NAMES } from '../../workspace/common/package-manager.const.ts';

const nullableString = nullable(string());

const stringList = array(string());

const atomObject = object({ group: string(), isLive: boolean() });

const atomSchema = readonly(atomObject);

const nullableAtom = nullable(atomSchema);

const taskKindSchema = zodEnum(['atom-aggregate', 'atom-file', 'atom-umbrella', 'task']);

const taskObject = object({
  id: string(),
  name: string(),
  command: nullableString,
  description: nullableString,
  tags: stringList,
  dependencies: stringList,
  kind: taskKindSchema,
  atom: nullableAtom,
  isTurboTask: boolean(),
  persistent: boolean()
});

const taskSchema = readonly(taskObject);

const taskList = array(taskSchema);

const packageObject = object({ name: string(), path: string(), tags: stringList, tasks: taskList });

const packageSchema = readonly(packageObject);

const edgeObject = object({ source: string(), target: string(), kind: string() });

const edgeSchema = readonly(edgeObject);

const affectedModeSchema = zodEnum(['package', 'task']);

const packageList = array(packageSchema);

const edgeList = array(edgeSchema);

const packageManagerNameSchema = zodEnum(PACKAGE_MANAGER_NAMES);

const lockfileNameSchema = zodEnum(LOCKFILE_NAMES);

const fieldSource = object({ kind: literal('field') });

const devEnginesSource = object({ kind: literal('devEngines') });

const lockfileSource = object({ kind: literal('lockfile'), file: lockfileNameSchema });

const defaultSource = object({ kind: literal('default') });

const sourceUnion = discriminatedUnion('kind', [fieldSource, devEnginesSource, lockfileSource, defaultSource]);

const sourceSchema = readonly(sourceUnion);

const packageManagerObject = object({ name: packageManagerNameSchema, source: sourceSchema });

const packageManagerSchema = readonly(packageManagerObject);

const workspaceModelObject = object({
  root: string(),
  turboVersion: string(),
  packageManager: packageManagerSchema,
  affectedMode: affectedModeSchema,
  packages: packageList,
  edges: edgeList,
  warnings: stringList
});

/** Spec §4.4's `WorkspaceModel`, field by field. */
export const workspaceModelSchema = readonly(workspaceModelObject);

const formatVersionSchema = literal(CACHE_FORMAT_VERSION);

const cacheFileObject = object({
  formatVersion: formatVersionSchema,
  key: nullableString,
  keyedPaths: stringList,
  model: workspaceModelSchema
});

/**
 * `<cacheDir>/workspace-<hash>.json`. `keyedPaths` are hashed again on every read, so `readCacheFile` also refuses one
 * outside the root (a check this layer cannot import).
 */
export const cacheFileSchema = readonly(cacheFileObject);
