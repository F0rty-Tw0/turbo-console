import type { TestInfo } from '@playwright/test';

import type { CpuSteps, HoverBudget } from '../../common/graph.type.ts';

/** Annotates the hover-flow CPU readings and prints them as one `hover-flow-cpu-ms` stdout line, so the CI log carries them even when a budget fails. */
export const recordHoverCpu = (info: TestInfo, hover: CpuSteps, renders: number, budget: HoverBudget): void => {
  const total = Math.round(hover.totalMs);
  const maxStep = Math.round(hover.maxStepMs);

  info.annotations.push({ type: 'hover-flow-cpu-ms', description: String(total) });
  info.annotations.push({ type: 'hover-flow-max-step-cpu-ms', description: String(maxStep) });
  info.annotations.push({ type: 'hover-flow-renders', description: String(renders) });
  process.stdout.write(
    `hover-flow-cpu-ms total=${total} maxStep=${maxStep} renders=${renders} budget=${budget.totalMs} stepBudget=${budget.stepMs} host=${process.platform}-${process.arch} ${info.title}\n`
  );
};
