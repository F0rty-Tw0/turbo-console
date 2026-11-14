import type { FilteringFacts, LayoutEngine } from './graph-probe.type.ts';
import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';

/** What the probe facts read of the page's frame clock. */
type FactFrames = {
  readonly firstFrameMs: () => number | null;
};

type FactFiltering = {
  readonly facts: () => FilteringFacts;
};

type FactLayouts = {
  readonly mode: () => LayoutGrouping;
  readonly engine: () => LayoutEngine | null;
};

/** What the probe facts read of the package side. */
type FactPackages = {
  readonly filtering: FactFiltering;
  readonly layouts: FactLayouts;
};

type FactAtoms = {
  readonly toggleMs: () => number | null;
};

type FactTaskLayout = {
  readonly engine: () => LayoutEngine | null;
  readonly atoms: FactAtoms;
};

type FactTaskSelection = {
  readonly selected: () => string | null;
};

/** What the probe facts read of task mode. */
type FactTasks = {
  readonly isActive: () => boolean;
  readonly layout: FactTaskLayout;
  readonly selection: FactTaskSelection;
};

/** The page controller parts the probe facts read, each when asked. */
export type ProbeFactParts = {
  readonly frames: FactFrames;
  readonly packages: FactPackages;
  readonly tasks: FactTasks;
};
