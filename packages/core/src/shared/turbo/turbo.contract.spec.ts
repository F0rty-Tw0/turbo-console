import { createHash } from 'node:crypto';

import { PRESETS, applyEdit } from '@turbo-console/repo-gen';
import type { FixtureHandle, FixtureSpec } from '@turbo-console/repo-gen';
import { beforeAll, describe, expect, it } from 'vitest';

import { affectedTasksSchema } from './common/affected-tasks.schema.ts';
import { dryRunSchema } from './common/dry-run.schema.ts';
import { packageGraphSchema } from './common/package-graph.schema.ts';
import { AFFECTED_TASKS_QUERY, PACKAGE_GRAPH_QUERY } from './common/turbo-query.const.ts';
import { SCHEMA_SDL_SHA256, SUPPORTED_TURBO_RANGE } from './common/turbo-version.const.ts';
import type { DryRun, PackageGraph, TurboResult } from './common/turbo.type.ts';
import { queryTurbo } from './data-access/query-turbo.ts';
import { runTurbo } from './data-access/run-turbo.ts';
import { devTurboPath } from './test/utils/dev-turbo.spec.util.ts';
import { fixtureHook } from './test/utils/fixture-hook.spec.util.ts';
import {
  leafPackage,
  manifestDependencyPairs,
  manifestTaskNames,
  packageTaskNames,
  packageWithRole
} from './test/utils/manifest.spec.util.ts';
import { commandTaskNames, commandlessTaskNames, graphEdgePairs, graphPackageNames } from './test/utils/package-graph.spec.util.ts';
import { optionalKeyPaths } from './test/utils/schema-strictness.spec.util.ts';
import { isSupportedTurboVersion } from './utils/turbo-version.util.ts';

const TURBO = devTurboPath();

const TARGET_LIKE = PRESETS['target-like'];

const NULL_HASH_TASK = 'lint';

const NONEXISTENT_COMMAND = '<NONEXISTENT>';

const AFFECTED_RANGE = { base: 'HEAD~1', head: 'HEAD' };

const REAL_REPO = process.env['TURBO_CONSOLE_REAL_REPO'] ?? '';

const COUNT_RULE_PRESETS: [string, FixtureSpec][] = [
  ['target-like', TARGET_LIKE],
  ['stretch-300', PRESETS['stretch-300']]
];

const parseGraph = (result: TurboResult): PackageGraph => {
  const json: unknown = JSON.parse(result.stdout);

  return packageGraphSchema.parse(json);
};

const parseDryRun = (result: TurboResult): DryRun => {
  const json: unknown = JSON.parse(result.stdout);

  return dryRunSchema.parse(json);
};

/** Appends a line to the leaf package's README.md, commits it as HEAD, and returns turbo's affected-tasks JSON. */
const affectedByLeafEdit = async (fixture: FixtureHandle): Promise<unknown> => {
  const leaf = leafPackage(fixture.manifest);

  await applyEdit(fixture.dir, [`${leaf.path}/README.md`]);
  const result = await queryTurbo(TURBO, AFFECTED_TASKS_QUERY, fixture.dir, { variables: AFFECTED_RANGE });
  const json: unknown = JSON.parse(result.stdout);

  return json;
};

const affectedTaskNames = (json: unknown): string[] => {
  const affected = affectedTasksSchema.parse(json);

  return affected.data.affectedTasks.items.map((task) => task.fullName);
};

const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');

describe('FEATURE: turbo CLI contract on generated fixtures', () => {
  describe('GIVEN a target-like fixture queried for its package graph (scenario 1)', () => {
    const fixture = fixtureHook(TARGET_LIKE);
    let result: TurboResult;

    beforeAll(async () => {
      result = await queryTurbo(TURBO, PACKAGE_GRAPH_QUERY, fixture().dir);
    });

    it('THEN turbo exits 0', () => {
      expect(result.exitCode).toBe(0);
    });

    it('THEN stderr is empty', () => {
      expect(result.stderr).toBe('');
    });

    it('THEN stdout is one JSON document with no banner in front of it', () => {
      const json: unknown = JSON.parse(result.stdout);

      expect(result.stdout.startsWith('{')).toBe(true);
      expect(json).toHaveProperty('version', expect.stringMatching(/^\d+\.\d+\.\d+/));
    });

    it('THEN stdout passes packageGraphSchema', () => {
      const json: unknown = JSON.parse(result.stdout);

      const parsed = packageGraphSchema.safeParse(json);

      expect(parsed.success).toBe(true);
    });

    it('THEN deleting any key packageGraphSchema lists makes it reject the output', () => {
      const json: unknown = JSON.parse(result.stdout);

      const optional = optionalKeyPaths(packageGraphSchema, json);

      expect(optional).toStrictEqual([]);
    });

    it('THEN every manifest phantom task is listed with command null', () => {
      const phantoms = manifestTaskNames(fixture().manifest, ['phantom']);

      const commandless = commandlessTaskNames(parseGraph(result));

      expect(phantoms.length).toBeGreaterThan(0);
      expect(commandless).toStrictEqual(expect.arrayContaining(phantoms));
    });

    it('WHEN fullName is renamed to full_name on one task THEN the schema rejects it (scenario 5)', () => {
      const renamed: unknown = JSON.parse(result.stdout.replace('"fullName":', '"full_name":'));

      const parsed = packageGraphSchema.safeParse(renamed);

      expect(parsed.success).toBe(false);
    });
  });

  describe('GIVEN a target-like fixture dry-run (scenario 2)', () => {
    const fixture = fixtureHook(TARGET_LIKE);

    describe('WHEN build lint typecheck run dry', () => {
      let result: TurboResult;

      beforeAll(async () => {
        result = await runTurbo(TURBO, ['run', 'build', 'lint', 'typecheck', '--dry=json'], fixture().dir);
      });

      it('THEN exactly the manifest phantoms of those tasks show <NONEXISTENT>', () => {
        const isRequested = (name: string): boolean => /#(?:build|lint|typecheck)$/.test(name);
        const phantoms = manifestTaskNames(fixture().manifest, ['phantom']).filter(isRequested);

        const dryRun = parseDryRun(result);
        const nonexistent = dryRun.tasks.filter((task) => task.command === NONEXISTENT_COMMAND).map((task) => task.taskId);

        expect(phantoms.length).toBeGreaterThan(0);
        expect(nonexistent.toSorted()).toStrictEqual(phantoms);
      });

      it('THEN stderr is empty, so --skip-infer dropped the no-local-turbo warning', () => {
        expect(result.stderr).toBe('');
      });

      it('THEN deleting any key dryRunSchema lists makes it reject the output, except the optional task package', () => {
        const json: unknown = JSON.parse(result.stdout);

        const optional = optionalKeyPaths(dryRunSchema, json);

        expect(optional).toStrictEqual(['tasks.0.package']);
      });
    });

    it('WHEN build runs dry filtered to one package THEN the output parses and lists that package build', async () => {
      const leaf = leafPackage(fixture().manifest);

      const result = await runTurbo(TURBO, ['run', 'build', `--filter=${leaf.name}`, '--dry=json'], fixture().dir);

      const taskIds = parseDryRun(result).tasks.map((task) => task.taskId);

      expect(taskIds).toContain(`${leaf.name}#build`);
    });

    it('WHEN e2e-ci runs dry on the atom test package THEN every carrier has a string hash', async () => {
      const atomTest = packageWithRole(fixture().manifest, 'atom-test');
      const carriers = manifestTaskNames(fixture().manifest, ['carrier']).filter((name) => name.startsWith(`${atomTest.name}#`));

      const result = await runTurbo(TURBO, ['run', 'e2e-ci', `--filter=${atomTest.name}`, '--dry=json'], fixture().dir);

      const listed = parseDryRun(result).tasks.filter((task) => carriers.includes(task.taskId));
      const listedIds = listed.map((task) => task.taskId);
      const hashes = listed.map((task) => typeof task.hash);

      expect(carriers.length).toBeGreaterThan(0);
      expect(listedIds.toSorted()).toStrictEqual(carriers);
      expect(hashes).toStrictEqual(carriers.map(() => 'string'));
    });
  });

  describe('GIVEN a leaf README edit committed as HEAD (scenario 4)', () => {
    describe('WHEN affectedUsingTaskInputs is on', () => {
      const fixture = fixtureHook(TARGET_LIKE);
      let json: unknown;
      let affected: string[] = [];

      beforeAll(async () => {
        json = await affectedByLeafEdit(fixture());
        affected = affectedTaskNames(json);
      });

      it('THEN the leaf build is listed', () => {
        const leaf = leafPackage(fixture().manifest);

        expect(affected).toContain(`${leaf.name}#build`);
      });

      it('THEN the leaf test, whose inputs are src/** only, is not listed', () => {
        const leaf = leafPackage(fixture().manifest);

        expect(affected).not.toContain(`${leaf.name}#test`);
      });

      it('THEN deleting any key affectedTasksSchema lists makes it reject the output', () => {
        const optional = optionalKeyPaths(affectedTasksSchema, json);

        expect(optional).toStrictEqual([]);
      });
    });

    describe('WHEN affectedUsingTaskInputs is off', () => {
      const fixture = fixtureHook({ ...TARGET_LIKE, affectedUsingTaskInputs: false });

      it('THEN every non-phantom leaf task is listed (verify-first V7: the flag is honoured)', async () => {
        const leaf = leafPackage(fixture().manifest);
        const leafTasks = packageTaskNames(fixture().manifest, leaf.name);

        const affected = affectedTaskNames(await affectedByLeafEdit(fixture()));

        expect(leafTasks).toContain(`${leaf.name}#test`);
        expect(affected).toStrictEqual(expect.arrayContaining(leafTasks));
      });
    });
  });

  describe('GIVEN the turbo binary (scenario 6)', () => {
    const fixture = fixtureHook(TARGET_LIKE);

    it('WHEN asked for its version THEN it is inside SUPPORTED_TURBO_RANGE', async () => {
      const result = await runTurbo(TURBO, ['--version'], fixture().dir);

      const isSupported = isSupportedTurboVersion(result.stdout.trim(), SUPPORTED_TURBO_RANGE);

      expect(isSupported).toBe(true);
    });

    it('WHEN asked for its query schema THEN the LF-normalised sha256 equals SCHEMA_SDL_SHA256', async () => {
      const result = await runTurbo(TURBO, ['query', '--schema'], fixture().dir);

      const hash = sha256(result.stdout.replaceAll('\r\n', '\n'));

      expect(hash).toBe(SCHEMA_SDL_SHA256);
    });
  });

  describe(`GIVEN a target-like fixture whose ${NULL_HASH_TASK} task has a JIT input (scenario 7, verify-first V4)`, () => {
    const fixture = fixtureHook({ ...TARGET_LIKE, nullHashTask: NULL_HASH_TASK });

    it(`WHEN ${NULL_HASH_TASK} and build run dry THEN every ${NULL_HASH_TASK} hash is null and every build hash is a string`, async () => {
      const result = await runTurbo(TURBO, ['run', NULL_HASH_TASK, 'build', '--dry=json'], fixture().dir);

      const dryRun = parseDryRun(result);
      const jitHashes = dryRun.tasks.filter((task) => task.task === NULL_HASH_TASK).map((task) => task.hash);
      const buildHashes = dryRun.tasks.filter((task) => task.task === 'build').map((task) => typeof task.hash);

      expect(jitHashes.length).toBeGreaterThan(0);
      expect(jitHashes).toStrictEqual(jitHashes.map(() => null));
      expect(buildHashes).toStrictEqual(buildHashes.map(() => 'string'));
    });
  });

  describe.each(COUNT_RULE_PRESETS)('GIVEN a %s fixture package graph (scenario 8, count rule)', (_name, spec) => {
    const fixture = fixtureHook(spec);
    let graph: PackageGraph;

    beforeAll(async () => {
      const result = await queryTurbo(TURBO, PACKAGE_GRAPH_QUERY, fixture().dir);

      graph = parseGraph(result);
    });

    it('THEN turbo lists exactly the manifest packages', () => {
      const names = fixture().manifest.packages.map((pkg) => pkg.name);

      expect(graphPackageNames(graph)).toStrictEqual(names.toSorted());
    });

    it('THEN the tasks with a command are exactly the manifest tasks, atom files and carriers', () => {
      const expected = manifestTaskNames(fixture().manifest, ['task', 'atom-file', 'carrier']);

      expect(commandTaskNames(graph)).toStrictEqual(expected);
    });

    it('THEN umbrellas, aggregates and phantoms are listed with command and script null (verify-first V5)', () => {
      const expected = manifestTaskNames(fixture().manifest, ['umbrella', 'aggregate', 'phantom']);

      expect(commandlessTaskNames(graph)).toStrictEqual(expected);
    });

    it('THEN the package edges are exactly the manifest dependencies, dependent as source', () => {
      const expected = manifestDependencyPairs(fixture().manifest);

      expect(expected.length).toBeGreaterThan(0);
      expect(graphEdgePairs(graph)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a task name no package defines', () => {
    const fixture = fixtureHook(TARGET_LIKE);

    it('WHEN it is run THEN runTurbo resolves with a non-zero exit code', async () => {
      const result = await runTurbo(TURBO, ['run', 'no-such-task'], fixture().dir);

      expect(result.exitCode).not.toBe(0);
    });
  });
});

describe.skipIf(REAL_REPO === '')('FEATURE: turbo CLI contract on the repo at TURBO_CONSOLE_REAL_REPO', () => {
  it('WHEN its package graph is queried THEN stdout passes packageGraphSchema (scenario 1)', async () => {
    const result = await queryTurbo(TURBO, PACKAGE_GRAPH_QUERY, REAL_REPO);

    expect(result.exitCode).toBe(0);

    const json: unknown = JSON.parse(result.stdout);
    const parsed = packageGraphSchema.safeParse(json);

    expect(parsed.success).toBe(true);
  });

  it('WHEN build runs dry on the whole repo THEN stdout passes dryRunSchema (scenario 2)', async () => {
    const result = await runTurbo(TURBO, ['run', 'build', '--dry=json'], REAL_REPO);

    expect(result.exitCode).toBe(0);

    const json: unknown = JSON.parse(result.stdout);
    const parsed = dryRunSchema.safeParse(json);

    expect(parsed.success).toBe(true);
  });

  it('WHEN turbo reports its version THEN it is inside SUPPORTED_TURBO_RANGE (scenario 6)', async () => {
    const result = await runTurbo(TURBO, ['--version'], REAL_REPO);

    expect(result.exitCode).toBe(0);

    const isSupported = isSupportedTurboVersion(result.stdout.trim(), SUPPORTED_TURBO_RANGE);

    expect(isSupported).toBe(true);
  });
});
