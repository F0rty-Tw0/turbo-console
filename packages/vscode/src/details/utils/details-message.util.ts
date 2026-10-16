import type { DetailsState, TaskCard, WebviewMessage } from '@turbo-console/webview-ui';

import { webviewMessageSchema } from '../common/details-message.schema.ts';
import { DROPPED_MESSAGE_MAX, UNPRINTABLE_MESSAGE } from '../common/details.const.ts';
import type { CardTaskIds } from '../common/details.type.ts';

const NO_CARDS: CardTaskIds = { all: new Set(), notTurbo: new Set() };

const idOf = (card: TaskCard): string => card.taskId;

const isScript = (card: TaskCard): boolean => !card.isTurboTask;

/**
 * The task ids a message may name: the cards of `state`, and apart those of tasks no turbo config defines (they take
 * `stop` only); none while the panel has no state or the package is missing.
 */
export const cardTaskIdsOf = (state: DetailsState | null): CardTaskIds => {
  if (state?.kind !== 'package') return NO_CARDS;

  const all = new Set(state.tasks.map(idOf));
  const notTurbo = new Set(state.tasks.filter(isScript).map(idOf));
  const ids: CardTaskIds = { all, notTurbo };

  return ids;
};

/** Run and Copy have nothing to do on a script; Stop stays, so a run whose task became one can end (spec §4.12). */
const isAccepted = (type: string, taskId: string, ids: CardTaskIds): boolean => {
  const isKnown = ids.all.has(taskId);
  const isOnScript = ids.notTurbo.has(taskId);
  const isScriptCommand = type === 'run' || type === 'copy';
  const isRefused = isOnScript && isScriptCommand;

  return isKnown && !isRefused;
};

const acceptedMessage = (value: unknown, ids: CardTaskIds): WebviewMessage | null => {
  const parsed = webviewMessageSchema.safeParse(value);

  if (!parsed.success) return null;

  const message = parsed.data;

  if (!('taskId' in message)) return message;

  return isAccepted(message.type, message.taskId, ids) ? message : null;
};

/**
 * The webview is a trust boundary: a value that fails the schema, or a task message whose `taskId` is not exactly one of
 * the panel's own task ids (`Set.has`, never a prefix match), is `null`; so is a `run` or `copy` of a non-turbo task.
 * Pass empty sets while the panel has no state, so every task message is dropped. Never throws: `safeParse` rethrows a
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
