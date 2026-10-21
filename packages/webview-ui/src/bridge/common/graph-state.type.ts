/** `source` is the dependent package, `target` the dependency it needs. */
export type GraphEdge = {
  readonly source: string;
  readonly target: string;
};

/** Where a node centre sits. */
export type Position = {
  readonly x: number;
  readonly y: number;
};

/** Node centres by package name (Cytoscape `preset` convention). */
export type Positions = Readonly<Record<string, Position>>;

type GraphLoading = { readonly kind: 'loading' };

type GraphError = {
  readonly kind: 'error';
  readonly message: string;
};

type GraphSinglePackage = { readonly kind: 'singlePackage' };

export type GraphReady = {
  readonly kind: 'graph';
  readonly hash: string;
  readonly packages: string[];
  readonly edges: GraphEdge[];
  readonly positions: Positions | null;
};

export type GraphState = GraphLoading | GraphError | GraphSinglePackage | GraphReady;
