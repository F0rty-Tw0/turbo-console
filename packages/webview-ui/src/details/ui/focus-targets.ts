import type { FocusTargets } from '../common/details-page.type.ts';

/** The focus key of the focused control, or `null` when focus is on none of `targets`. */
export const focusedKey = (targets: FocusTargets): string | null => {
  for (const [key, element] of targets) {
    if (element === document.activeElement) return key;
  }

  return null;
};

/** Focuses the control a new render registered under `key`, when it still exists. */
export const refocus = (targets: FocusTargets, key: string | null): void => {
  if (key === null) return;

  targets.get(key)?.focus();
};
