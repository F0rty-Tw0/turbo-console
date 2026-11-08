import { describe, expect, it } from 'vitest';

import { buildOnlyStretchState, repoGenLikeTasksState } from './graph-box-titles.spec.util.ts';
import type { GraphTask } from '../../../src/bridge/common/graph-state.type.ts';

const dependenciesOf = (tasks: GraphTask[], id: string): string[] | undefined =>
  tasks.find((task): boolean => task.id === id)?.dependencies;

describe('FEATURE: repoGenLikeTasksState', () => {
  const state = repoGenLikeTasksState();

  it('GIVEN the state WHEN its parts are counted THEN it has 300 packages, 280 builds and an edge per task dependency', () => {
    const dependencyCount = state.tasks.flatMap((task): string[] => task.dependencies).length;

    expect([state.packages.length, state.tasks.length, state.edges.length]).toStrictEqual([300, 280, dependencyCount]);
  });

  it.each([
    { id: '@fx/pkg-064#build', expected: [] },
    { id: '@fx/pkg-065#build', expected: ['@fx/pkg-021#build'] },
    { id: '@fx/e2e-1#build', expected: ['@fx/pkg-086#build', '@fx/pkg-173#build'] }
  ])('GIVEN the state WHEN $id is read THEN it needs $expected', ({ id, expected }) => {
    expect(dependenciesOf(state.tasks, id)).toStrictEqual(expected);
  });

  it('GIVEN the state WHEN a tools package is read THEN it sits under tools with its bare name unscoped', () => {
    const atoms = state.packages.find((pkg): boolean => pkg.name === '@fx/atoms-01');

    expect([atoms?.path, atoms?.bareName]).toStrictEqual(['tools/atoms-01', 'atoms-01']);
  });
});

describe('FEATURE: buildOnlyStretchState', () => {
  it('GIVEN the state WHEN its tasks are read THEN they are the 300 builds and no Atomizer group is left', () => {
    const state = buildOnlyStretchState();
    const names = new Set(state.tasks.map((task): string => task.name));

    expect([state.tasks.length, [...names], state.atomGroups]).toStrictEqual([300, ['build'], []]);
  });
});
