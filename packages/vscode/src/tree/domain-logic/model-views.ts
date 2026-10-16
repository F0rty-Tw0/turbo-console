import type { WorkspaceModel } from '@turbo-console/core';

import type { ModelView } from '../common/model-view.type.ts';
import { modelViewOf } from '../utils/model-view.util.ts';

/**
 * One view per model object: the editor asks for the children and the item of every node, and each answer needs the
 * shown packages and their folder tree, so they are built once per model instead of walking every package each time.
 */
export class ModelViews {
  private readonly views = new WeakMap<WorkspaceModel, ModelView>();

  public of(model: WorkspaceModel): ModelView {
    const cached = this.views.get(model);

    if (cached !== undefined) return cached;

    const view = modelViewOf(model);

    this.views.set(model, view);

    return view;
  }
}
