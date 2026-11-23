import type { Mock, Mocked } from 'vitest';

import type { RoutedModuleMode, RoutedPackageSide, RoutedTaskMode, StateRoutingDeps } from '../../common/state-routing.type.ts';

/** The state routing's deps under test, each fake also reachable on its own. */
export type RoutingRig = {
  readonly deps: StateRoutingDeps;
  readonly tasks: Mocked<RoutedTaskMode>;
  readonly modules: Mocked<RoutedModuleMode>;
  readonly packages: Mocked<RoutedPackageSide>;
  readonly hideModes: Mock<(isHidden: boolean) => void>;
};
