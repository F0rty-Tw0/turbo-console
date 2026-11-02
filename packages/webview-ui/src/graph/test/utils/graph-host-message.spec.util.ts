import { HOST_GRAPH_STUB, HOST_TASK_STUB } from '../stubs/graph-host-message.stub.ts';

export const stateMessageOf = (state: unknown): unknown => {
  const message = { type: 'state', state };

  return message;
};

export const without = (state: object, key: string): object => {
  const kept = Object.entries(state).filter(([name]) => name !== key);

  return Object.fromEntries(kept);
};

export const graphWithTaskOf = (change: object): unknown => {
  const task = { ...HOST_TASK_STUB, ...change };
  const tasks = [task];

  return stateMessageOf({ ...HOST_GRAPH_STUB, tasks });
};
