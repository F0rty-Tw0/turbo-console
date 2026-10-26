import type { TraceFacts } from '../../common/graph.type.ts';

/** `web` reaches `core` through `data`. */
export const WEB_TO_CORE_FACTS_STUB: TraceFacts = {
  start: 'web',
  end: 'core',
  summary: '3 packages on the shortest path.',
  path: ['web', 'data', 'core'],
  hidden: []
};

export const WEB_TO_CONFIG_FACTS_STUB: TraceFacts = {
  start: 'web',
  end: 'config',
  summary: '4 packages on the shortest path.',
  path: ['web', 'data', 'core', 'config'],
  hidden: []
};

export const WEB_TO_UI_FACTS_STUB: TraceFacts = {
  start: 'web',
  end: 'ui',
  summary: '2 packages on the shortest path.',
  path: ['web', 'ui'],
  hidden: []
};

/** Started at `core`: the path still runs from the dependent `web`. */
export const CORE_TO_WEB_FACTS_STUB: TraceFacts = { ...WEB_TO_CORE_FACTS_STUB, start: 'core', end: 'web' };

/** No path: the summary says so and the step list is empty. */
export const WEB_TO_SOLO_FACTS_STUB: TraceFacts = {
  start: 'web',
  end: 'solo',
  summary: 'No dependency path between web and solo.',
  path: [],
  hidden: []
};

export const SITE_TO_STORE_FACTS_STUB: TraceFacts = {
  start: 'site',
  end: 'store',
  summary: '3 packages on the shortest path.',
  path: ['site', 'bridge', 'store'],
  hidden: []
};

export const PROTO_TO_PLAIN_FACTS_STUB: TraceFacts = {
  start: '__proto__',
  end: 'plain',
  summary: '3 packages on the shortest path.',
  path: ['__proto__', 'constructor', 'plain'],
  hidden: []
};

/** `data` is hidden and a Show button would bring it back. */
export const WEB_TO_CORE_HIDDEN_FACTS_STUB: TraceFacts = { ...WEB_TO_CORE_FACTS_STUB, hidden: ['data'] };

/** `data` is hidden by a focus that re-ticking its row cannot lift, so no Show button. */
export const WEB_TO_CORE_FOCUSED_FACTS_STUB: TraceFacts = { ...WEB_TO_CORE_FACTS_STUB, hidden: ['data'], showable: [] };

export const SITE_TO_STORE_HIDDEN_FACTS_STUB: TraceFacts = { ...SITE_TO_STORE_FACTS_STUB, hidden: ['bridge'] };

/** `bridge` is hidden by a tag filter, which no Show button lifts. */
export const SITE_TO_STORE_TAGGED_FACTS_STUB: TraceFacts = { ...SITE_TO_STORE_FACTS_STUB, hidden: ['bridge'], showable: [] };

export const PROTO_TO_PLAIN_HIDDEN_FACTS_STUB: TraceFacts = { ...PROTO_TO_PLAIN_FACTS_STUB, hidden: ['constructor'] };

/** `web` to `base` before `data>base` exists: all five packages. */
export const WEB_TO_BASE_FACTS_STUB: TraceFacts = {
  start: 'web',
  end: 'base',
  summary: '5 packages on the shortest path.',
  path: ['web', 'data', 'core', 'config', 'base'],
  hidden: []
};

/** After the edit adds `data>base`, the path skips `core` and `config`. */
export const WEB_TO_BASE_SHORT_FACTS_STUB: TraceFacts = {
  start: 'web',
  end: 'base',
  summary: '3 packages on the shortest path.',
  path: ['web', 'data', 'base'],
  hidden: []
};

/** `largeState()`: `pkg-299` reaches `pkg-000` through `pkg-001`, the first of the two children of `pkg-003` in name order. */
export const PKG_299_TO_000_FACTS_STUB: TraceFacts = {
  start: 'pkg-299',
  end: 'pkg-000',
  summary: '7 packages on the shortest path.',
  path: ['pkg-299', 'pkg-099', 'pkg-033', 'pkg-011', 'pkg-003', 'pkg-001', 'pkg-000'],
  hidden: []
};
