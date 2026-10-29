import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskToolbar } from './task-toolbar.ts';
import type { TaskDetailsModel } from '../common/task-details.type.ts';
import type { TaskToolbarRig } from '../test/common/task-toolbar.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { ROOT_BUILD_STUB } from '../test/stubs/graph-task.stub.ts';
import { TASK_DETAILS_STUB } from '../test/stubs/task-details.stub.ts';
import { pressKey } from '../test/utils/key-events.spec.util.ts';
import { rectOf } from '../test/utils/rect.spec.util.ts';
import { latestOf, stopsOf, taskToolbarRigOf } from '../test/utils/task-toolbar.spec.util.ts';

const AT_BUILD = rectOf(156, 22, 180, 46);

const IDLE = TASK_DETAILS_STUB;

const ROOT_IDLE: TaskDetailsModel = { ...IDLE, task: ROOT_BUILD_STUB };

describe('FEATURE: TaskToolbar keys', () => {
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

  describe('GIVEN the toolbar of a#build, placed at full zoom with Run focused', () => {
    beforeEach((): void => {
      toolbar.sync(IDLE);
      toolbar.place(AT_BUILD, 1);
      latestOf(rig).run.focus();
    });

    it('WHEN Right is pressed THEN Show package has focus and is the one Tab stop', () => {
      const { root, run, showPackage } = latestOf(rig);

      const isPrevented = pressKey(root, 'ArrowRight', run);

      expect(isPrevented).toBe(true);
      expect(document.activeElement).toBe(showPackage);
      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, 0, -1]);
    });

    it('WHEN Left is pressed THEN the "…" has focus, wrapping', () => {
      pressKey(latestOf(rig).root, 'ArrowLeft', latestOf(rig).run);

      expect(document.activeElement).toBe(latestOf(rig).ellipsis);
    });

    it('WHEN End is pressed THEN the "…" has focus', () => {
      pressKey(latestOf(rig).root, 'End', latestOf(rig).run);

      expect(document.activeElement).toBe(latestOf(rig).ellipsis);
    });

    it('WHEN Home is pressed on the "…" THEN Run has focus', () => {
      const { root, run, ellipsis } = latestOf(rig);

      ellipsis.focus();
      pressKey(root, 'Home', ellipsis);

      expect(document.activeElement).toBe(run);
    });

    it('WHEN a is pressed THEN focus and the Tab stop stay and the key is not prevented', () => {
      const isPrevented = pressKey(latestOf(rig).root, 'a', latestOf(rig).run);

      expect(isPrevented).toBe(false);
      expect(document.activeElement).toBe(latestOf(rig).run);
      expect(stopsOf(latestOf(rig))).toStrictEqual([0, -1, -1]);
    });

    it('WHEN Right is pressed and the toolbar is placed again THEN the Tab stop stays on Show package', () => {
      pressKey(latestOf(rig).root, 'ArrowRight', latestOf(rig).run);
      toolbar.place(AT_BUILD, 1);

      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, 0, -1]);
    });

    it('WHEN the "…" gains focus (a click) THEN it is the Tab stop', () => {
      latestOf(rig).ellipsis.focus();

      expect(stopsOf(latestOf(rig))).toStrictEqual([-1, -1, 0]);
    });
  });

  describe('GIVEN the toolbar of the root task //#build, placed with Run focused', () => {
    it('WHEN Right is pressed THEN the "…" has focus, as there is no Show package', () => {
      toolbar.sync(ROOT_IDLE);
      toolbar.place(AT_BUILD, 1);
      latestOf(rig).run.focus();
      pressKey(latestOf(rig).root, 'ArrowRight', latestOf(rig).run);

      expect(document.activeElement).toBe(latestOf(rig).ellipsis);
    });
  });
});
