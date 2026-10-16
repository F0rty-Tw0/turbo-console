import type { CacheStatus, DryRunPhase, PackageDetails } from '../../bridge/common/details-state.type.ts';
import {
  CACHE_TEXTS,
  DEFAULT_INPUTS_TEXT,
  LOADING_TEXT,
  NONE_TEXT,
  NO_COMMAND_TEXT,
  NO_TASK_CARDS_TEXT,
  UNAVAILABLE_TEXT
} from '../common/field-text.const.ts';

type NoCardsSource = Pick<PackageDetails, 'scriptsShown' | 'hiddenScriptCount'>;

const pendingText = (phase: DryRunPhase): string => {
  if (phase === 'loading') return LOADING_TEXT;

  return UNAVAILABLE_TEXT;
};

/** A list field's text; an empty `inputs` means turbo's default (every file in the package). */
export const listText = (values: string[], field: 'inputs' | 'other'): string => {
  if (values.length > 0) return values.join(', ');

  if (field === 'inputs') return DEFAULT_INPUTS_TEXT;

  return NONE_TEXT;
};

export const cacheText = (status: CacheStatus | null, phase: DryRunPhase): string => {
  if (status !== null) return CACHE_TEXTS[status];

  return pendingText(phase);
};

/** What a turbo card without a definition shows in its place; a script card has no definition rows. */
export const definitionText = (command: string | null, phase: DryRunPhase): string => {
  if (command === null) return NO_COMMAND_TEXT;

  return pendingText(phase);
};

/**
 * Spec 1c-b §4.10: the hint a package with no card shows while scripts are hidden; `count` is its offered scripts. The
 * host keeps its own copy in `vscode/src/run/utils/picker-text.util.ts`; the two must be equal, since the webview cannot
 * import the host's.
 */
export const hiddenScriptsText = (count: number): string => `No turbo tasks in this package. Show scripts to see ${count}.`;

/** What a package with no card shows: how many scripts the toggle hides, when it hides any, else that it has no task. */
export const noCardsText = (state: NoCardsSource): string => {
  const hidesScripts = !state.scriptsShown && state.hiddenScriptCount > 0;

  if (hidesScripts) return hiddenScriptsText(state.hiddenScriptCount);

  return NO_TASK_CARDS_TEXT;
};
