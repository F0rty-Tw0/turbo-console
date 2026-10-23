import type { GraphHostMessage, GraphRunsMessage, GraphShowTasksMessage } from '@turbo-console/webview-ui';

import { postedOf } from './graph-session.spec.util.ts';
import type { GraphPorts } from '../../common/graph.type.ts';

const isRuns = (message: GraphHostMessage): message is GraphRunsMessage => message.type === 'runs';

const isShowTasks = (message: GraphHostMessage): message is GraphShowTasksMessage => message.type === 'showTasks';

/** The `runs` maps posted so far, in order. */
export const postedRunsOf = (ports: GraphPorts): GraphRunsMessage['runs'][] => {
  const messages = postedOf(ports).filter(isRuns);

  return messages.map((message) => message.runs);
};

/** The `showTasks` messages posted so far, in order. */
export const postedShowTasksOf = (ports: GraphPorts): GraphShowTasksMessage[] => postedOf(ports).filter(isShowTasks);

/** The `type` of every message posted so far, in order. */
export const postedTypesOf = (ports: GraphPorts): string[] => postedOf(ports).map((message) => message.type);
