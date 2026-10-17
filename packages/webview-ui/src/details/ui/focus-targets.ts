import type { FocusTargets } from '../common/details-page.type.ts';

/** The focus key of the focused control, or `null` when focus is on none of `targets`. */
export const focusedKey = (targets: FocusTargets): string | null => {
  for (const [key, element] of targets) {
    if (element === document.activeElement) return key;
  }

  return null;
};

/**
 * Focuses the control a new render registered under `key`; when that control is gone (a kept script card that stopped),
 * focuses the page title instead, so focus never falls to the page body.
 */
export const refocus = (targets: FocusTargets, key: string | null): void => {
  if (key === null) return;

  const target = targets.get(key) ?? targets.get('title');

  target?.focus();
};
