import type { TestInfo } from '@playwright/test';

import { cpuRunsOf } from './graph-thread-time.spec.util.ts';
import type { CpuRuns, HoverBudget } from '../../common/graph.type.ts';

/**
 * Annotates the median hover-flow CPU of `runs`, every run's total/maxStep and every run's render count, and prints them
 * as one `hover-flow-cpu-ms` stdout line, so the CI log carries them even when a budget fails.
 */
export const recordHoverCpu = (info: TestInfo, { readings, median }: CpuRuns, renders: number[], budget: HoverBudget): void => {
  const total = Math.round(median.totalMs);
  const maxStep = Math.round(median.maxStepMs);
  const runs = cpuRunsOf(readings);
  const runRenders = renders.join(',');

  info.annotations.push({ type: 'hover-flow-cpu-ms', description: String(total) });
  info.annotations.push({ type: 'hover-flow-max-step-cpu-ms', description: String(maxStep) });
  info.annotations.push({ type: 'hover-flow-cpu-runs-ms', description: runs });
  info.annotations.push({ type: 'hover-flow-renders', description: runRenders });
  process.stdout.write(
    `hover-flow-cpu-ms total=${total} maxStep=${maxStep} runs=${runs} renders=${runRenders} budget=${budget.totalMs} stepBudget=${budget.stepMs} host=${process.platform}-${process.arch} ${info.title}\n`
  );
};
