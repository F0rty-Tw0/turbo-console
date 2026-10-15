import type { PackageGraph } from '../../common/turbo.type.ts';

type GraphPackage = PackageGraph['data']['packageGraph']['nodes']['items'][number];

/** One task as `packageGraph` lists it under its package. */
export type TurboTaskRef = GraphPackage['tasks']['items'][number];

/** How a `killTree` call settled, and how many plain kills it sent the child. */
export type KillOutcome = {
  readonly settled: string;
  readonly killCount: number;
};
