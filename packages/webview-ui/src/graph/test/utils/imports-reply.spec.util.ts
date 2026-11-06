import type { EdgeImportsResult, GraphEdgeImportsMessage } from '../../../bridge/common/graph-imports.type.ts';

/** The host's `edgeImports` reply carrying `result` for the link `source` to `target`. */
export const importsReplyOf = (source: string, target: string, result: EdgeImportsResult): GraphEdgeImportsMessage => {
  const reply: GraphEdgeImportsMessage = { type: 'edgeImports', source, target, result };

  return reply;
};
