import { packageOf } from './graph-package.spec.util.ts';
import { overCapTasksState } from './graph-target-like-tasks.spec.util.ts';
import type { GraphEdge, GraphReady, GraphRunState, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';

type Cell = readonly [layer: number, column: number];

const LAYERS = 16;

const WIDTH = 15;

const RUN_MIX: GraphRunState[] = ['running', 'passed', 'failed'];

const nameOf = (layer: number, column: number): string => `p-${String(layer).padStart(2, '0')}-${String(column).padStart(2, '0')}`;

const cellOf = (index: number): Cell => [Math.floor(index / WIDTH), index % WIDTH];

const cellsOf = (): Cell[] => Array.from({ length: LAYERS * WIDTH }, (_slot, index): Cell => cellOf(index));

const depsOf = ([layer, column]: Cell): string[] => {
  if (layer === 0) return [];

  return [nameOf(layer - 1, column), nameOf(layer - 1, (column + 1) % WIDTH)];
};

const taskOf = (cell: Cell): GraphTask => {
  const name = nameOf(...cell);
  const dependencies = depsOf(cell).map((dep): string => `${dep}#build`);
  const task: GraphTask = {
    id: `${name}#build`,
    packageName: name,
    name: 'build',
    command: 'build',
    isRunnable: true,
    isTurboTask: true,
    dependencies
  };

  return task;
};

const edgesOf = (cell: Cell): GraphEdge[] => {
  const source = nameOf(...cell);
  const edgeTo = (target: string): GraphEdge => {
    const edge: GraphEdge = { source, target };

    return edge;
  };

  return depsOf(cell).map(edgeTo);
};

/**
 * 16 layers of 15 packages, one `build` each (240 tasks); each `build` needs two `build`s of the layer above. Shallow and
 * wide enough that Fit frames it far above the 0.05 zoom floor, unlike a deep chain.
 */
export const layeredTasksState = (): GraphReady => {
  const cells = cellsOf();
  const names = cells.map((cell): string => nameOf(...cell));
  const packages = names.map((name) => packageOf(name, `packages/${name}`, [], 1));
  const base = overCapTasksState();
  const state: GraphReady = { ...base, hash: 'c4a7d240', packages, edges: cells.flatMap(edgesOf), tasks: cells.map(taskOf) };

  return state;
};

/** A run state for each of `ids`, cycling `running`, `passed`, `failed`. */
export const layeredRunsOf = (ids: string[]): Record<string, GraphRunState> => {
  const entryOf = (id: string, index: number): [string, GraphRunState] => [id, RUN_MIX[index % RUN_MIX.length] ?? 'running'];

  return Object.fromEntries(ids.map(entryOf));
};
