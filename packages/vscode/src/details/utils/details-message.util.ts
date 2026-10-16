import type { DetailsState, TaskCard, WebviewMessage } from '@turbo-console/webview-ui';

import { webviewMessageSchema } from '../common/details-message.schema.ts';
import { DROPPED_MESSAGE_MAX, UNPRINTABLE_MESSAGE } from '../common/details.const.ts';
import type { CardTaskIds } from '../common/details.type.ts';

const NO_CARDS: CardTaskIds = { all: new Set() };

const idOf = (card: TaskCard): string => card.taskId;

/** The task ids a message may name: the cards of `state`; none while the panel has no state or the package is missing. */
export const cardTaskIdsOf = (state: DetailsState | null): CardTaskIds => {
  if (state?.kind !== 'package') return NO_CARDS;

  const all = new Set(state.tasks.map(idOf));
  const ids: CardTaskIds = { all };

  return ids;
};

const acceptedMessage = (value: unknown, ids: CardTaskIds): WebviewMessage | null => {
  const parsed = webviewMessageSchema.safeParse(value);

  if (!parsed.success) return null;

  const message = parsed.data;

  if (!('taskId' in message)) return message;

  return ids.all.has(message.taskId) ? message : null;
};

/**
 * The webview is a trust boundary: a value that fails the schema, or a task message whose `taskId` is not exactly one of
 * the panel's own task ids (`Set.has`, never a prefix match), is `null`.
 * Pass an empty set while the panel has no state, so every task message is dropped. Never throws: `safeParse` rethrows a
 * throwing getter or proxy trap, which is `null` too.
 */
export const parseWebviewMessage = (value: unknown, ids: CardTaskIds): WebviewMessage | null => {
  try {
    return acceptedMessage(value, ids);
  } catch {
    return null;
  }
};

/** The log text of a dropped message: its JSON cut to `DROPPED_MESSAGE_MAX`. Never throws, whatever the value holds. */
export const droppedMessageText = (value: unknown): string => {
  try {
    return JSON.stringify(value).slice(0, DROPPED_MESSAGE_MAX);
  } catch {
    return UNPRINTABLE_MESSAGE;
  }
};
