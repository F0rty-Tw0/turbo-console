import type { GraphHostMessage, Positions } from '@turbo-console/webview-ui';
import type { Mock } from 'vitest';

import type { ViewFake } from '../../../shared/test/common/panel-fakes.type.ts';
import type { AtomListener, SharedAtoms } from '../../../tree/common/atom-load.type.ts';
import type { GraphLayoutCacheEntry } from '../../common/graph-cache.type.ts';
import type { GraphHost } from '../../common/graph-panel.type.ts';

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
  readonly openAt: Mock<GraphHost['openAt']>;
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
