import type { Mock } from 'vitest';

import type { ScriptsToggleFake } from '../../../shared/test/common/scripts-toggle-fake.type.ts';
import type { TreeNode } from '../../common/tree-node.type.ts';
import type { RefreshDeps } from '../../common/tree-refresh.type.ts';

/** The deps of a `TreeRefresher` over real roots, with a cache and a `fire` spy a spec reads; `live` and `toggle` are the state it changes. */
export type RefresherFixture = {
  readonly deps: RefreshDeps;
  readonly fire: Mock<RefreshDeps['fire']>;
  readonly cache: Map<string, TreeNode>;
  readonly live: Map<string, ReadonlySet<string>>;
  readonly toggle: ScriptsToggleFake;
  readonly show: () => void;
};
