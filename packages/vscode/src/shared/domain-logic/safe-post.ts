import { logTextOf } from '../utils/log-text.util.ts';

/**
 * A `post` port that never throws and never leaves a rejection unhandled: a `send` that throws, or that rejects after
 * the webview is disposed, is logged instead. `log` must not throw.
 */
export const safePost = <TMessage>(
  send: (message: TMessage) => PromiseLike<unknown>,
  log: (text: string) => void
): ((message: TMessage) => void) => {
  const report = (error: unknown): void => {
    log(logTextOf(error));
  };
  const post = (message: TMessage): void => {
    try {
      void Promise.resolve(send(message)).catch(report);
    } catch (error: unknown) {
      report(error);
    }
  };

  return post;
};
