import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { TestDetailsAnnotation } from '@playwright/test';
import type { FullResult, Reporter, TestResult } from '@playwright/test/reporter';

import { NS_PER_MS } from './common/bench.const.ts';
import type { BenchRow, BenchSample } from './common/bench.type.ts';
import { noteOf, resultsOf, sampleOf } from './utils/bench-results.util.ts';

type BenchReporterOptions = { readonly outputFile: string };

type FailedRun = { readonly status: 'failed' };

const lineOf = (row: BenchRow): string => {
  const medianMs = row.medianNs / NS_PER_MS;
  const ms = medianMs.toFixed(2);

  return `bench ${row.name} median ${ms} ms n=${row.samples} gate=${row.gate}`;
};

export default class BenchReporter implements Reporter {
  private readonly outputFile: string;
  private readonly samples: BenchSample[] = [];
  private readonly notes: string[] = [];

  public constructor(options: BenchReporterOptions) {
    this.outputFile = resolve(process.cwd(), options.outputFile);
  }

  public onBegin(): void {
    rmSync(this.outputFile, { force: true });
  }

  public onTestEnd(_test: unknown, result: Pick<TestResult, 'annotations'>): void {
    this.collect(result.annotations);
  }

  private collect(annotations: TestDetailsAnnotation[]): void {
    for (const annotation of annotations) {
      const sample = sampleOf(annotation);
      const note = noteOf(annotation);

      if (sample !== null) this.samples.push(sample);

      if (note !== null) this.notes.push(note);
    }
  }

  private finish(result: FullResult): FailedRun | undefined {
    if (result.status !== 'passed') return undefined;

    if (this.samples.length === 0) {
      process.stderr.write('bench: the run recorded no samples\n');
      const failedRun: FailedRun = { status: 'failed' };

      return failedRun;
    }

    const rows = resultsOf(this.samples);

    mkdirSync(dirname(this.outputFile), { recursive: true });
    writeFileSync(this.outputFile, JSON.stringify(rows, null, 2));

    const rowLines = rows.map(lineOf);
    const lines = [...rowLines, ...this.notes];

    process.stdout.write(`${lines.join('\n')}\n`);

    return undefined;
  }

  public async onEnd(result: FullResult): Promise<FailedRun | undefined> {
    const outcome = this.finish(result);

    return Promise.resolve(outcome);
  }

  // eslint-disable-next-line class-methods-use-this -- Playwright calls this member on the reporter instance
  public printsToStdio(): boolean {
    return false;
  }
}
