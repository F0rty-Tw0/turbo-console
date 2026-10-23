import { expect, test } from '@playwright/test';

import { withSession } from './bench-session.ts';
import type { BenchSession } from './common/bench.type.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import { rejectionOf } from './test/utils/rejection.spec.util.ts';

const THROW_LATER = "setTimeout(() => { throw new Error('bench page error'); }, 0)";

const throwing = async (session: BenchSession): Promise<void> => {
  await session.page.evaluate(THROW_LATER);
  await session.page.evaluate(NEXT_FRAME);
};

const work = async (session: BenchSession): Promise<number> => session.page.evaluate<number>('7');

test.describe('FEATURE: bench session', () => {
  test('GIVEN a page error while the work runs, the session throws once the work ends', async ({ browser }): Promise<void> => {
    const rejection = await test.step('WHEN the work runs in a session', async (): Promise<string | null> =>
      rejectionOf(withSession(browser, {}, throwing)));

    await test.step('THEN the session throws the page error', (): void => expect(rejection).toContain('bench page error'));
  });

  test('GIVEN work that raises no page error, the session returns its result', async ({ browser }): Promise<void> => {
    const result = await test.step('WHEN the work runs in a session', async (): Promise<number> => withSession(browser, {}, work));

    await test.step('THEN the work result returns', (): void => expect(result).toBe(7));
  });
});
