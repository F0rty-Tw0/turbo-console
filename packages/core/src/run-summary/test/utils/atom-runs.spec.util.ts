import { readAtomFixture } from './atom-fixture.spec.util.ts';
import { writeRun } from './run-summary.spec.util.ts';
import { OLDEST, RUN_FIXTURES } from '../common/atom-results.const.ts';

/** Writes the first `count` fixtures to `<root>/.turbo/runs`, run `i` (1-based) `10 * i` seconds after `OLDEST`. */
export const writeAtomRuns = async (root: string, count: number): Promise<void> => {
  const chosen = RUN_FIXTURES.slice(0, count);

  for (const [index, fixture] of chosen.entries()) {
    await writeRun(root, `${fixture}.json`, readAtomFixture(fixture), OLDEST + 10 * (index + 1));
  }
};
