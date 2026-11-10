import { loadWorkspace, resolveTurbo } from '@turbo-console/core';
import type { WorkspaceModel } from '@turbo-console/core';
import { PRESETS, fixtureFor } from '@turbo-console/repo-gen';
import type { PresetName } from '@turbo-console/repo-gen';

import type { RootState } from '../../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../../roots/common/root.type.ts';
import { devTurboPath } from '../../../shared/test/utils/dev-turbo.spec.util.ts';

const captured = new Map<PresetName, Promise<WorkspaceModel>>();

const loadModel = async (preset: PresetName): Promise<WorkspaceModel> => {
  const fixture = await fixtureFor(PRESETS[preset]);

  try {
    const binary = await resolveTurbo(fixture.dir, { trusted: true, overridePath: devTurboPath() });

    return await loadWorkspace(binary);
  } finally {
    await fixture.dispose();
  }
};

/**
 * The model `loadWorkspace` builds for a fresh `preset` fixture, kept after the fixture is disposed. The runner imports
 * every bench file in one process, so the files share one capture per preset.
 */
export const captureModel = async (preset: PresetName): Promise<WorkspaceModel> => {
  const known = captured.get(preset);

  if (known !== undefined) return known;

  const model = loadModel(preset);

  captured.set(preset, model);

  return model;
};

/** A loaded root showing `model`, as the tree reads it. */
export const benchStateOf = (model: WorkspaceModel): RootState => {
  const folder: RootFolder = { root: model.root, name: 'bench' };
  const state: RootState = { folder, binary: null, model, error: null };

  return state;
};
