import type { z } from 'zod';

import type { affectedTasksSchema } from './affected-tasks.schema.ts';
import type { dryRunSchema } from './dry-run.schema.ts';
import type { packageGraphSchema } from './package-graph.schema.ts';
import type { runSummarySchema } from './run-summary.schema.ts';

export type PackageGraph = z.infer<typeof packageGraphSchema>;

export type AffectedTasks = z.infer<typeof affectedTasksSchema>;

export type DryRun = z.infer<typeof dryRunSchema>;

export type RunSummary = z.infer<typeof runSummarySchema>;

/** Plain `major.minor.patch` bounds: `min` is included, `maxExclusive` is not. */
export type TurboVersionRange = {
  readonly min: string;
  readonly maxExclusive: string;
};
