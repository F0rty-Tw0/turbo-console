import type { PackageGraph } from '../../common/turbo.type.ts';

type GraphPackage = PackageGraph['data']['packageGraph']['nodes']['items'][number];

/** One task as `packageGraph` lists it under its package. */
export type TurboTaskRef = GraphPackage['tasks']['items'][number];
