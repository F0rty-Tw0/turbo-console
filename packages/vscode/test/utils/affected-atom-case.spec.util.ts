import assert from 'node:assert/strict';

import { allEditsOf } from './affected-edit-set.spec.util.ts';
import { expectedAffected } from './affected-oracle.spec.util.ts';
import { endsWithWord } from './affected-scene.spec.util.ts';
import { descriptionIfAny } from './prediction-scene.spec.util.ts';
import { step } from './suite-env.spec.util.ts';
import { packageNodeNamed, walkTree } from './tree-walk.spec.util.ts';
import { WORD_DEPENDENCY } from '../common/affected.const.ts';
import type { AffectedScene } from '../common/affected.type.ts';
import type { ShownPackage, ShownTask } from '../common/launch.type.ts';

/** The package A4 reads and its umbrella task. */
type AtomTestScene = {
  readonly atomTest: ShownPackage;
  readonly umbrella: ShownTask;
};

/** A carrier task id holds this; turbo names a carrier in the affected list, the model does not, so no row may show one. */
const CARRIER_MARK = '-src--';

const isAtomTest = (pkg: ShownPackage): boolean => pkg.role === 'atom-test';

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

/**
 * A4: with the atom test package's dependency edited, the package shows no carrier row, its umbrella and build rows read
 * `affected via dependency` (a dependency, never `affected`), and none of the umbrella's file rows carries a word.
 */
export const affectedAtomCase = async (scene: AffectedScene): Promise<void> => {
  const { api, manifest } = scene;
  const { atomTest, umbrella } = atomTestOf(scene);

  await step('A4: an atom test package reads via dependency on its umbrella, shows no carrier and no file mark', async () => {
    const walked = await walkTree(api);
    const keys = walked.tasks[atomTest.name] ?? [];
    const carriers = keys.filter((key) => key.includes(CARRIER_MARK));
    const node = await packageNodeNamed(api, atomTest.name);
    const rows = await api.tree.getChildren(node);
    const umbrellaRow = rows.find((row) => row.key === umbrella.fullName);
    const buildRow = rows.find((row) => row.key === `${atomTest.name}#build`);

    assert.deepEqual(carriers, []);
    assert.ok(umbrellaRow !== undefined && buildRow !== undefined, `${atomTest.name} shows no umbrella or build row`);

    const umbrellaRead = descriptionIfAny(api, umbrellaRow);
    const fileRows = await api.tree.getChildren(umbrellaRow);
    const fileReads = fileRows.map((row) => descriptionIfAny(api, row));
    const marked = fileReads.filter((read) => read.includes('affected'));
    const oracle = expectedAffected(manifest, allEditsOf(scene), 'task');

    assert.ok(endsWithWord(umbrellaRead, WORD_DEPENDENCY), `umbrella row read "${umbrellaRead}"`);
    assert.equal(descriptionIfAny(api, buildRow), WORD_DEPENDENCY);
    assert.ok(fileRows.length > 0, `${umbrella.fullName} shows no file row`);
    assert.deepEqual(marked, []);
    assert.equal(oracle.get(umbrella.fullName), 'dependency');
  });
};
