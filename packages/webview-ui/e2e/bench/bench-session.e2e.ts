import { expect, test } from '@playwright/test';

import { withSession } from './bench-session.ts';
import type { BenchSession } from './common/bench.type.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';

const THROW_LATER = "setTimeout(() => { throw new Error('bench page error'); }, 0)";

test.describe('FEATURE: bench session', () => {
  test('GIVEN a page error while the work runs, WHEN the work ends, THEN the session throws', async ({ browser }): Promise<void> => {
    const throwing = async (session: BenchSession): Promise<void> => {
      await session.page.evaluate(THROW_LATER);
      await session.page.evaluate(NEXT_FRAME);
    };

    await expect(withSession(browser, {}, throwing)).rejects.toThrow();
  });

  test('GIVEN work that raises no page error, WHEN the work ends, THEN the result returns', async ({ browser }): Promise<void> => {
    const work = async (session: BenchSession): Promise<number> => session.page.evaluate<number>('7');

    const result = await withSession(browser, {}, work);

    expect(result).toBe(7);
  });
});
