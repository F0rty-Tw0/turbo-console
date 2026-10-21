/** elk-api.d.ts is CJS-shaped under nodenext: its default import is the module, but the bundle's is the class. */
declare module 'elkjs/lib/elk-api.js' {
  export type ElkEdge = {
    readonly id: string;
    readonly sources: string[];
    readonly targets: string[];
  };

  export type ElkNode = {
    readonly id: string;
    readonly x?: number;
    readonly y?: number;
    readonly width?: number;
    readonly height?: number;
    readonly layoutOptions?: Readonly<Record<string, string>>;
    readonly children?: ElkNode[];
    readonly edges?: ElkEdge[];
  };

  export type ElkInstance = {
    layout(graph: ElkNode): Promise<ElkNode>;
    terminateWorker(): void;
  };

  export type ElkOptions = {
    readonly workerFactory: () => Worker;
  };

  const elkConstructor: new (options: ElkOptions) => ElkInstance;

  export default elkConstructor;
}
