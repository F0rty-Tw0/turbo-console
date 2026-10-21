import type { CacheStatus, DryRunPhase, PackageDetails } from '../../bridge/common/details-state.type.ts';
import type { FieldValue } from '../common/details-page.type.ts';
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

/** A list field's value; an empty `inputs` means turbo's default (every file in the package). */
export const listValue = (values: string[], field: 'inputs' | 'other'): FieldValue => {
  const list: FieldValue = { kind: 'list', entries: values };
  const defaultInputs: FieldValue = { kind: 'empty', text: DEFAULT_INPUTS_TEXT };
  const none: FieldValue = { kind: 'empty', text: NONE_TEXT };

  if (values.length > 0) return list;

  if (field === 'inputs') return defaultInputs;

  return none;
};

export const cacheValue = (status: CacheStatus | null, phase: DryRunPhase): FieldValue => {
  const pending: FieldValue = { kind: 'empty', text: pendingText(phase) };

  if (status === null) return pending;

  const known: FieldValue = { kind: 'plain', text: CACHE_TEXTS[status], isCode: false };

  return known;
};

/** What a turbo card without a definition shows in its place; a script card has no definition rows. */
export const definitionValue = (command: string | null, phase: DryRunPhase): FieldValue => {
  const noCommand: FieldValue = { kind: 'plain', text: NO_COMMAND_TEXT, isCode: false };
  const pending: FieldValue = { kind: 'empty', text: pendingText(phase) };

  if (command === null) return noCommand;

  return pending;
};

/** A description worth a paragraph: `null` for none, and for one that is empty or only whitespace. */
export const descriptionText = (description: string | null): string | null => {
  if (description === null) return null;

  const trimmed = description.trim();

  if (trimmed === '') return null;

  return description;
};

export const plainValue = (text: string | null, isCode: boolean): FieldValue => {
  const none: FieldValue = { kind: 'empty', text: NONE_TEXT };

  if (text === null) return none;

  const plain: FieldValue = { kind: 'plain', text, isCode };

  return plain;
};

/**
 * Spec 1c-b §4.8 and §4.10: the hint a package with no card shows while scripts are hidden, here and in the host's
 * pickers; `count` is its offered scripts.
 */
export const hiddenScriptsText = (count: number): string => `No turbo tasks in this package. Show scripts to see ${count}.`;

/** What a package with no card shows: how many scripts the toggle hides, when it hides any, else that it has no task. */
export const noCardsText = (state: NoCardsSource): string => {
  const hidesScripts = !state.scriptsShown && state.hiddenScriptCount > 0;

  if (hidesScripts) return hiddenScriptsText(state.hiddenScriptCount);

  return NO_TASK_CARDS_TEXT;
};
