import type { Mock, Mocked } from 'vitest';

import type { ControlsMounted, ControlsRowsHost } from '../../common/graph-controls.type.ts';
import type { GraphView } from '../../common/graph-page.type.ts';
import type { RevealDeps, RevealFolders, RevealInspection, RevealLayouts, RevealTaskMode } from '../../common/graph-reveal.type.ts';

/**
 * The deps of a `PackageReveal` under test, each fake also reachable on its own; `log` records, in call order, `leave`,
 * `edit`, `expand <folders>`, `setViewport <zoom>` and `select <name>`.
 */
export type RevealDepsMock = {
  readonly deps: RevealDeps;
  readonly log: string[];
  readonly mounted: ControlsMounted;
  /** The collapsed folders the folders fake reports; a case adds to it. */
  readonly collapsed: Set<string>;
  readonly tasks: Mocked<RevealTaskMode>;
  readonly layouts: Mocked<RevealLayouts>;
  readonly drawn: Mock<RevealDeps['drawn']>;
  readonly edit: Mock<ControlsRowsHost['edit']>;
  readonly folders: Mocked<RevealFolders>;
  readonly inspection: Mocked<RevealInspection>;
  readonly view: Mocked<Pick<GraphView, 'viewport' | 'setViewport'>>;
};
