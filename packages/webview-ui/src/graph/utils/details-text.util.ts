import { pluralOf } from './plural.util.ts';
import type { ManifestEntry } from '../../bridge/common/graph-message.type.ts';
import { HINT_NUDGE_TEXT, MANIFEST_NAME, OPEN_DETAILS_LABEL, OPEN_MANIFEST_LABEL, ROOT_PATH_TEXT } from '../common/details.const.ts';
import type { CandidateKey } from '../common/details.type.ts';
import type { TraceDirection } from '../common/trace.type.ts';

type EntryPlace = Pick<ManifestEntry, 'field' | 'line'>;

type EntryText = Pick<ManifestEntry, 'key' | 'spec'>;

type EntryName = Pick<ManifestEntry, 'field' | 'key' | 'line'>;

/** `''` is the repo root. */
export const pathTextOf = (path: string): string => {
  if (path === '') return ROOT_PATH_TEXT;

  return path;
};

/** The package's manifest, relative to the repo root. */
export const manifestFileOf = (path: string): string => {
  if (path === '') return MANIFEST_NAME;

  return `${path}/${MANIFEST_NAME}`;
};

export const openDetailsLabelOf = (taskCount: number): string => {
  const tasks = pluralOf(taskCount, 'task', 'tasks');

  return `${OPEN_DETAILS_LABEL} · ${tasks}`;
};

export const dependenciesTitleOf = (count: number): string => `Direct dependencies (${count})`;

export const dependentsTitleOf = (count: number): string => `Direct dependents (${count})`;

/** A link always reads dependent → dependency. */
export const linkTitleOf = (source: string, target: string): string => `${source} → ${target}`;

export const explainLabelOf = (source: string, target: string): string => {
  const link = linkTitleOf(source, target);

  return `Explain ${link}`;
};

export const readingTextOf = (file: string): string => `Reading ${file}…`;

export const missingTextOf = (file: string, target: string): string => `${file} has no entry naming ${target}.`;

export const unreadableTextOf = (file: string): string => `Couldn't read ${file}.`;

/** `line` is 0-based; the text shows the editor's 1-based number. */
export const entryLabelOf = (entry: EntryPlace): string => `${entry.field}, line ${entry.line + 1}`;

export const entryRowTextOf = (entry: EntryText): string => `"${entry.key}": "${entry.spec}"`;

export const openAtLabelOf = (line: number): string => `Open at line ${line + 1}`;

export const openManifestLabelOf = (entry: EntryName): string => {
  return `${OPEN_MANIFEST_LABEL} at line ${entry.line + 1} (${entry.field}: ${entry.key})`;
};

export const pickingTitleOf = (start: string): string => `Trace from ${start}`;

/** A candidate group's title; `total` counts the group before the filter. */
export const candidateTitleOf = (key: CandidateKey, start: string, total: number): string => {
  switch (key) {
    case 'forward':
      return `${start} depends on (${total})`;
    case 'backward':
      return `Depends on ${start} (${total})`;
    case 'none':
      return `No dependency path (${total})`;
  }
};

export const stepsTextOf = (steps: number): string => pluralOf(steps, 'link', 'links');

/** The trace lead counts the packages on the path; the rail below names each one, dependent first. */
export const traceSummaryOf = (start: string, end: string, direction: TraceDirection, count: number): string => {
  const packages = pluralOf(count, 'package', 'packages');

  switch (direction) {
    case 'forward':
    case 'backward':
      return `${packages} on the shortest path.`;
    case 'none':
      return `No dependency path between ${start} and ${end}.`;
  }
};

/** After a link tap while picking, the hint nudges toward a package instead of naming the start. */
export const hintTextOf = (start: string, isNudged: boolean): string => {
  if (isNudged) return HINT_NUDGE_TEXT;

  return `Pick the end of the trace from ${start}`;
};
