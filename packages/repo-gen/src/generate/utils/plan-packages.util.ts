import { pickRandom } from './prng.util.ts';
import { HUB_TAG } from '../common/fixture.const.ts';
import type { FixtureSpec, PackagePlan } from '../common/fixture.type.ts';

const HUB_NAME = '@fx/hub';

const hubPackage = (): PackagePlan => {
  const hub: PackagePlan = {
    name: HUB_NAME,
    path: 'packages/hub',
    level: 0,
    tags: [HUB_TAG],
    dependencies: [],
    tasks: [],
    phantoms: [],
    role: 'hub'
  };

  return hub;
};

const regularPackage = (index: number, maxDepth: number): PackagePlan => {
  const id = String(index + 1).padStart(3, '0');
  const pkg: PackagePlan = {
    name: `@fx/pkg-${id}`,
    path: `packages/pkg-${id}`,
    level: index % maxDepth,
    tags: [],
    dependencies: [],
    tasks: [],
    phantoms: [],
    role: 'regular'
  };

  return pkg;
};

const withParent = (pkg: PackagePlan, regulars: PackagePlan[], random: () => number): PackagePlan => {
  if (pkg.level === 0) return pkg;

  const parents = regulars.filter((candidate) => candidate.level === pkg.level - 1);
  const dependencies = pickRandom(parents, 1, random).map((parent) => parent.name);
  const child: PackagePlan = { ...pkg, dependencies };

  return child;
};

const withHubDependency = (pkg: PackagePlan, hubDependents: Set<string>): PackagePlan => {
  const isHubDependent = hubDependents.has(pkg.name);

  if (!isHubDependent) return pkg;

  const merged = [HUB_NAME, ...pkg.dependencies];
  const dependencies = merged.toSorted();
  const dependent: PackagePlan = { ...pkg, dependencies };

  return dependent;
};

/**
 * Plans the hub and the regular packages: `spec.packages` minus two per atom group.
 * Regular package `i` sits at level `i % maxDepth` and depends on one random regular package one level down,
 * so every level is populated and the top level has no dependents. The hub sits at level 0 with exactly `hubFanIn` dependents.
 */
export const planPackages = (spec: FixtureSpec, random: () => number): PackagePlan[] => {
  const regularCount = spec.packages - 2 * spec.atomGroups.count - 1;

  if (regularCount < spec.maxDepth) throw new RangeError(`${regularCount} regular packages cannot fill ${spec.maxDepth} levels`);

  const levelled = Array.from({ length: regularCount }, (_, index) => regularPackage(index, spec.maxDepth));
  const regulars = levelled.map((pkg) => withParent(pkg, levelled, random));
  const hubCandidates = regulars.filter((pkg) => pkg.level > 0);

  if (spec.hubFanIn > hubCandidates.length) {
    throw new RangeError(`hubFanIn ${spec.hubFanIn} exceeds the ${hubCandidates.length} packages above level 0`);
  }

  const hubDependentNames = pickRandom(hubCandidates, spec.hubFanIn, random).map((pkg) => pkg.name);
  const hubDependents = new Set(hubDependentNames);
  const withHub = regulars.map((pkg) => withHubDependency(pkg, hubDependents));

  return [hubPackage(), ...withHub];
};
