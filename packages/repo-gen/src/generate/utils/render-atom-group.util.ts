import { toJsonFile } from './json-file.util.ts';
import { atomPackages, carrierTaskName, fileTaskName } from './plan-atom-groups.util.ts';
import {
  ATOM_AGGREGATE_TASK,
  ATOM_TASK,
  ATOM_TASK_TAG,
  BASE_TASKS,
  CARRIER_TAG,
  DEFINITIONS_TAG,
  LIVE_TAG,
  NOOP_SCRIPT
} from '../common/fixture.const.ts';
import type { AtomGroupPlan, FixtureFile, SpecFile } from '../common/fixture.type.ts';

type AtomPackageJson = {
  readonly name: string;
  readonly private: true;
  readonly version: string;
  readonly scripts: Record<string, string> | undefined;
  readonly dependencies: Record<string, string> | undefined;
};

type UmbrellaTask = {
  readonly dependsOn: string[];
};

type TestTurboJson = {
  readonly extends: string[];
  readonly tasks: Record<string, UmbrellaTask>;
};

/** Keys in Atomizer §4 order; `undefined` keys are dropped by `JSON.stringify`. */
type DefinitionsTask = {
  readonly command: string[] | undefined;
  readonly dependsOn: string[] | undefined;
  readonly inputs: string[] | undefined;
  readonly cache: false | undefined;
  readonly tags: string[] | undefined;
};

type DefinitionsTurboJson = {
  readonly extends: string[];
  readonly tags: string[];
  readonly tasks: Record<string, DefinitionsTask>;
};

const NOOP_COMMAND = ['node', '-e', '0'];

const CONFIGURED_DEPENDS_ON = ['^build'];

const FILE_TASK_TAGS = [ATOM_TASK_TAG];

const LIVE_FILE_TASK_TAGS = [ATOM_TASK_TAG, LIVE_TAG];

const FILE_TASK_INPUTS = ['$TURBO_DEFAULT$', '!**/*.{spec,test}.{ts,tsx,js,jsx,mts,cts,mjs,cjs}', '!**/*-snapshots/**'];

const fileTask = (file: SpecFile): [string, DefinitionsTask] => {
  const dependsOn = [...CONFIGURED_DEPENDS_ON, carrierTaskName(file.path)];
  const cache = file.live ? false : undefined;
  const tags = file.live ? LIVE_FILE_TASK_TAGS : FILE_TASK_TAGS;
  const task: DefinitionsTask = { command: NOOP_COMMAND, dependsOn, inputs: FILE_TASK_INPUTS, cache, tags };

  return [fileTaskName(file.path), task];
};

const carrierTask = (file: SpecFile): [string, DefinitionsTask] => {
  const inputs = [file.path, `${file.path}-snapshots/**`];
  const task: DefinitionsTask = { command: NOOP_COMMAND, dependsOn: undefined, inputs, cache: undefined, tags: [CARRIER_TAG] };

  return [carrierTaskName(file.path), task];
};

/** A one-line Playwright spec, so `playwright test --list` (Atomizer `sync`) can load it. */
const toSpecFile = (packagePath: string, file: SpecFile): FixtureFile => {
  const name = file.path.slice('tests/'.length);
  const content = `import { test } from '@playwright/test'; test('${name}', () => {});\n`;
  const spec: FixtureFile = { path: `${packagePath}/${file.path}`, content };

  return spec;
};

/** UTF-16 code-unit order by task name (Atomizer §4), no locale. */
const compareEntries = ([left]: [string, DefinitionsTask], [right]: [string, DefinitionsTask]): number => {
  return Number(left > right) - Number(left < right);
};

const definitionsTurboJson = (group: AtomGroupPlan): DefinitionsTurboJson => {
  const perFile = group.specFiles.flatMap((file) => [fileTask(file), carrierTask(file)]);
  const sorted = perFile.toSorted(compareEntries);
  const fileTaskNames = group.specFiles.map((file) => fileTaskName(file.path));
  const aggregateDependsOn = fileTaskNames.toSorted();
  const aggregate: DefinitionsTask = {
    command: undefined,
    dependsOn: aggregateDependsOn,
    inputs: undefined,
    cache: undefined,
    tags: undefined
  };
  const tasks = Object.fromEntries([...sorted, [ATOM_AGGREGATE_TASK, aggregate]]);
  const turbo: DefinitionsTurboJson = { extends: ['//'], tags: [DEFINITIONS_TAG], tasks };

  return turbo;
};

/**
 * Both packages of an atom group, shaped like Atomizer spec §4 output with `node -e 0` commands.
 * The test package runs the base tasks, depends on its app and never gets an `e2e-ci` script (turbo would run it after the file tasks);
 * the definitions package has no scripts and holds every file task, carrier and the `e2e-ci--all` aggregate.
 */
export const renderAtomGroup = (group: AtomGroupPlan): FixtureFile[] => {
  const [test, definitions] = atomPackages(group);
  const scripts = Object.fromEntries(BASE_TASKS.map((task) => [task, NOOP_SCRIPT]));
  const dependencies = Object.fromEntries(test.dependencies.map((dependency) => [dependency, 'workspace:*']));
  const testManifest: AtomPackageJson = { name: test.name, private: true, version: '0.0.0', scripts, dependencies };
  const umbrella: UmbrellaTask = { dependsOn: [ATOM_AGGREGATE_TASK] };
  const testTasks = { [ATOM_TASK]: umbrella };
  const testTurbo: TestTurboJson = { extends: ['//', definitions.name], tasks: testTasks };
  const readme: FixtureFile = { path: `${test.path}/README.md`, content: `# ${test.name}\n` };
  const specFiles = group.specFiles.map((file) => toSpecFile(test.path, file));
  const definitionsManifest: AtomPackageJson = {
    name: definitions.name,
    private: true,
    version: '0.0.0',
    scripts: undefined,
    dependencies: undefined
  };

  return [
    toJsonFile(`${test.path}/package.json`, testManifest),
    toJsonFile(`${test.path}/turbo.json`, testTurbo),
    readme,
    ...specFiles,
    toJsonFile(`${definitions.path}/package.json`, definitionsManifest),
    toJsonFile(`${definitions.path}/turbo.json`, definitionsTurboJson(group))
  ];
};
