import { recordPosted } from './posted-cap.ts';
import { safePost } from './safe-post.ts';
import type { EditorPanelView, WiredSession } from '../common/panel-view.type.ts';
import { logTextOf } from '../utils/log-text.util.ts';

/**
 * Binds a new panel's view to its session: the view's dispose runs `onClose`, a message goes to `receive` (a rejection
 * is logged), the session follows the view's visibility, and a throwing `start` is logged. A throw from the view
 * propagates, so the caller can dispose both. `log` must not throw.
 */
export const wirePanel = <TMessage>(
  view: EditorPanelView<TMessage>,
  session: WiredSession,
  onClose: () => void,
  log: (text: string) => void
): void => {
  const report = (error: unknown): void => {
    log(logTextOf(error));
  };

  view.onDispose(onClose);
  view.onMessage((value) => {
    void session.receive(value).catch(report);
  });
  session.setVisible(view.isVisible());
  view.onViewState(() => {
    session.setVisible(view.isVisible());
  });

  try {
    session.start();
  } catch (error: unknown) {
    report(error);
  }
};

/** A `post` port that records the message in `posted` (the last `POSTED_MAX` kept), then sends it without ever throwing. */
export const recordingPost = <TMessage>(
  send: (message: TMessage) => PromiseLike<unknown>,
  posted: TMessage[],
  log: (text: string) => void
): ((message: TMessage) => void) => {
  const sendSafely = safePost(send, log);
  const post = (message: TMessage): void => {
    recordPosted(posted, message);
    sendSafely(message);
  };

  return post;
};
