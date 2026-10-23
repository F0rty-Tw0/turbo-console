import type { Browser } from '@playwright/test';
import { expect } from '@playwright/test';

import { withSession } from './bench-session.ts';
import type { BenchSession, ColdOpen } from './common/bench.type.ts';
import type { GraphReady, Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import { lastPositionsPosted, readPosted } from '../test/utils/graph-posted.spec.util.ts';

const firstFrameOf = async (session: BenchSession): Promise<number> => {
  await expect.poll(async (): Promise<number | null> => session.timings.firstFrameMs()).not.toBeNull();

  const ms = await session.timings.firstFrameMs();

  if (ms === null) throw new Error('bench: the first frame was not measured');

  return ms;
};

const lastPositionsOf = async (session: BenchSession): Promise<Positions> => {
  const posted = async (): Promise<Positions | null> => lastPositionsPosted(await readPosted(session.page));

  await expect.poll(posted).not.toBeNull();

  return session.grouping.postedPositions();
};

/** Opens a fresh page, sends `state`, and times its first frame; returns the positions the layout posted. */
export const coldOpen = async (browser: Browser, state: GraphReady, options: GraphOptions = {}): Promise<ColdOpen> => {
  const opened = async (session: BenchSession): Promise<ColdOpen> => {
    await session.host.sendState(state);

    const firstFrameMs = await firstFrameOf(session);
    const positions = await lastPositionsOf(session);
    const result: ColdOpen = { firstFrameMs, positions };

    return result;
  };

  return withSession(browser, options, opened);
};

/** First frame of a `state` that carries `positions`, so the layout comes from the cache. */
export const cachedOpen = async (browser: Browser, state: GraphReady): Promise<number> => {
  const opened = async (session: BenchSession): Promise<number> => {
    await session.host.sendState(state);
    await session.probe.expectLayoutEngine('cache');

    return firstFrameOf(session);
  };

  return withSession(browser, {}, opened);
};
