import type { GraphHostMessage, Positions } from '@turbo-console/webview-ui';
import type { Mock } from 'vitest';

import type { ProgressListener } from '../../../run/common/run-progress.type.ts';
import type { ViewFake } from '../../../shared/test/common/panel-fakes.type.ts';
import type { ScriptsToggleFake } from '../../../shared/test/common/scripts-toggle-fake.type.ts';
import type { AtomListener, SharedAtoms } from '../../../tree/common/atom-load.type.ts';
import type { SharedPrediction } from '../../../tree/common/prediction.type.ts';
import type { GraphLayoutCacheEntry } from '../../common/graph-cache.type.ts';
import type { GraphHost } from '../../common/graph-panel.type.ts';
import type { GraphProgress } from '../../common/graph.type.ts';

/** The fields of a posted `graph` state that a spec reads. */
export type PostedGraph = {
  readonly hash: string;
  readonly packages: string[];
  readonly positions: Positions | null;
  readonly folderPositions: Positions | null;
};

/** A `GraphHost` of spies: `open` hands out `views` in order; the layout caches are the in-memory `cached` map, keyed by `cacheKeyOf`. */
export type GraphHostFakes = {
  readonly host: GraphHost;
  readonly open: Mock<GraphHost['open']>;
  readonly views: ViewFake<GraphHostMessage>[];
  readonly cached: Map<string, GraphLayoutCacheEntry>;
  readonly readText: Mock<GraphHost['readText']>;
  readonly realPath: Mock<GraphHost['realPath']>;
  readonly openAt: Mock<GraphHost['openAt']>;
  readonly scanImports: Mock<GraphHost['scanImports']>;
  readonly log: Mock<GraphHost['log']>;
  readonly info: Mock<GraphHost['info']>;
  readonly pickSaveUri: Mock<GraphHost['pickSaveUri']>;
  readonly writeBytes: Mock<GraphHost['writeBytes']>;
  readonly showInfo: Mock<GraphHost['showInfo']>;
  readonly showError: Mock<GraphHost['showError']>;
  readonly executeCommand: Mock<GraphHost['executeCommand']>;
};

export type AtomsFake = {
  readonly atoms: SharedAtoms;
  readonly childrenRequested: Mock<SharedAtoms['childrenRequested']>;
  /** Tells every subscribed listener that the view of one package changed. */
  readonly changed: AtomListener;
  readonly listenerCount: () => number;
};

/** A task progress whose `recordsOf` is a spy the spec sets, and whose change feed fires when the spec calls `changed`. */
export type ProgressFake = {
  readonly progress: GraphProgress;
  readonly recordsOf: Mock<GraphProgress['recordsOf']>;
  /** Tells every subscribed listener that the records of one root changed. */
  readonly changed: ProgressListener;
  readonly listenerCount: () => number;
};

/** Shared prediction whose `packageShown` is a spy the spec reads, and whose change feed fires when the spec calls `changed`. */
export type PredictionFake = {
  readonly prediction: SharedPrediction;
  readonly packageShown: Mock<SharedPrediction['packageShown']>;
  /** Tells every subscribed listener that the prediction of one root changed; the graph reads no package names. */
  readonly changed: (root: string) => void;
  readonly listenerCount: () => number;
};

/** The scope, scripts and prediction toggles as fakes, so a spec reads their `set` spy and fires their listeners. */
export type ToggleFakes = {
  readonly scope: ScriptsToggleFake;
  readonly scripts: ScriptsToggleFake;
  readonly prediction: ScriptsToggleFake;
};
