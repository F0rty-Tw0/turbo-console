export const stateMessageOf = (state: unknown): unknown => {
  const message = { type: 'state', state };

  return message;
};

export const without = (state: object, key: string): object => {
  const kept = Object.entries(state).filter(([name]) => name !== key);

  return Object.fromEntries(kept);
};
