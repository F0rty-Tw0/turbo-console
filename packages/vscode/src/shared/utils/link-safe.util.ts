import { cleanText } from './clean-text.util.ts';

/**
 * Repo text for a toast: cleaned to `max`, then with no label and target pair. A notification renders
 * `[label](command:…)`, `[label](https:…)` and `[label](file:…)` as a clickable link, and opens it with commands allowed;
 * the space in `] (` breaks the link and keeps the text readable. A bare `[` stays: without `](` it forms no link. The
 * order is load-bearing: cleaning first means a hidden character between `]` and `(` is gone before the pair is broken.
 */
export const toastText = (text: string, max: number): string => cleanText(text, max).replaceAll('](', '] (');
