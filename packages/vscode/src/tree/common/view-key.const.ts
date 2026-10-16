/** The view key of a model while scripts are shown: live runs cannot change the shown set. */
export const SHOWN_KEY = 'shown';

/** The view key of a model while scripts are hidden and no live script can change the shown set. */
export const HIDDEN_KEY = 'hidden';

/** Joins a hidden key and the live script ids that matter to it. */
export const KEY_SEPARATOR = '\0';
