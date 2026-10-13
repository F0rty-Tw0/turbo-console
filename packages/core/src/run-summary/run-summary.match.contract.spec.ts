import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import type { ManifestTask } from '@turbo-console/repo-gen';
import { beforeAll, describe, expect, it } from 'vitest';

import type { RunMatch, RunToMatch } from './common/run-match.type.ts';
import { matchRunSummary } from './domain-logic/match-run-summary.ts';
import { readNewestRunSummary } from './domain-logic/read-newest-run-summary.ts';
import { runCommandOf } from './utils/run-match.util.ts';
import { turboRunArgs } from '../run-args/utils/run-args.util.ts';
import type { RunSummary } from '../shared/turbo/common/turbo.type.ts';
import { runTurbo } from '../shared/turbo/data-access/run-turbo.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { fixtureHook } from '../shared/turbo/test/utils/fixture-hook.spec.util.ts';
import { leafPackage } from '../shared/turbo/test/utils/manifest.spec.util.ts';
import type { TaskNode } from '../workspace/common/workspace-model.type.ts';

const TURBO = devTurboPath();

const TARGET_LIKE = PRESETS['target-like'];

const SPACED_NAME = 'my task';

/** A task whose script exits 3. */
const FAILING_NAME = 'fail-3';

/** A task that depends on `FAILING_NAME`, so it never runs. */
const DEPENDENT_NAME = 'after-fail';

const SCRIPTS_ANCHOR = '"scripts": {';

const TASKS_ANCHOR = '"tasks": {';

const TASK_BASE: TaskNode = {
  id: '',
  name: '',
  command: null,
  description: null,
  tags: [],
  dependencies: [],
  kind: 'task',
  atom: null
};

/** Inserts `entry` as the first member of the object that opens with `anchor` in `file`; throws when `anchor` is absent. */
const insertMember = async (file: string, anchor: string, entry: string): Promise<void> => {
  const text = await readFile(file, 'utf8');
  const hasAnchor = text.includes(anchor);

  if (!hasAnchor) throw new Error(`no ${anchor} in ${file}`);

  await writeFile(file, text.replace(anchor, `${anchor}\n${entry},`));
};

/** Runs `task` of `packageName` in `dir` between two clock reads. */
const runOf = async (dir: string, task: TaskNode, packageName: string): Promise<RunToMatch> => {
  const launchedAt = Date.now();
  const result = await runTurbo(TURBO, turboRunArgs(task, packageName).slice(1), dir);
  const endedAt = Date.now();
  const run: RunToMatch = { task, packageName, launchedAt, endedAt, exitCode: result.exitCode };

  return run;
};

/** Runs `task` of `packageName` in `dir`, then asks for the match of that run. */
const runAndMatch = async (dir: string, task: TaskNode, packageName: string): Promise<RunMatch | null> => {
  const run = await runOf(dir, task, packageName);

  return matchRunSummary(dir, run);
};

const buildOf = (packageName: string): TaskNode => {
  const task: TaskNode = { ...TASK_BASE, id: `${packageName}#build`, name: 'build' };

  return task;
};

/** Atom kinds of the fixture manifest and the task kind the workspace model gives each. */
const ATOM_KINDS = { 'atom-file': 'atom-file', aggregate: 'atom-aggregate', umbrella: 'atom-umbrella' } as const;

type AtomKind = keyof typeof ATOM_KINDS;

/** Runs the first manifest task of `kind` in `dir` for its package, then asks for the match of that run. */
const runFirstAtom = async (dir: string, tasks: ManifestTask[], kind: AtomKind): Promise<RunMatch | null> => {
  const manifestTask = tasks.find((task) => task.kind === kind);

  if (manifestTask === undefined) throw new Error(`manifest has no ${kind} task`);

  const task: TaskNode = { ...TASK_BASE, id: manifestTask.fullName, name: manifestTask.taskName, kind: ATOM_KINDS[kind] };

  return runAndMatch(dir, task, manifestTask.packageName);
};

describe('FEATURE: run summary match contract on generated fixtures', () => {
  describe('GIVEN a target-like fixture whose leaf package builds twice with turboRunArgs', () => {
    const fixture = fixtureHook(TARGET_LIKE);
    let first: RunMatch | null = null;
    let second: RunMatch | null = null;

    beforeAll(async () => {
      const leafName = leafPackage(fixture().manifest).name;
      const task = buildOf(leafName);

      first = await runAndMatch(fixture().dir, task, leafName);
      second = await runAndMatch(fixture().dir, task, leafName);
    });

    it('THEN the first run is a cache MISS with a duration', () => {
      expect(first).toMatchObject({ cache: 'MISS' });
      expect(first?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('THEN the same run again is a cache HIT, matched apart from the first summary', () => {
      expect(second).toMatchObject({ cache: 'HIT' });
      expect(second?.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GIVEN a target-like fixture whose first umbrella task runs for its package', () => {
    const fixture = fixtureHook(TARGET_LIKE);
    let match: RunMatch | null = null;

    beforeAll(async () => {
      match = await runFirstAtom(fixture().dir, fixture().manifest.tasks, 'umbrella');
    });

    it('THEN the match has no cache status, since turbo records no entry of its own for it', () => {
      expect(match).toMatchObject({ cache: null });
      expect(match?.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GIVEN a target-like fixture whose first aggregate task runs for its package', () => {
    const fixture = fixtureHook(TARGET_LIKE);
    let match: RunMatch | null = null;

    beforeAll(async () => {
      match = await runFirstAtom(fixture().dir, fixture().manifest.tasks, 'aggregate');
    });

    it('THEN the match has no cache status, since turbo records no entry of its own for it', () => {
      expect(match).toMatchObject({ cache: null });
      expect(match?.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GIVEN a target-like fixture whose first atom file task runs for its package', () => {
    const fixture = fixtureHook(TARGET_LIKE);
    let match: RunMatch | null = null;

    beforeAll(async () => {
      match = await runFirstAtom(fixture().dir, fixture().manifest.tasks, 'atom-file');
    });

    it('THEN its own entry gives the match a cache status', () => {
      expect(match).toMatchObject({ cache: 'MISS' });
      expect(match?.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GIVEN a target-like fixture with a task whose name has a space', () => {
    const fixture = fixtureHook(TARGET_LIKE);
    let match: RunMatch | null = null;

    beforeAll(async () => {
      const leaf = leafPackage(fixture().manifest);

      await insertMember(join(fixture().dir, 'turbo.json'), TASKS_ANCHOR, `    "${SPACED_NAME}": {}`);
      await insertMember(join(fixture().dir, leaf.path, 'package.json'), SCRIPTS_ANCHOR, `    "${SPACED_NAME}": "node -e 0"`);

      const task: TaskNode = { ...TASK_BASE, id: `${leaf.name}#${SPACED_NAME}`, name: SPACED_NAME };

      match = await runAndMatch(fixture().dir, task, leaf.name);
    });

    it('THEN turbo writes the name verbatim into the summary command, so the run matches', () => {
      expect(match).toMatchObject({ cache: 'MISS' });
    });
  });

  describe(`GIVEN a target-like fixture whose leaf runs ${FAILING_NAME}, which exits 3, and ${DEPENDENT_NAME}, which depends on it`, () => {
    const fixture = fixtureHook(TARGET_LIKE);
    let failingExit = 0;
    let failingMatch: RunMatch | null = null;
    let dependentExit = 0;
    let dependentId = '';
    let dependentCommand = '';
    let dependentMatch: RunMatch | null = null;
    let dependentSummary: RunSummary | null = null;

    beforeAll(async () => {
      const { dir, manifest } = fixture();
      const leaf = leafPackage(manifest);
      const failingTask: TaskNode = { ...TASK_BASE, id: `${leaf.name}#${FAILING_NAME}`, name: FAILING_NAME };
      const dependentTask: TaskNode = { ...TASK_BASE, id: `${leaf.name}#${DEPENDENT_NAME}`, name: DEPENDENT_NAME };
      const turboJson = join(dir, 'turbo.json');
      const packageJson = join(dir, leaf.path, 'package.json');

      await insertMember(turboJson, TASKS_ANCHOR, `    "${FAILING_NAME}": {}`);
      await insertMember(turboJson, TASKS_ANCHOR, `    "${DEPENDENT_NAME}": { "dependsOn": ["${FAILING_NAME}"] }`);
      await insertMember(packageJson, SCRIPTS_ANCHOR, `    "${FAILING_NAME}": "node -e \\"process.exit(3)\\""`);
      await insertMember(packageJson, SCRIPTS_ANCHOR, `    "${DEPENDENT_NAME}": "node -e 0"`);

      const failing = await runOf(dir, failingTask, leaf.name);

      failingExit = failing.exitCode;
      failingMatch = await matchRunSummary(dir, failing);

      const dependent = await runOf(dir, dependentTask, leaf.name);

      dependentExit = dependent.exitCode;
      dependentId = dependentTask.id;
      dependentCommand = runCommandOf(dependent);
      dependentMatch = await matchRunSummary(dir, dependent);
      dependentSummary = await readNewestRunSummary(dir);
    });

    it(`THEN the ${FAILING_NAME} run ends with exit 3 and matches its summary as a cache MISS`, () => {
      expect(failingExit).toBe(3);
      expect(failingMatch).toMatchObject({ cache: 'MISS' });
    });

    it(`THEN the ${DEPENDENT_NAME} run fails in its dependency, whose summary has no entry for it, so it is unmatched`, () => {
      const taskIds = dependentSummary?.tasks.map((task) => task.taskId);

      expect(dependentExit).not.toBe(0);
      expect(dependentSummary?.execution.command).toBe(dependentCommand);
      expect(taskIds).not.toContain(dependentId);
      expect(dependentMatch).toBeNull();
    });
  });
});
