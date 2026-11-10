import type { WorkspaceModel } from '@turbo-console/core';

import type { GraphListing } from '../common/graph-atom.type.ts';
import { graphListingOf } from '../utils/graph-tasks.util.ts';

/**
 * The listing of the last model asked for, built once per model: a runs post during a run reads it twice (ids, then
 * predicted tasks), up to 20 times a second, and the store replaces a model, never changes it in place.
 */
export class GraphListingMemo {
  private model: WorkspaceModel | null = null;
  private listing: GraphListing | null = null;

  public readonly of = (model: WorkspaceModel): GraphListing => {
    if (model === this.model && this.listing !== null) return this.listing;

    const listing = graphListingOf(model);

    this.model = model;
    this.listing = listing;

    return listing;
  };
}
