import type { HostMessage } from '@turbo-console/webview-ui';

import { logTextOf } from '../../shared/utils/log-text.util.ts';

/**
 * A `post` port that never throws and never leaves a rejection unhandled: a `send` that throws, or that rejects after
 * the webview is disposed, is logged instead. `log` must not throw.
 */
export const safePost = (
  send: (message: HostMessage) => PromiseLike<unknown>,
  log: (text: string) => void
): ((message: HostMessage) => void) => {
  const report = (error: unknown): void => {
    log(logTextOf(error));
  };
  const post = (message: HostMessage): void => {
    try {
      void Promise.resolve(send(message)).catch(report);
    } catch (error: unknown) {
      report(error);
    }
  };

  return post;
};
