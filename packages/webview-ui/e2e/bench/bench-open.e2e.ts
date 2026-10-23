import { expect, test } from '@playwright/test';

import { coldOpen } from './bench-open.ts';
import { LAYOUT_SETTLE_MS } from '../common/graph.const.ts';
import { targetLikeState } from '../test/utils/graph-target-like.spec.util.ts';

test.describe('FEATURE: bench cold open', () => {
  test('GIVEN a worker that crashes, WHEN a cold open is timed, THEN it throws after waiting the full ELK settle time', async ({
    browser
  }): Promise<void> => {
    const opened = coldOpen(browser, targetLikeState(), { workers: 'error' });

    await expect(opened).rejects.toThrow(`Timeout ${LAYOUT_SETTLE_MS}ms`);
  });
});
