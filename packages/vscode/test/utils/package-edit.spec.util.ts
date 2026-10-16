import { readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import * as vscode from 'vscode';

import { manifestTree } from './tree-walk.spec.util.ts';
import type { ShownManifest } from '../common/launch.type.ts';

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject => {
  const isObject = typeof value === 'object' && value !== null;

  return isObject && !Array.isArray(value);
};

/** The first package by name that shows task `task`. */
export const firstPackageWith = (manifest: ShownManifest, task: string): string => {
  const { tasks } = manifestTree(manifest);
  const names = Object.keys(tasks).sort();
  const hasTask = (name: string): boolean => tasks[name]?.includes(`${name}#${task}`) ?? false;
  const name = names.find(hasTask);

  if (name === undefined) throw new Error(`the manifest has no package with a ${task} task`);

  return name;
};

/** The folder of the `package.json` under `root` whose `name` is `name`. */
export const packageDirOf = async (root: string, name: string): Promise<string> => {
  const pattern = new vscode.RelativePattern(root, '**/package.json');
  const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');

  for (const file of files) {
    const text = await readFile(file.fsPath, 'utf8');
    const manifest: unknown = JSON.parse(text);
    const isNamed = isJsonObject(manifest) && manifest['name'] === name;

    if (isNamed) return dirname(file.fsPath);
  }

  throw new Error(`no package.json under ${root} names ${name}`);
};

/** Writes `original`, the text of the JSON file at `file`, back to it with `edit` applied. */
export const writeEdited = async (file: string, original: string, edit: (manifest: JsonObject) => void): Promise<void> => {
  const manifest: unknown = JSON.parse(original);

  if (!isJsonObject(manifest)) throw new Error(`${file} is not a JSON object`);

  edit(manifest);

  const text = JSON.stringify(manifest, null, 2);

  await writeFile(file, `${text}\n`);
};

/** Sets script `task` of a parsed `package.json`; throws when it has no `scripts` object. */
export const setScript = (manifest: JsonObject, task: string, script: string): void => {
  const scripts = manifest['scripts'];

  if (!isJsonObject(scripts)) throw new Error('the package.json has no scripts');

  scripts[task] = script;
};

/** Adds task `task` with `config` to a parsed `turbo.json`; throws when it has no `tasks` object. */
export const addTask = (manifest: JsonObject, task: string, config: JsonObject): void => {
  const tasks = manifest['tasks'];

  if (!isJsonObject(tasks)) throw new Error('the turbo.json has no tasks');

  tasks[task] = config;
};

/** Sets `outputs` of task `task` in a parsed `turbo.json`; throws when it has no such task. */
export const setTaskOutputs = (manifest: JsonObject, task: string, outputs: string[]): void => {
  const tasks = manifest['tasks'];
  const config = isJsonObject(tasks) ? tasks[task] : undefined;

  if (!isJsonObject(config)) throw new Error(`the turbo.json has no ${task} task`);

  config['outputs'] = outputs;
};
