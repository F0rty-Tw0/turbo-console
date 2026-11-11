import assert from 'node:assert/strict';

import type { TaskKind } from '@turbo-console/repo-gen';

import { allEditsOf } from './affected-edit-set.spec.util.ts';
import { isAtomTest } from './affected-edits.spec.util.ts';
import { expectedAffected } from './affected-oracle.spec.util.ts';
import { endsWithWord, hasAffectedWord } from './affected-scene.spec.util.ts';
import { descriptionIfAny, packageOfTask } from './prediction-scene.spec.util.ts';
import { step } from './suite-env.spec.util.ts';
import { tooltipLinesOf } from './tree-polish-tree.spec.util.ts';
import { packageNodeNamed } from './tree-walk.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import { WORD_DEPENDENCY } from '../common/affected.const.ts';
import type { AffectedMarkKind, AffectedScene } from '../common/affected.type.ts';
import type { ShownPackage, ShownTask } from '../common/launch.type.ts';

/** The package A4 reads and its umbrella task. */
type AtomTestScene = {
  readonly atomTest: ShownPackage;
  readonly umbrella: ShownTask;
};

/** What a package row counts: every task of the model but the hidden file tasks, so an aggregate too. */
const COUNTED_KINDS: ReadonlySet<TaskKind> = new Set<TaskKind>(['task', 'umbrella', 'aggregate']);

/** The package row's tooltip line `Affected (<level>): N of M tasks (as of <clock>)`; group 1 is N. */
const PACKAGE_COUNT_LINE = /^Affected \([^)]+\): (\d+) of \d+ tasks /;

/** The first atom test package of the manifest and its umbrella task; throws naming the one the manifest lacks. */
const atomTestOf = (scene: AffectedScene): AtomTestScene => {
  const { packages, tasks } = scene.manifest;
  const atomTest = packages.find(isAtomTest);

  if (atomTest === undefined) throw new Error('the manifest has no atom test package');

  const isUmbrellaOfAtomTest = (task: ShownTask): boolean => task.kind === 'umbrella' && task.packageName === atomTest.name;
  const umbrella = tasks.find(isUmbrellaOfAtomTest);

  if (umbrella === undefined) throw new Error(`${atomTest.name} has no umbrella task`);

  const found: AtomTestScene = { atomTest, umbrella };

  return found;
};

/** The N of the package row's affected tooltip line; throws with every line when the row has none. */
const markedCountOf = (api: TurboConsoleApi, node: TreeNode): number => {
  const item = api.tree.getTreeItem(node);
  const lines = tooltipLinesOf(item);
  const counts = lines.flatMap((line) => PACKAGE_COUNT_LINE.exec(line)?.[1] ?? []);
  const count = counts.at(0);

  if (count === undefined) throw new Error(`no affected count line in ${lines.join(' | ')}`);

  return Number(count);
};

/** How many of the oracle's tasks belong to package `name`. */
const oracleCountOf = (oracle: ReadonlyMap<string, AffectedMarkKind>, name: string): number => {
  const ids = Array.from(oracle.keys());

  return ids.filter((id) => packageOfTask(id) === name).length;
};

/**
 * A4: with the atom test package's dependency edited, the package row counts exactly the oracle's tasks of that package
 * (a hidden file task counted toward it would raise N), its umbrella and build rows read `affected via dependency` (a
 * dependency, never `affected`), and none of the umbrella's file rows carries a word.
 */
export const affectedAtomCase = async (scene: AffectedScene): Promise<void> => {
  const { api, manifest } = scene;
  const { atomTest, umbrella } = atomTestOf(scene);

  await step('A4: an atom test package reads via dependency on its umbrella, counts the oracle tasks, no file mark', async () => {
    const edits = allEditsOf(scene);
    const oracle = expectedAffected(manifest, edits, 'task');
    const counted = expectedAffected(manifest, edits, 'task', COUNTED_KINDS);
    const node = await packageNodeNamed(api, atomTest.name);
    const rows = await api.tree.getChildren(node);
    const umbrellaRow = rows.find((row) => row.key === umbrella.fullName);
    const buildRow = rows.find((row) => row.key === `${atomTest.name}#build`);

    assert.equal(markedCountOf(api, node), oracleCountOf(counted, atomTest.name));
    assert.ok(umbrellaRow !== undefined && buildRow !== undefined, `${atomTest.name} shows no umbrella or build row`);

    const umbrellaRead = descriptionIfAny(api, umbrellaRow);
    const fileRows = await api.tree.getChildren(umbrellaRow);
    const fileReads = fileRows.map((row) => descriptionIfAny(api, row));
    const marked = fileReads.filter(hasAffectedWord);

    assert.ok(endsWithWord(umbrellaRead, WORD_DEPENDENCY), `umbrella row read "${umbrellaRead}"`);
    assert.equal(descriptionIfAny(api, buildRow), WORD_DEPENDENCY);
    assert.ok(fileRows.length > 0, `${umbrella.fullName} shows no file row`);
    assert.deepEqual(marked, []);
    assert.equal(oracle.get(umbrella.fullName), 'dependency');
  });
};
