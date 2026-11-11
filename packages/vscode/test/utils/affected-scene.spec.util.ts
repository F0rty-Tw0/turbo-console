import { descriptionIfAny, packageOfTask } from './prediction-scene.spec.util.ts';
import { WAIT_LIMIT_MS, sleep } from './suite-env.spec.util.ts';
import { manifestTree, packageNodeNamed } from './tree-walk.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { WORD_CHANGED, WORD_DEPENDENCY } from '../common/affected.const.ts';
import type { AffectedMarkKind, AffectedScene } from '../common/affected.type.ts';
import type { ShownTask } from '../common/launch.type.ts';

type ExpectedMarks = Map<string, AffectedMarkKind>;

const POLL_MS = 100;

const WORD_PART = 'affected';

const NO_WORD = 'no affected word';

const SEPARATOR = ' · ';

/** How many mismatches a settle failure lists before it counts the rest. */
const LISTED_MISMATCHES = 10;

const WORDS: Readonly<Record<AffectedMarkKind, string>> = { changed: WORD_CHANGED, dependency: WORD_DEPENDENCY };

/** Whether a row description carries any affected word; both words hold this part. */
export const hasAffectedWord = (description: string): boolean => description.includes(WORD_PART);

/** Polls the Packages view's description until it reads `text`; throws with the last read after `WAIT_LIMIT_MS`. */
export const waitForDescription = async (api: TurboConsoleApi, text: string): Promise<void> => {
  const deadline = performance.now() + WAIT_LIMIT_MS;
  let read = api.treeDescription();

  while (read !== text) {
    const now = performance.now();
    const isLate = now > deadline;

    if (isLate) throw new Error(`the view description read "${read}", not "${text}", after ${WAIT_LIMIT_MS} ms`);

    await sleep(POLL_MS);
    read = api.treeDescription();
  }
};

/** The affected queries spawned since the last counter reset, each as its `spawnargs`. */
export const queriesOf = (scene: AffectedScene): string[][] => scene.counter.affectedQueries();

/** Every shown task row of every shown package, task id to its row description (`''` for none); umbrellas stay collapsed. */
export const taskWordsOf = async (scene: AffectedScene): Promise<Map<string, string>> => {
  const { api, manifest } = scene;
  const words = new Map<string, string>();

  for (const name of manifestTree(manifest).packages) {
    const node = await packageNodeNamed(api, name);
    const rows = await api.tree.getChildren(node);
    const taskRows = rows.filter((row) => row.kind === 'task');

    for (const row of taskRows) words.set(row.key, descriptionIfAny(api, row));
  }

  return words;
};

/** Every shown package row, package name to its row description (`''` for none). */
export const packageWordsOf = async (scene: AffectedScene): Promise<Map<string, string>> => {
  const { api, manifest } = scene;
  const words = new Map<string, string>();

  for (const name of manifestTree(manifest).packages) {
    const node = await packageNodeNamed(api, name);

    words.set(name, descriptionIfAny(api, node));
  }

  return words;
};

/** Every task and package row description that carries an affected word; `[]` when no row is marked. */
export const markedReadsOf = async (scene: AffectedScene): Promise<string[]> => {
  const taskWords = await taskWordsOf(scene);
  const packageWords = await packageWordsOf(scene);
  const taskReads = Array.from(taskWords.values());
  const packageReads = Array.from(packageWords.values());
  const reads = [...taskReads, ...packageReads];

  return reads.filter(hasAffectedWord);
};

const isExactly = (read: string, wanted: string): boolean => read === wanted;

/** Whether `read` is the word alone or ends with it after the ` · ` join. */
export const endsWithWord = (read: string, wanted: string): boolean => {
  const isAlone = read === wanted;

  return isAlone || read.endsWith(`${SEPARATOR}${wanted}`);
};

const mismatchLine = (id: string, read: string, wanted: string): string => `${id}: read "${read}", wanted "${wanted}"`;

/** `null` when `read` is right for `wanted` (`undefined`: no word at all), else the mismatch line. */
const mismatchOf = (
  id: string,
  read: string,
  wanted: string | undefined,
  isRight: (read: string, wanted: string) => boolean
): string | null => {
  if (wanted === undefined) {
    const hasWord = hasAffectedWord(read);

    if (!hasWord) return null;

    return mismatchLine(id, read, NO_WORD);
  }

  const isRightRead = isRight(read, wanted);

  if (isRightRead) return null;

  return mismatchLine(id, read, wanted);
};

const isLine = (line: string | null): line is string => line !== null;

const wordOfMark = (mark: AffectedMarkKind | undefined): string | undefined => {
  if (mark === undefined) return undefined;

  return WORDS[mark];
};

/** The word a package row wants: `affected` when any of its expected tasks is `changed`, else `affected via dependency` for a `dependency` one. */
const packageWordOf = (name: string, expected: ExpectedMarks): string | undefined => {
  const entries = Array.from(expected);
  const ofPackage = entries.filter(([id]) => packageOfTask(id) === name);
  const marks = ofPackage.map(([, mark]) => mark);
  const hasChanged = marks.includes('changed');
  const hasDependency = marks.includes('dependency');

  if (hasChanged) return WORDS.changed;

  if (hasDependency) return WORDS.dependency;

  return undefined;
};

const isUmbrellaTask = (task: ShownTask): boolean => task.kind === 'umbrella';

const taskLinesOf = async (scene: AffectedScene, expected: ExpectedMarks): Promise<string[]> => {
  const words = await taskWordsOf(scene);
  const umbrellaTasks = scene.manifest.tasks.filter(isUmbrellaTask);
  const umbrellas = new Set(umbrellaTasks.map((task) => task.fullName));
  const lines: (string | null)[] = [];

  for (const [id, read] of words) {
    const wanted = wordOfMark(expected.get(id));
    const isRight = umbrellas.has(id) ? endsWithWord : isExactly;

    lines.push(mismatchOf(id, read, wanted, isRight));
  }

  for (const [id, mark] of expected) {
    const hasRow = words.has(id);

    if (!hasRow) lines.push(mismatchLine(id, 'no row', WORDS[mark]));
  }

  return lines.filter(isLine);
};

const packageLinesOf = async (scene: AffectedScene, expected: ExpectedMarks): Promise<string[]> => {
  const words = await packageWordsOf(scene);
  const lines: (string | null)[] = [];

  for (const [name, read] of words) lines.push(mismatchOf(name, read, packageWordOf(name, expected), endsWithWord));

  return lines.filter(isLine);
};

/**
 * Every way the shown rows differ from `expected`, one line each `id: read "<d>", wanted "<w>"`: a task row must read its
 * mark's word (an umbrella row ends with it), a row with no mark no `affected`; a package row ends with `affected` when
 * any of its expected tasks is `changed`, else with `affected via dependency` when any is `dependency`, else has none.
 */
export const rowMismatches = async (scene: AffectedScene, expected: ExpectedMarks): Promise<string[]> => {
  const taskLines = await taskLinesOf(scene, expected);
  const packageLines = await packageLinesOf(scene, expected);

  return [...taskLines, ...packageLines];
};

/** Polls `rowMismatches` until it is empty; throws with the last mismatches after `WAIT_LIMIT_MS`. */
export const settleRows = async (scene: AffectedScene, expected: ExpectedMarks): Promise<void> => {
  const deadline = performance.now() + WAIT_LIMIT_MS;
  let mismatches = await rowMismatches(scene, expected);

  while (mismatches.length > 0) {
    const now = performance.now();
    const isLate = now > deadline;
    const listed = mismatches.slice(0, LISTED_MISMATCHES).join('; ');

    if (isLate) throw new Error(`${mismatches.length} rows differ after ${WAIT_LIMIT_MS} ms: ${listed}`);

    await sleep(POLL_MS);
    mismatches = await rowMismatches(scene, expected);
  }
};
