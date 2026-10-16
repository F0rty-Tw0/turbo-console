import type { RunView } from '../../bridge/common/details-state.type.ts';
import { elapsedText } from '../../bridge/utils/duration-text.util.ts';
import { COLOR_VAR_PATTERN, ICON_ID_PATTERN } from '../common/run-view.const.ts';

/** A running view's prefix and clock, `sinceReceivedMs` of page time added to the host's `elapsedMs`; else its text. */
export const runText = (run: RunView, sinceReceivedMs: number): string => {
  if (run.elapsedMs === null) return run.text;

  const elapsed = elapsedText(run.elapsedMs + sinceReceivedMs);

  return `${run.text} · ${elapsed}`;
};

/** `iconId` when it is a codicon id, else `null`; a host value that is not one never becomes a class. */
export const safeIconId = (iconId: string): string | null => {
  const isIconId = ICON_ID_PATTERN.test(iconId);

  if (!isIconId) return null;

  return iconId;
};

/** `colorVar` when it is a `--vscode-*` variable, else `null`; a host value that is not one never reaches `style`. */
export const safeColorVar = (colorVar: string | null): string | null => {
  if (colorVar === null) return null;

  const isColorVar = COLOR_VAR_PATTERN.test(colorVar);

  if (!isColorVar) return null;

  return colorVar;
};
