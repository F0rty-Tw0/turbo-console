import type { CacheStatus, DryRunPhase, TaskCard } from '../../bridge/common/details-state.type.ts';
import {
  CACHE_TEXTS,
  DEFAULT_INPUTS_TEXT,
  LOADING_TEXT,
  NONE_TEXT,
  NO_COMMAND_TEXT,
  UNAVAILABLE_TEXT
} from '../common/field-text.const.ts';

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

/** What a card shows in place of its turbo definition, or `null` when it has one to show. */
export const definitionText = (card: TaskCard, phase: DryRunPhase): string | null => {
  if (card.command === null) return NO_COMMAND_TEXT;

  if (card.definition !== null) return null;

  return pendingText(phase);
};
