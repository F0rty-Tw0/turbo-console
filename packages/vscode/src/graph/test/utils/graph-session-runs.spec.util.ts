import type {
  GraphAtomsMessage,
  GraphHostMessage,
  GraphRunsMessage,
  GraphShowRequest,
  GraphShowTasksMessage
} from '@turbo-console/webview-ui';

import { postedOf } from './graph-session.spec.util.ts';
import type { GraphPorts } from '../../common/graph.type.ts';

const isRuns = (message: GraphHostMessage): message is GraphRunsMessage => message.type === 'runs';

const isAtoms = (message: GraphHostMessage): message is GraphAtomsMessage => message.type === 'atoms';

const isShowTasks = (message: GraphHostMessage): message is GraphShowTasksMessage => message.type === 'showTasks';

const isShow = (message: GraphHostMessage): message is GraphShowRequest => {
  return message.type === 'showTasks' || message.type === 'showPackage';
};

/** The `runs` messages posted so far, in order, with their `owners`. */
export const postedRunsMessagesOf = (ports: GraphPorts): GraphRunsMessage[] => postedOf(ports).filter(isRuns);

/** The `runs` maps posted so far, in order. */
export const postedRunsOf = (ports: GraphPorts): GraphRunsMessage['runs'][] => {
  const messages = postedRunsMessagesOf(ports);

  return messages.map((message) => message.runs);
};

/** The `atoms` messages posted so far, in order. */
export const postedAtomsOf = (ports: GraphPorts): GraphAtomsMessage[] => postedOf(ports).filter(isAtoms);

/** The `showTasks` messages posted so far, in order. */
export const postedShowTasksOf = (ports: GraphPorts): GraphShowTasksMessage[] => postedOf(ports).filter(isShowTasks);

/** The `showTasks` and `showPackage` messages posted so far, in order. */
export const postedShowsOf = (ports: GraphPorts): GraphShowRequest[] => postedOf(ports).filter(isShow);

/** The `type` of every message posted so far, in order. */
export const postedTypesOf = (ports: GraphPorts): string[] => postedOf(ports).map((message) => message.type);
