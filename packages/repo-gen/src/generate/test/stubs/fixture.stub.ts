import type { AtomGroupPlan, FixtureSpec, PackagePlan } from '../../common/fixture.type.ts';

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

const specFile = { path: 'tests/spec-001.spec.ts', live: false };

const liveSpecFile = { path: 'tests/spec-002.live.spec.ts', live: true };

export const ATOM_GROUP_PLAN_STUB: AtomGroupPlan = {
  index: 1,
  testPackage: '@fx/e2e-1',
  definitionsPackage: '@fx/e2e-1-atoms',
  dependencies: ['@fx/pkg-001'],
  specFiles: [specFile, liveSpecFile]
};
