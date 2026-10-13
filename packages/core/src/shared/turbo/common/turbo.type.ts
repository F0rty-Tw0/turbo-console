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

/** Per-call spawn limits; `graceMs` bounds the wait for exit after the abort kill, `maxBuffer` each of stdout and stderr (bytes). */
export type RunTurboOptions = {
  readonly timeoutMs?: number | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly graceMs?: number | undefined;
  readonly maxBuffer?: number | undefined;
};

type QueryVariables = {
  readonly variables?: Record<string, string> | undefined;
};

/** `variables` go to a `-V` JSON file; the rest is passed to `runTurbo`. */
export type QueryTurboOptions = RunTurboOptions & QueryVariables;
