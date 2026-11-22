import { describe, expect, it } from 'vitest';

import { freshModulesViewOf, freshViewStateOf } from './fresh-view-state.util.ts';
import { readGraphViewState } from './graph-view-state.util.ts';
import type { GraphViewState, ModulesCamera, ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';

const SAVED_SHOWN = { types: false, tests: true, lazies: true };

const SAVED_PAN = { x: 5, y: 6 };

const SAVED_CAMERA = { zoom: 2, pan: SAVED_PAN };

const SAVED_MODULES: ModulesViewState = {
  packageName: 'web',
  expanded: ['src', 'src/lib'],
  shown: SAVED_SHOWN,
  camera: SAVED_CAMERA
};

const FRESH_H1 = freshViewStateOf('h1');

const ORIGIN = { x: 0, y: 0 };

const rawOf = (mode: unknown, modules: unknown): Record<string, unknown> => {
  const raw: Record<string, unknown> = { ...FRESH_H1, mode, modules };

  return raw;
};

const cameraOf = (state: GraphViewState | null): ModulesCamera | null | undefined => state?.modules?.camera;

describe('FEATURE: readGraphViewState modules view', () => {
  describe('GIVEN a state saved in modules mode with a whole modules view', () => {
    it('WHEN it is read THEN the mode is modules and the view comes back field for field', () => {
      const state = readGraphViewState(rawOf('modules', SAVED_MODULES));

      expect([state?.mode, state?.modules]).toStrictEqual(['modules', SAVED_MODULES]);
    });
  });

  describe('GIVEN mode modules and no modules view', () => {
    it('WHEN it is read THEN it reads package mode with no modules view', () => {
      const state = readGraphViewState(rawOf('modules', null));

      expect([state?.mode, state?.modules]).toStrictEqual(['packages', null]);
    });
  });

  describe('GIVEN a modules view whose package name is not a string', () => {
    it('WHEN it is read THEN the view is dropped and the mode reads packages', () => {
      const state = readGraphViewState(rawOf('modules', { ...SAVED_MODULES, packageName: 7 }));

      expect([state?.mode, state?.modules]).toStrictEqual(['packages', null]);
    });
  });

  describe('GIVEN expanded null, as a view not set up yet', () => {
    it('WHEN it is read THEN expanded stays null', () => {
      const state = readGraphViewState(rawOf('modules', { ...SAVED_MODULES, expanded: null }));

      expect(state?.modules?.expanded).toBeNull();
    });
  });

  describe('GIVEN expanded holding a number', () => {
    it('WHEN it is read THEN expanded reads null and the rest is kept', () => {
      const state = readGraphViewState(rawOf('modules', { ...SAVED_MODULES, expanded: ['src', 3] }));

      expect(state?.modules).toStrictEqual({ ...SAVED_MODULES, expanded: null });
    });
  });

  describe('GIVEN a shown flag that is not a boolean', () => {
    it('WHEN it is read THEN that flag reads as a fresh view shows it and the others are kept', () => {
      const shown = { types: 'no', tests: false, lazies: false };
      const state = readGraphViewState(rawOf('modules', { ...SAVED_MODULES, shown }));

      expect(state?.modules?.shown).toStrictEqual({ types: true, tests: false, lazies: false });
    });
  });

  describe('GIVEN a tests flag that is not a boolean', () => {
    it('WHEN it is read THEN test files read hidden, as in a fresh view', () => {
      const shown = { types: false, tests: 'yes', lazies: false };
      const state = readGraphViewState(rawOf('modules', { ...SAVED_MODULES, shown }));

      expect(state?.modules?.shown).toStrictEqual({ types: false, tests: false, lazies: false });
    });
  });

  describe('GIVEN a modules view with no shown flags', () => {
    it('WHEN it is read THEN shown reads as a fresh view, test files hidden', () => {
      const state = readGraphViewState(rawOf('modules', { ...SAVED_MODULES, shown: undefined }));

      expect(state?.modules?.shown).toStrictEqual(freshModulesViewOf('web').shown);
    });
  });

  describe('GIVEN a camera at zoom 0', () => {
    it('WHEN it is read THEN the camera reads null and the mode stays modules', () => {
      const camera = { zoom: 0, pan: ORIGIN };
      const state = readGraphViewState(rawOf('modules', { ...SAVED_MODULES, camera }));

      expect([state?.mode, cameraOf(state)]).toStrictEqual(['modules', null]);
    });
  });

  describe('GIVEN a state saved before modules existed', () => {
    it('WHEN it is read THEN modules is null', () => {
      const state = readGraphViewState(rawOf('packages', undefined));

      expect(state?.modules).toBeNull();
    });
  });

  describe('GIVEN mode tasks with a modules view and no task view', () => {
    it('WHEN it is read THEN it reads package mode and keeps the modules view', () => {
      const state = readGraphViewState(rawOf('tasks', SAVED_MODULES));

      expect([state?.mode, state?.modules]).toStrictEqual(['packages', SAVED_MODULES]);
    });
  });
});
