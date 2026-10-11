import type { FixtureSpec, PackagePlan } from '../../common/fixture.type.ts';

const atomGroups = { count: 0, filesPerGroup: 0, liveRatio: 0.1 };

export const FIXTURE_SPEC_STUB: FixtureSpec = {
  seed: 7,
  packages: 10,
  tasksPerPackage: 6,
  maxDepth: 3,
  hubFanIn: 3,
  phantomRatio: 0.1,
  narrowInputsTask: 'test',
  atomGroups,
  affectedUsingTaskInputs: true
};

export const PACKAGE_PLAN_STUB: PackagePlan = {
  name: '@fx/pkg-001',
  path: 'packages/pkg-001',
  level: 0,
  tags: [],
  dependencies: [],
  tasks: ['build', 'lint', 'test', 'typecheck'],
  phantoms: [],
  role: 'regular'
};
