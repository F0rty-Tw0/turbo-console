import type { DetailsState, TaskCard, TaskMessage, WebviewMessage } from '@turbo-console/webview-ui';

import { ALREADY_RUNNING_TEXT } from '../../run/common/run.const.ts';
import { webviewMessageSchema } from '../common/details-message.schema.ts';
import { DROPPED_MESSAGE_MAX, UNPRINTABLE_MESSAGE } from '../common/details.const.ts';
import type { CardTaskIds, CommandMessage } from '../common/details.type.ts';

const NO_CARDS: CardTaskIds = { all: new Set() };

const idOf = (card: TaskCard): string => card.taskId;

/** The task ids a message may name: the cards of `state`; none while the panel has no state or the package is missing. */
export const cardTaskIdsOf = (state: DetailsState | null): CardTaskIds => {
  if (state?.kind !== 'package') return NO_CARDS;

  const all = new Set(state.tasks.map(idOf));
  const ids: CardTaskIds = { all };

  return ids;
};

/**
 * The webview is a trust boundary: a value that fails the schema is `null`; only the keys the schema names survive.
 * Never throws: `safeParse` rethrows a throwing getter or proxy trap, which is `null` too. Task ids are checked apart, by
 * `checkedTaskMessage`, so a message that names no task never costs a state.
 */
export const parseWebviewMessage = (value: unknown): WebviewMessage | null => {
  try {
    const parsed = webviewMessageSchema.safeParse(value);

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/** Whether `message` names a task (Run, Stop or Copy), so it must be checked against the panel's card ids. */
export const isTaskMessage = (message: WebviewMessage | null): message is TaskMessage => message !== null && 'taskId' in message;

/**
 * `message`, unless it is a task message whose `taskId` is not exactly one of the panel's own task ids (`Set.has`, never
 * a prefix match). Pass an empty set while the panel has no state, so every task message is dropped.
 */
export const checkedTaskMessage = (message: WebviewMessage | null, ids: CardTaskIds): WebviewMessage | null => {
  if (!isTaskMessage(message)) return message;

  return ids.all.has(message.taskId) ? message : null;
};

/**
 * The text a Run is refused with, or `null` to let it run. While the root's binary failed, Run shows the banner's binary
 * text. While scripts are hidden, a script card shows only while its script runs, so its Run gets the already-running
 * text: a run that ends before the run command acts would otherwise relaunch the hidden script. Stop and Copy pass.
 */
export const refusedRunTextOf = (message: CommandMessage, state: DetailsState | null, isBinaryFailed: boolean): string | null => {
  const isRun = message.type === 'run' && state?.kind === 'package';

  if (!isRun) return null;

  if (isBinaryFailed && state.reloadError !== null) return state.reloadError;

  const card = state.tasks.find((task) => task.taskId === message.taskId);
  const isHiddenScript = !state.scriptsShown && card !== undefined && !card.isTurboTask;

  return isHiddenScript ? ALREADY_RUNNING_TEXT : null;
};

/** The log text of a dropped message: its JSON cut to `DROPPED_MESSAGE_MAX`. Never throws, whatever the value holds. */
export const droppedMessageText = (value: unknown): string => {
  try {
    return JSON.stringify(value).slice(0, DROPPED_MESSAGE_MAX);
  } catch {
    return UNPRINTABLE_MESSAGE;
  }
};
