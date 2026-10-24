import type { AtomFile, AtomGroup, AtomResult } from '@turbo-console/core';
import { durationText } from '@turbo-console/webview-ui';

import { lineOf, timeLine } from './task-row.util.ts';
import type { AtomCache, AtomView } from '../common/atom-view.type.ts';
import { LIVE_NOTE } from '../common/atom.const.ts';

const NO_PARTS: string[] = [];

const LIVE_PARTS: string[] = ['live'];

const LIVE_NOTE_LINES: string[] = [LIVE_NOTE];

const RESULT_SEPARATOR = ' · ';

const CACHE_TEXTS: Readonly<Record<AtomCache, string>> = { HIT: 'HIT', MISS: 'MISS', deferred: 'unknown' };

const markedText = (mark: string, durationMs: number | null): string => {
  if (durationMs === null) return mark;

  return `${mark} ${durationText(durationMs)}`;
};

const RESULT_TEXTS: Readonly<Record<AtomResult['outcome'], (result: AtomResult) => string>> = {
  passed: (result) => markedText('✓', result.durationMs),
  failed: (result) => markedText('✗', result.durationMs),
  cached: () => 'cached'
};

const resultParts = (result: AtomResult | undefined): string[] => {
  if (result === undefined) return NO_PARTS;

  return [RESULT_TEXTS[result.outcome](result)];
};

const cachedParts = (group: AtomGroup, dryRun: AtomView['dryRun']): string[] => {
  if (dryRun === null) return NO_PARTS;

  const isHit = (file: AtomFile): boolean => dryRun.get(file.task.id) === 'HIT';
  const hits = group.files.filter(isHit);

  return [`${hits.length} cached`];
};

const failedParts = (group: AtomGroup, results: AtomView['results']): string[] => {
  if (results === null) return NO_PARTS;

  const isFailed = (file: AtomFile): boolean => results.get(file.task.id)?.outcome === 'failed';
  const failed = group.files.filter(isFailed);

  if (failed.length === 0) return NO_PARTS;

  return [`${failed.length} failed`];
};

const livePartsOf = (file: AtomFile): string[] => (file.isLive ? LIVE_PARTS : NO_PARTS);

/** `<n> files`, then ` · <c> cached` once the dry run settled, then ` · <f> failed` once the results settled and some failed. */
export const umbrellaCounts = (group: AtomGroup, view: AtomView): string => {
  const cached = cachedParts(group, view.dryRun);
  const failed = failedParts(group, view.results);
  const parts = [`${group.files.length} files`, ...cached, ...failed];

  return parts.join(RESULT_SEPARATOR);
};

/** `live` for a live file, then the newest result: `✓ 4.2s`, `✗ 7.9s` or `cached`. */
export const fileDescription = (file: AtomFile, result: AtomResult | undefined): string => {
  const live = livePartsOf(file);
  const text = resultParts(result);
  const parts = [...live, ...text];

  return parts.join(RESULT_SEPARATOR);
};

const resultLines = (result: AtomResult | undefined): string[] => {
  if (result === undefined) return ['Last result: none'];

  const ended = lineOf(timeLine('Ended', result.endedAt));

  return [`Last result: ${result.outcome}`, ...ended];
};

const cacheLine = (cache: AtomCache | undefined): string => {
  if (cache === undefined) return 'Dry run: unknown';

  return `Dry run: ${CACHE_TEXTS[cache]}`;
};

/** Raw tooltip lines: `tooltipMarkdownOf` cleans them. */
export const fileTooltip = (file: AtomFile, result: AtomResult | undefined, cache: AtomCache | undefined): string[] => {
  const live = file.isLive ? LIVE_NOTE_LINES : NO_PARTS;
  const resultText = resultLines(result);
  const lines = [`Task: ${file.task.name}`, ...resultText, cacheLine(cache), ...live];

  return lines;
};
