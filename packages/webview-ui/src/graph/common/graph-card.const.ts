import { RUN_STATE_TEXT } from './graph-task.const.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';

/** The height of a plain task's status card. */
export const CARD_HEIGHT = 60;

/** The narrowest a status card gets. */
export const CARD_MIN_WIDTH = 180;

/** The width a card adds around its widest text row. */
export const CARD_PADDING_X = 24;

/** The line height of the two card label rows, as a multiple of the font size. */
export const CARD_LINE_HEIGHT = 1.4;

/** What row 2 of a card says when the task has no run. */
export const CARD_IDLE_TEXT = 'Not run';

/** Every word row 2 of a card can show; the widest sets the card width. */
const RUN_WORDS: string[] = RUN_STATES.map((state) => RUN_STATE_TEXT[state]);

export const CARD_STATE_WORDS: string[] = RUN_WORDS.concat(CARD_IDLE_TEXT);

/** The class of a plain task node drawn as a status card. */
export const TASK_CARD_CLASS = 'task-card';
