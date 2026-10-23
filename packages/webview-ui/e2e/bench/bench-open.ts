import type { Browser } from '@playwright/test';
import { expect } from '@playwright/test';

import { withSession } from './bench-session.ts';
import type { BenchSession, ColdOpen } from './common/bench.type.ts';
import type { GraphReady, Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import { lastPositionsPosted, readPosted } from '../test/utils/graph-posted.spec.util.ts';

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
