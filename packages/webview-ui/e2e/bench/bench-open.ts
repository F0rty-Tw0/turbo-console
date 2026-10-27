import type { Browser } from '@playwright/test';
import { expect } from '@playwright/test';

import { withSession } from './bench-session.ts';
import { NOTHING_SAVED } from './common/bench.const.ts';
import type { BenchSession, ColdOpen } from './common/bench.type.ts';
import type { GraphReady, Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import { lastPositionsPosted, readPosted } from '../test/utils/graph-posted.spec.util.ts';
import { targetLikeHubSavedState, targetLikeTasksState } from '../test/utils/graph-target-like-tasks.spec.util.ts';
import { targetLikeState } from '../test/utils/graph-target-like.spec.util.ts';

const lastPositionsOf = async (session: BenchSession): Promise<Positions> => {
  const posted = async (): Promise<Positions | null> => lastPositionsPosted(await readPosted(session.page));

  await expect.poll(posted).not.toBeNull();

  return session.grouping.postedPositions();
};

/** Opens a fresh page, sends `state`, and times the first frame of its ELK layout; returns the positions the layout posted. */
export const coldOpen = async (browser: Browser, state: GraphReady, options: GraphOptions = {}): Promise<ColdOpen> => {
  const opened = async (session: BenchSession): Promise<ColdOpen> => {
    await session.host.sendState(state);
    await session.probe.expectLayoutEngine('elk');

    const firstFrameMs = await session.timings.measuredFirstFrameMs();
    const positions = await lastPositionsOf(session);
    const result: ColdOpen = { firstFrameMs, positions };

    return result;
  };

  return withSession(browser, options, opened);
};

export const coldFirstFrameMs = async (browser: Browser, state: GraphReady, options: GraphOptions = {}): Promise<number> => {
  const opened = await coldOpen(browser, state, options);

  return opened.firstFrameMs;
};

/** The first frame is read before the grouping is checked, so the check stays out of the timed span. */
const defaultOpened = async (session: BenchSession): Promise<number> => {
  await session.host.sendState(targetLikeState());
  await session.probe.expectLayoutEngine('elk');

  const firstFrameMs = await session.timings.measuredFirstFrameMs();

  await session.grouping.expectGrouped(true);

  return firstFrameMs;
};

/** First frame of the target-like graph's cold ELK layout opened with nothing saved, so grouped. */
export const targetLikeDefaultOpen = async (browser: Browser): Promise<number> => withSession(browser, NOTHING_SAVED, defaultOpened);

/** `state` carrying the positions its cold ELK layout posted, so `cachedOpen` takes the layout from the cache. */
export const cachedState = async (browser: Browser, state: GraphReady): Promise<GraphReady> => {
  const { positions } = await coldOpen(browser, state);
  const cached: GraphReady = { ...state, positions };

  return cached;
};

/** First frame of a `state` that carries `positions`, so the layout comes from the cache. */
export const cachedOpen = async (browser: Browser, state: GraphReady): Promise<number> => {
  const opened = async (session: BenchSession): Promise<number> => {
    await session.host.sendState(state);
    await session.probe.expectLayoutEngine('cache');

    return session.timings.measuredFirstFrameMs();
  };

  return withSession(browser, {}, opened);
};

const taskOpened = async (session: BenchSession): Promise<number> => {
  await session.host.sendState(targetLikeTasksState());
  await session.probe.expectLayoutEngine('elk');

  return session.timings.measuredFirstFrameMs();
};

/** First frame of the target-like task state opened in task mode with the hub task chosen; a task layout posts no positions, so only the probe says it is done. */
export const taskOpen = async (browser: Browser): Promise<number> =>
  withSession(browser, { savedState: targetLikeHubSavedState() }, taskOpened);
