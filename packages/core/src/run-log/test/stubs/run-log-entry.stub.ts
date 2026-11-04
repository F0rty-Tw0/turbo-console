import type { RunLogEntry } from '../../common/run-log.type.ts';

export const RUN_LOG_ENTRY_STUB: RunLogEntry = {
  timestamp: 0,
  source: '@acme/lib#build',
  level: 'stdout',
  text: 'line'
};
