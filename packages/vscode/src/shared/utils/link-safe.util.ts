/**
 * A notification renders `[label](command:…)`, `[label](https:…)` and `[label](file:…)` as a clickable link, and opens it
 * with commands allowed, so repo text in a toast must not hold a label followed by a target. The space breaks the link
 * and keeps the text readable. A bare `[` stays: without `](` it forms no link. Call it after `cleanText`, so a hidden
 * character cannot sit between the two and be dropped later.
 */
export const linkSafe = (text: string): string => text.replaceAll('](', '] (');
