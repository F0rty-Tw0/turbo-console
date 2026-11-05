import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskToolbar } from './task-toolbar.ts';
import type { TaskDetailsModel } from '../common/task-details.type.ts';
import type { TaskToolbarRig } from '../test/common/task-toolbar.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { TASK_DETAILS_STUB } from '../test/stubs/task-details.stub.ts';
import { latestOf, taskToolbarRigOf } from '../test/utils/task-toolbar.spec.util.ts';

const RUNNING: TaskDetailsModel = { ...TASK_DETAILS_STUB, state: 'running' };

const OWNED_BY_WEB: TaskDetailsModel = { ...RUNNING, runOwner: 'web#build' };

const OWNED_BY_ADMIN: TaskDetailsModel = { ...RUNNING, runOwner: 'admin#build' };

describe("FEATURE: TaskToolbar Run/Stop slot under another task's run", () => {
  let rig: TaskToolbarRig;
  let toolbar: TaskToolbar;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = taskToolbarRigOf();
    toolbar = new TaskToolbar(rig.deps);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the toolbar of a#build running on its own', () => {
    beforeEach((): void => {
      toolbar.sync(RUNNING);
    });

    it('WHEN it turns owned by web#build THEN the same slot reads Stop run of web#build in aria-label and title', () => {
      const { run } = latestOf(rig);

      toolbar.sync(OWNED_BY_WEB);

      expect(latestOf(rig).run).toBe(run);
      expect(run.getAttribute('aria-label')).toBe('Stop run of web#build');
      expect(run.title).toBe('Stop run of web#build');
    });

    it('WHEN it is synced owned by web#build twice THEN the second sync writes nothing to the slot', () => {
      toolbar.sync(OWNED_BY_WEB);

      const setAttribute = vi.spyOn(latestOf(rig).run, 'setAttribute');

      toolbar.sync(OWNED_BY_WEB);

      expect(setAttribute).not.toHaveBeenCalled();
    });

    it('WHEN the owner changes to admin#build THEN the slot reads Stop run of admin#build', () => {
      toolbar.sync(OWNED_BY_WEB);
      toolbar.sync(OWNED_BY_ADMIN);

      expect(latestOf(rig).run.getAttribute('aria-label')).toBe('Stop run of admin#build');
    });

    it('WHEN the owner key goes THEN the slot reads Stop a#build again', () => {
      toolbar.sync(OWNED_BY_WEB);
      toolbar.sync(RUNNING);

      expect(latestOf(rig).run.getAttribute('aria-label')).toBe('Stop a#build');
    });
  });
});
