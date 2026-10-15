import type { ExecFileException, ExecFileOptionsWithStringEncoding } from 'node:child_process';

import type { z } from 'zod';

import type { affectedTasksSchema } from './affected-tasks.schema.ts';
import type { dryRunSchema } from './dry-run.schema.ts';
import type { packageGraphSchema } from './package-graph.schema.ts';
import type { runSummarySchema } from './run-summary.schema.ts';

export type PackageGraph = z.infer<typeof packageGraphSchema>;

/** One package as `packageGraph.nodes` lists it. */
export type GraphPackage = PackageGraph['data']['packageGraph']['nodes']['items'][number];

/** One task as `packageGraph` lists it under its package. */
export type GraphTask = GraphPackage['tasks']['items'][number];

export type AffectedTasks = z.infer<typeof affectedTasksSchema>;

export type DryRun = z.infer<typeof dryRunSchema>;

export type RunSummary = z.infer<typeof runSummarySchema>;

/** One finished turbo process; `exitCode` is turbo's own, non-zero included. */
export type TurboResult = {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
};

/** Plain `major.minor.patch` bounds: `min` is included, `maxExclusive` is not. */
export type TurboVersionRange = {
  readonly min: string;
  readonly maxExclusive: string;
};

/**
 * Per-call spawn limits; `graceMs` bounds the wait for exit after the abort kill, `maxBuffer` each of stdout and stderr (bytes).
 * `maxRssBytes` (turbo's resident memory bound) and `rssPollMs` (how often it is read) are test seams, not user settings.
 */
export type RunTurboOptions = {
  readonly timeoutMs?: number | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly graceMs?: number | undefined;
  readonly maxBuffer?: number | undefined;
  readonly maxRssBytes?: number | undefined;
  readonly rssPollMs?: number | undefined;
};

type QueryVariables = {
  readonly variables?: Record<string, string> | undefined;
};

/** `variables` go to a `-V` JSON file; the rest is passed to `runTurbo`. */
export type QueryTurboOptions = RunTurboOptions & QueryVariables;

type RssExec = (
  file: string,
  args: string[],
  options: ExecFileOptionsWithStringEncoding,
  callback: (error: ExecFileException | null, stdout: string) => void
) => void;

/** What `rssOf` reads the OS through; the defaults are the real `process.platform`, `execFile` and `readFile`. */
export type RssDeps = {
  readonly platform: NodeJS.Platform;
  readonly exec: RssExec;
  readonly readFile: (path: string, encoding: 'utf8') => Promise<string>;
};

/** Reads the resident memory of `pid` in bytes; `null` when it cannot be read. */
export type RssProbe = (pid: number) => Promise<number | null>;

/** What `watchMemory` polls and when it gives up; `probe` defaults to `rssOf`. */
export type WatchMemoryOptions = {
  readonly maxRssBytes: number;
  readonly intervalMs: number;
  readonly probe?: RssProbe | undefined;
  readonly onExceeded: (rss: number) => void;
};
