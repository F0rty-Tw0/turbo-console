import { readFile } from 'node:fs/promises';

import type { PackageRole, TaskKind } from '@turbo-console/repo-gen';

import { SUITE_ENV_KEY } from '../common/launch.const.ts';
import type { ShownManifest, ShownPackage, ShownTask, SuiteEnv } from '../common/launch.type.ts';

type JsonObject = Record<string, unknown>;

const PACKAGE_ROLES: Record<PackageRole, true> = { 'atom-definitions': true, 'atom-test': true, hub: true, regular: true };

const TASK_KINDS: Record<TaskKind, true> = {
  aggregate: true,
  'atom-file': true,
  carrier: true,
  phantom: true,
  task: true,
  umbrella: true
};

const isObject = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null;

const isString = (value: unknown): value is string => typeof value === 'string';

const isStringOrNull = (value: unknown): boolean => typeof value === 'string' || value === null;

const isPackageRole = (value: unknown): value is PackageRole => typeof value === 'string' && Object.hasOwn(PACKAGE_ROLES, value);

const isTaskKind = (value: unknown): value is TaskKind => typeof value === 'string' && Object.hasOwn(TASK_KINDS, value);

const isSuiteEnv = (value: unknown): value is SuiteEnv => {
  if (!isObject(value)) return false;

  const hasPaths = isStringOrNull(value['manifestFile']) && isStringOrNull(value['turboPath']);
  const hasFiles = typeof value['doneFile'] === 'string' && typeof value['missFile'] === 'string';

  return hasPaths && hasFiles && typeof value['budgetFactor'] === 'number';
};

const isShownPackage = (value: unknown): value is ShownPackage => {
  if (!isObject(value)) return false;

  const dependencies = value['dependencies'];
  const hasDependencies = Array.isArray(dependencies) && dependencies.every(isString);
  const tags = value['tags'];
  const hasTags = Array.isArray(tags) && tags.every(isString);
  const hasNames = typeof value['name'] === 'string' && typeof value['path'] === 'string';
  const hasLists = hasDependencies && hasTags;

  return hasNames && hasLists && isPackageRole(value['role']);
};

const isShownTask = (value: unknown): value is ShownTask => {
  if (!isObject(value)) return false;

  const hasNames = typeof value['fullName'] === 'string' && typeof value['packageName'] === 'string';
  const dependencies = value['dependencies'];
  const hasDependencies = Array.isArray(dependencies) && dependencies.every(isString);
  const hasLists = hasNames && hasDependencies;

  return hasLists && isTaskKind(value['kind']) && typeof value['visible'] === 'boolean';
};

const isShownManifest = (value: unknown): value is ShownManifest => {
  if (!isObject(value)) return false;

  const packages = value['packages'];
  const tasks = value['tasks'];
  const hasPackages = Array.isArray(packages) && packages.every(isShownPackage);
  const hasTasks = Array.isArray(tasks) && tasks.every(isShownTask);

  return hasPackages && hasTasks;
};

/** The harness's `SuiteEnv`, from `TURBO_CONSOLE_IT`; throws when it is missing or malformed. */
export const readSuiteEnv = (): SuiteEnv => {
  const raw = process.env[SUITE_ENV_KEY];

  if (raw === undefined) throw new Error(`${SUITE_ENV_KEY} is not set`);

  const env: unknown = JSON.parse(raw);

  if (!isSuiteEnv(env)) throw new Error(`${SUITE_ENV_KEY} is not a suite env: ${raw}`);

  return env;
};

/** The fields the suites read from the fixture manifest; throws when the launch has none or a field is malformed. */
export const readManifest = async (env: SuiteEnv): Promise<ShownManifest> => {
  if (env.manifestFile === null) throw new Error('this launch has no fixture manifest');

  const text = await readFile(env.manifestFile, 'utf8');
  const manifest: unknown = JSON.parse(text);

  if (!isShownManifest(manifest)) throw new Error(`${env.manifestFile} is not a fixture manifest`);

  return manifest;
};
