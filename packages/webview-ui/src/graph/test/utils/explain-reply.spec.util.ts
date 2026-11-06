import type { EdgeExplainResult, GraphEdgeExplainedMessage, ManifestEntry } from '../../../bridge/common/graph-message.type.ts';
import { MANIFEST_FILE_STUB } from '../stubs/manifest-entry.stub.ts';

/** The host's reply that found `entry` in `MANIFEST_FILE_STUB` for the link `source` to `target`. */
export const foundReplyOf = (source: string, target: string, entry: ManifestEntry): GraphEdgeExplainedMessage => {
  const result: EdgeExplainResult = { kind: 'found', file: MANIFEST_FILE_STUB, entries: [entry] };
  const message: GraphEdgeExplainedMessage = { type: 'edgeExplained', source, target, result };

  return message;
};
