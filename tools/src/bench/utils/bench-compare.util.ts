import { median } from './median.util.ts';
import { NS_PER_MS } from '../common/bench.const.ts';
import type { BenchComparison, BenchResult, ComparisonRow } from '../common/bench.type.ts';

type RunGroup = {
  readonly medians: number[];
  readonly last: BenchResult;
};

const NAME_HEADER = 'bench';
const VALUE_HEADERS = ['base ms', 'head ms', 'ratio', 'gate', 'status'];
const VALUE_WIDTH = 10;

/** Per bench name, the median of its run medians; `gate` and `samples` come from the last run. Names keep first-seen order. */
export const reduceRuns = (runs: BenchResult[][]): BenchResult[] => {
  const groups = new Map<string, RunGroup>();
  const reduced: BenchResult[] = [];

  for (const result of runs.flat()) {
    const earlierMedians = groups.get(result.name)?.medians ?? [];
    const medians = [...earlierMedians, result.medianNs];
    const group: RunGroup = { medians, last: result };

    groups.set(result.name, group);
  }

  for (const group of groups.values()) {
    const medianNs = median(group.medians);
    const result: BenchResult = { ...group.last, medianNs };

    reduced.push(result);
  }

  return reduced;
};

const compareResult = (base: BenchResult, head: BenchResult, threshold: number): ComparisonRow => {
  const gate = base.gate || head.gate;
  const slowdownNs = head.medianNs - base.medianNs;
  const allowedNs = base.medianNs * threshold;
  const failed = gate && slowdownNs > allowedNs;
  const row: ComparisonRow = {
    name: head.name,
    baseNs: base.medianNs,
    headNs: head.medianNs,
    ratio: head.medianNs / base.medianNs,
    gate,
    failed
  };

  return row;
};

const findMissingGated = (base: BenchResult[], headNames: Set<string>): string[] => {
  const gated = base.filter((result) => result.gate);
  const gatedNames = gated.map((result) => result.name);
  const anyOnHead = gatedNames.some((name) => headNames.has(name));

  if (anyOnHead) return [];

  return gatedNames;
};

/**
 * Pairs benches by name; a pair fails when either side gates it and head is slower than base by more than
 * `base * threshold`. A single unpaired name never fails, but the comparison fails when none of base's gated benches is
 * on head.
 */
export const compareBenches = (base: BenchResult[], head: BenchResult[], threshold: number): BenchComparison => {
  const baseByName = new Map(base.map((result) => [result.name, result]));
  const headNames = new Set(head.map((result) => result.name));
  const rows: ComparisonRow[] = [];
  const added: string[] = [];

  for (const result of head) {
    const baseResult = baseByName.get(result.name);

    if (baseResult === undefined) {
      added.push(result.name);
      continue;
    }

    rows.push(compareResult(baseResult, result, threshold));
  }

  const removedResults = base.filter((result) => !headNames.has(result.name));
  const removed = removedResults.map((result) => result.name);
  const missingGated = findMissingGated(base, headNames);
  const anyRowFailed = rows.some((row) => row.failed);
  const failed = anyRowFailed || missingGated.length > 0;
  const comparison: BenchComparison = { rows, added, removed, missingGated, failed };

  return comparison;
};

const formatMs = (ns: number): string => {
  const ms = ns / NS_PER_MS;

  return ms.toFixed(3);
};

const formatLine = (name: string, values: string[], nameWidth: number): string => {
  const label = name.padEnd(nameWidth);
  const paddedValues = values.map((value) => value.padStart(VALUE_WIDTH));
  const cells = paddedValues.join('');

  return `${label}${cells}\n`;
};

const rowValues = (row: ComparisonRow): string[] => {
  const gate = row.gate ? 'gated' : '-';
  const status = row.failed ? 'FAIL' : 'ok';
  const values = [formatMs(row.baseNs), formatMs(row.headNs), row.ratio.toFixed(3), gate, status];

  return values;
};

const formatVerdict = (comparison: BenchComparison): string => {
  if (!comparison.failed) return 'ok: no gated bench regressed\n';

  const failedRows = comparison.rows.filter((row) => row.failed);
  const names = failedRows.map((row) => row.name).join(', ');
  const missingNames = comparison.missingGated.join(', ');
  const lines: string[] = [];

  if (names !== '') lines.push(`FAILED: ${names} regressed past the threshold\n`);

  if (missingNames !== '') lines.push(`FAILED: gated benches missing from head: ${missingNames}\n`);

  return lines.join('');
};

/** A fixed-width table (medians in ms), then `added:` / `removed:` lines when non-empty, then a verdict: one line per failure reason, or one `ok:` line. */
export const formatComparison = (comparison: BenchComparison): string => {
  const nameLengths = comparison.rows.map((row) => row.name.length);
  const nameWidth = Math.max(NAME_HEADER.length, ...nameLengths);
  const lines = [formatLine(NAME_HEADER, VALUE_HEADERS, nameWidth)];

  for (const row of comparison.rows) {
    const values = rowValues(row);

    lines.push(formatLine(row.name, values, nameWidth));
  }

  if (comparison.added.length > 0) lines.push(`added: ${comparison.added.join(', ')}\n`);

  if (comparison.removed.length > 0) lines.push(`removed: ${comparison.removed.join(', ')}\n`);

  lines.push(formatVerdict(comparison));

  return lines.join('');
};
