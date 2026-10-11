import { planAtomGroups } from './plan-atom-groups.util.ts';
import { planPackages } from './plan-packages.util.ts';
import { planTasks } from './plan-tasks.util.ts';
import { createPrng } from './prng.util.ts';
import { renderAtomGroup } from './render-atom-group.util.ts';
import { renderPackageFiles } from './render-package-files.util.ts';
import { renderRootFiles } from './render-root-files.util.ts';
import type { FixtureFile, FixturePlan, FixtureSpec } from '../common/fixture.type.ts';

/** The whole plan for a spec, drawing packages, then tasks, then atom groups from one PRNG seeded with `spec.seed`. */
export const planFixture = (spec: FixtureSpec): FixturePlan => {
  const random = createPrng(spec.seed);
  const planned = planPackages(spec, random);
  const packages = planTasks(spec, planned, random);
  const atomGroups = planAtomGroups(spec, packages, random);
  const plan: FixturePlan = { spec, packages, atomGroups };

  return plan;
};

/** Every file of the fixture repo: root files (root `turbo.json` included), then each package, then each atom group. */
export const renderFixtureFiles = (plan: FixturePlan): FixtureFile[] => {
  const rootFiles = renderRootFiles(plan);
  const packageFiles = plan.packages.flatMap(renderPackageFiles);
  const atomGroupFiles = plan.atomGroups.flatMap(renderAtomGroup);

  return [...rootFiles, ...packageFiles, ...atomGroupFiles];
};
