import { expect, test } from '@playwright/test';

import { coldOpen } from './bench-open.ts';
import { LAYOUT_SETTLE_MS } from '../common/graph.const.ts';
import { rejectionOf } from './test/utils/rejection.spec.util.ts';
import { targetLikeState } from '../test/utils/graph-target-like.spec.util.ts';

test.describe('FEATURE: bench cold open', () => {
  test('GIVEN a worker that crashes, a timed cold open throws after the full ELK settle time', async ({ browser }): Promise<void> => {
    const rejection = await test.step('WHEN a cold open is timed', async (): Promise<string | null> =>
      rejectionOf(coldOpen(browser, targetLikeState(), { workers: 'error' })));

    await test.step('THEN it throws once the ELK settle time runs out', (): void =>
      expect(rejection).toContain(`Timeout ${LAYOUT_SETTLE_MS}ms`));
  });
});
