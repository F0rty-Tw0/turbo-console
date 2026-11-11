import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { baseEditsOf } from './affected-edit-set.spec.util.ts';
import { expectedAffected } from './affected-oracle.spec.util.ts';
import {
  endsWithWord,
  hasAffectedWord,
  markedReadsOf,
  packageWordsOf,
  queriesOf,
  settleRows,
  taskWordsOf,
  waitForDescription
} from './affected-scene.spec.util.ts';
import { sleep, step } from './suite-env.spec.util.ts';
import { LABEL_PACKAGE, LABEL_TASK, SHOW_AFFECTED_COMMAND, WORD_CHANGED, WORD_DEPENDENCY } from '../common/affected.const.ts';
import type { AffectedScene, OracleMode } from '../common/affected.type.ts';
import type { ShownManifest, ShownPackage } from '../common/launch.type.ts';
import { QUIET_WINDOW_MS } from '../common/prediction.const.ts';

/** What `listCase` reads: turbo's level, the description that names it, and how many tasks seed 1 `target-like` lists in it (probed on turbo 2.11.7). */
type ListLevel = {
  readonly mode: OracleMode;
  readonly label: string;
  readonly size: number;
};

const TASK_LEVEL: ListLevel = { mode: 'task', label: LABEL_TASK, size: 23 };

const PACKAGE_LEVEL: ListLevel = { mode: 'package', label: LABEL_PACKAGE, size: 24 };

/**
 * Turns the toggle on, waits for the level's description, and checks the rows against the oracle for the README commit
 * and the leaf source edit: the oracle lists `size` tasks, every one reads its word, and no other task row has any.
 */
const listCase = async (scene: AffectedScene, level: ListLevel): Promise<Map<string, string>> => {
  const { api, manifest } = scene;

  await vscode.commands.executeCommand(SHOW_AFFECTED_COMMAND);
  await waitForDescription(api, level.label);

  const expected = expectedAffected(manifest, baseEditsOf(scene), level.mode);

  assert.equal(expected.size, level.size, `the oracle lists ${expected.size} tasks, turbo listed ${level.size} when probed`);
  await settleRows(scene, expected);

  const words = await taskWordsOf(scene);
  const entries = Array.from(words);
  const markedEntries = entries.filter(([, read]) => hasAffectedWord(read));
  const marked = markedEntries.map(([id]) => id).sort();
  const wanted = Array.from(expected.keys()).sort();

  assert.deepEqual(marked, wanted);

  return words;
};

/** Every package the leaf depends on, directly or not, from `ShownPackage.dependencies` alone; sorted. */
const upstreamOf = (manifest: ShownManifest, leaf: ShownPackage): string[] => {
  const byName = new Map(manifest.packages.map((pkg) => [pkg.name, pkg]));
  const found = new Set<string>();
  const queue = [...leaf.dependencies];

  for (const name of queue) {
    const isSeen = found.has(name);

    if (isSeen) continue;

    found.add(name);
    const dependencies = byName.get(name)?.dependencies ?? [];

    queue.push(...dependencies);
  }

  return Array.from(found).sort();
};

/**
 * The upstream packages of the leaf are affected only because an affected task needs them, so each reads `affected via
 * dependency` on its `build` row and on its package row, while the leaf's package row reads `affected`. This is the only
 * CI pin of turbo's text `required by an affected task`.
 */
const assertUpstreamRows = async (scene: AffectedScene): Promise<void> => {
  const { manifest, edits } = scene;
  const upstream = upstreamOf(manifest, edits.leaf);
  const taskWords = await taskWordsOf(scene);
  const packageWords = await packageWordsOf(scene);
  const leafRead = packageWords.get(edits.leaf.name) ?? '';

  assert.ok(upstream.length > 0, `${edits.leaf.name} has no upstream package`);

  for (const name of upstream) {
    const buildRead = taskWords.get(`${name}#build`);
    const packageRead = packageWords.get(name) ?? '';

    assert.equal(buildRead, WORD_DEPENDENCY, `${name}#build`);
    assert.ok(endsWithWord(packageRead, WORD_DEPENDENCY), `${name} package row read "${packageRead}"`);
  }

  assert.ok(endsWithWord(leafRead, WORD_CHANGED), `${edits.leaf.name} package row read "${leafRead}"`);
};

/** A3: with the toggle on in task mode, the README commit and the leaf edit mark exactly the oracle's 23 tasks; a README edit leaves the `src/**` test alone. */
export const affectedTaskListCase = async (scene: AffectedScene): Promise<void> => {
  const { readme, leaf } = scene.edits;

  await step('A3: task level lists the leaf and README packages, but not the README package test', async () => {
    const words = await listCase(scene, TASK_LEVEL);

    assert.equal(words.get(`${leaf.name}#build`), WORD_CHANGED);
    assert.equal(words.get(`${readme.name}#build`), WORD_CHANGED);
    assert.equal(hasAffectedWord(words.get(`${readme.name}#test`) ?? ''), false);
  });
};

/** A7b: the packages the leaf depends on read `affected via dependency` on their build and package rows. */
export const affectedUpstreamCase = async (scene: AffectedScene): Promise<void> => {
  await step('A7b: the leaf upstream reads affected via dependency', async () => assertUpstreamRows(scene));
};

/** A3p: with `affectedUsingTaskInputs` off the level is package, `readme#test` reads `affected` (24 tasks), and A7b holds. */
export const affectedPackageListCase = async (scene: AffectedScene): Promise<void> => {
  const { readme } = scene.edits;

  await step('A3p: package level lists the README package test too, and the upstream reads via dependency', async () => {
    const words = await listCase(scene, PACKAGE_LEVEL);

    assert.equal(words.get(`${readme.name}#test`), WORD_CHANGED);
    await assertUpstreamRows(scene);
  });
};

/** A7c: `TURBO_SCM_BASE=HEAD` and only committed changes: one query, a Loaded root with zero tasks, and no mark anywhere. */
export const affectedCommittedCase = async (scene: AffectedScene): Promise<void> => {
  const { api, counter } = scene;

  await step('A7c: TURBO_SCM_BASE=HEAD in the host env and only committed changes show no mark', async () => {
    counter.reset();
    await vscode.commands.executeCommand(SHOW_AFFECTED_COMMAND);
    await waitForDescription(api, LABEL_TASK);
    await sleep(QUIET_WINDOW_MS);

    const queries = queriesOf(scene);
    const marked = await markedReadsOf(scene);

    assert.equal(queries.length, 1, JSON.stringify(queries));
    assert.deepEqual(marked, []);
  });
};
