import { test as base } from './graph-task.fixture.ts';
import { GraphPanCpu } from './pages/graph-pan-cpu.po.ts';

type GraphPanCpuFixtures = {
  readonly graphPanCpu: GraphPanCpu;
};

export const test = base.extend<GraphPanCpuFixtures>({
  graphPanCpu: async ({ page }, use): Promise<void> => {
    await use(new GraphPanCpu(page));
  }
});
