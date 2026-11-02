import type { GraphTask } from '../../../bridge/common/graph-state.type.ts';
import type { ShownSetInput } from '../../common/shown-set.type.ts';
import { GRAPH_TASK_STUB } from '../stubs/graph-task.stub.ts';

const idsOf = (prefix: string, count: number): string[] => {
  const slots = Array.from({ length: count }, (_unused, index) => index);

  return slots.map((index) => `${prefix}${index}#t`);
};

/** A task whose package and name come from its `package#name` id. */
export const taskOf = (id: string, dependencies: string[]): GraphTask => {
  const [packageName = '', name = ''] = id.split('#');
  const task: GraphTask = { ...GRAPH_TASK_STUB, id, packageName, name, dependencies };

  return task;
};

/** A `ShownSetInput` over `tasks` whose listing is exactly those tasks; `edit` replaces any field. */
export const inputOf = (tasks: GraphTask[], edit: Partial<ShownSetInput> = {}): ShownSetInput => {
  const listedIds = new Set(tasks.map((task) => task.id));
  const input: ShownSetInput = { tasks, chosen: ['root#t'], depth: 1, capLifted: false, listedIds, ...edit };

  return input;
};

const joined = (...groups: GraphTask[][]): GraphTask[] => groups.flat();

const leavesOf = (ids: string[]): GraphTask[] => ids.map((id) => taskOf(id, []));

const dependingOn = (ids: string[], dependency: string): GraphTask[] => ids.map((id) => taskOf(id, [dependency]));

/** `root#t`, `hop1` dependents of it, and `hop2` dependents of the first hop-1 task. */
export const fanOf = (hop1: number, hop2: number): GraphTask[] => {
  const first = idsOf('d1-', hop1);
  const second = idsOf('d2-', hop2);
  const [firstId = 'root#t'] = first;
  const tasks = joined([taskOf('root#t', [])], dependingOn(first, 'root#t'), dependingOn(second, firstId));

  return tasks;
};

/** `root#t` depending on `hop1` tasks, the first of which depends on `hop2` more. */
export const depsOf = (hop1: number, hop2: number): GraphTask[] => {
  const [firstId = '', ...otherIds] = idsOf('u1-', hop1);
  const second = idsOf('u2-', hop2);
  const allFirst = [firstId, ...otherIds];
  const tasks = joined([taskOf('root#t', allFirst), taskOf(firstId, second)], leavesOf(otherIds), leavesOf(second));

  return tasks;
};

type CountedMethod = typeof Symbol.iterator | 'concat' | 'slice';

const replaceArrayMethod = (key: CountedMethod, value: unknown): void => {
  const original = Object.getOwnPropertyDescriptor(Array.prototype, key);

  Object.defineProperty(Array.prototype, key, { ...original, value });
};

/**
 * How many array elements `run` reads through the array iterator, which every spread, `for…of`,
 * destructure, and `new Set(array)` goes through, plus every element `concat` or `slice` copies.
 * Copying an n-long list once per push reads n²/2 here.
 *
 * Redefining the iterator turns off V8's fast array iteration for the rest of the test process, so
 * never use this in a timing test or in a spec file that has timing rows.
 */
export const arrayReadsOf = (run: () => void): number => {
  const iterate = Array.prototype[Symbol.iterator];
  const { concat, slice } = Array.prototype;
  let reads = 0;

  function* counted(this: unknown[]): Generator<unknown> {
    const values = iterate.call(this);

    for (let step = values.next(); step.done !== true; step = values.next()) {
      reads += 1;

      yield step.value;
    }
  }

  function countedConcat(this: unknown[], ...items: unknown[]): unknown[] {
    const copy = concat.apply(this, items);

    reads += copy.length;

    return copy;
  }

  function countedSlice(this: unknown[], ...range: [start?: number, end?: number]): unknown[] {
    const copy = slice.apply(this, range);

    reads += copy.length;

    return copy;
  }

  replaceArrayMethod(Symbol.iterator, counted);
  replaceArrayMethod('concat', countedConcat);
  replaceArrayMethod('slice', countedSlice);

  try {
    run();
  } finally {
    replaceArrayMethod(Symbol.iterator, iterate);
    replaceArrayMethod('concat', concat);
    replaceArrayMethod('slice', slice);
  }

  return reads;
};

/** `root#t` with `dependencies` dependencies and `dependents` dependents, all at hop 1. */
export const mixOf = (dependencies: number, dependents: number): GraphTask[] => {
  const below = idsOf('u-', dependencies);
  const above = idsOf('d-', dependents);
  const tasks = joined([taskOf('root#t', below)], leavesOf(below), dependingOn(above, 'root#t'));

  return tasks;
};

/** `depsOf(hop1, hop2)` plus `dependents` more tasks that depend on `root#t`, all at dependent hop 1. */
export const depsAndDependentsOf = (hop1: number, hop2: number, dependents: number): GraphTask[] => {
  const above = dependingOn(idsOf('d-', dependents), 'root#t');
  const tasks = joined(depsOf(hop1, hop2), above);

  return tasks;
};

type Chain = { readonly tasks: GraphTask[]; readonly previousFirst: string };

const withLevel = (chain: Chain, size: number, level: number): Chain => {
  const ids = idsOf(`l${level}-`, size);
  const [first = chain.previousFirst] = ids;
  const tasks = joined(chain.tasks, dependingOn(ids, chain.previousFirst));

  const next: Chain = { tasks, previousFirst: first };

  return next;
};

/** `root#t` and a dependents chain: `sizes[0]` tasks depend on it, and every task of a level depends on the first task of the level before. */
export const chainOf = (sizes: number[]): GraphTask[] => {
  const start: Chain = { tasks: [taskOf('root#t', [])], previousFirst: 'root#t' };
  const chain = sizes.reduce(withLevel, start);

  return chain.tasks;
};
