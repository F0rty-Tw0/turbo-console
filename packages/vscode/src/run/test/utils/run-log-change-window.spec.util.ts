import { vi } from 'vitest';

import { flush } from '../../../tree/test/utils/atom-load.spec.util.ts';
import { RUN_LOG_CHANGE_WINDOW_MS } from '../../common/run-log-tail.const.ts';

/** Fakes only the change window's timer: `flush` still waits on a real `setImmediate`. */
export const fakeChangeWindows = (): void => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
};

/** Ends every pending change window at once; the reads it starts have not settled yet. */
export const fireChangeWindow = (): void => {
  vi.advanceTimersByTime(RUN_LOG_CHANGE_WINDOW_MS);
};

/** Ends every pending change window and lets the reads it started settle. */
export const endChangeWindow = async (): Promise<void> => {
  fireChangeWindow();
  await flush();
};
