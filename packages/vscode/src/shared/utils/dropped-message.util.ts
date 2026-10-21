import { DROPPED_MESSAGE_MAX, UNPRINTABLE_MESSAGE } from '../common/panel.const.ts';

/** The log text of a dropped message: its JSON cut to `DROPPED_MESSAGE_MAX`. Never throws, whatever the value holds. */
export const droppedMessageText = (value: unknown): string => {
  try {
    return JSON.stringify(value).slice(0, DROPPED_MESSAGE_MAX);
  } catch {
    return UNPRINTABLE_MESSAGE;
  }
};
