/** The layout algorithm's version: it enters the layout hash, so a change to how routes or positions are built drops every cached layout. */
export const LAYOUT_VERSION = 2;

/** An edge route with more bends than this is not a route: the page leaves it out of its post and the host drops it alone. */
export const ROUTE_BENDS_MAX = 64;

/** The class of an edge drawn on its ELK route: `round-segments` from its `segWeights`/`segDistances`/`srcEnd`/`tgtEnd` data. */
export const ROUTED_CLASS = 'routed';

/** How round a routed edge's corners are, in px. */
export const ROUTE_RADIUS_PX = 6;
