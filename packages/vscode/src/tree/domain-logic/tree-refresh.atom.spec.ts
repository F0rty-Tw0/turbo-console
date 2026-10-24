import { beforeEach, describe, expect, it } from 'vitest';

import { TreeRefresher } from './tree-refresh.ts';
import type { TreeNode } from '../common/tree-node.type.ts';
import type { RefresherFixture } from '../test/common/refresher-fixture.type.ts';
import { ATOM_VIEW_STUB, A_FILE_STUB, E2E_PACKAGE_STUB } from '../test/stubs/atom-view.stub.ts';
import { ROW_SCOPE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { atomContextOf } from '../test/utils/atom-context.spec.util.ts';
import { refresherFixtureOf, taskRunOf } from '../test/utils/tree-refresher.spec.util.ts';
import { packageFileRows } from '../utils/atom-rows.util.ts';
import { nodesOf } from '../utils/node-cache.util.ts';

const FILE_A_ID = A_FILE_STUB.task.id;

describe('FEATURE: tree refresh of Atomizer file rows', () => {
  let fixture: RefresherFixture;
  let refresher: TreeRefresher;
  let fileANode: TreeNode | undefined;

  beforeEach(() => {
    fixture = refresherFixtureOf();
    refresher = new TreeRefresher(fixture.deps);

    const rows = packageFileRows(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, atomContextOf(ATOM_VIEW_STUB));
    const nodes = nodesOf(fixture.cache, rows);

    fileANode = nodes.find((node) => node.key === FILE_A_ID);
  });

  describe('GIVEN the cache holds the file nodes of the umbrella', () => {
    it('WHEN the tick lists the running file THEN only its node is fired, once', () => {
      refresher.refreshTasks(new Map([['/ws', new Set([FILE_A_ID])]]));

      expect(fixture.fire).toHaveBeenCalledExactlyOnceWith([fileANode]);
    });

    it('WHEN the run of the file changes THEN its node is fired', () => {
      refresher.runChanged(taskRunOf('/ws', FILE_A_ID, 'e2e'));

      expect(fixture.fire).toHaveBeenCalledWith(fileANode);
    });
  });
});
