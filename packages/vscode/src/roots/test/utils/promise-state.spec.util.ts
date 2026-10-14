/** Whether `promise` has settled once pending callbacks ran: `'granted'`, `'rejected'` or `'waiting'`. */
export const stateOf = async (promise: Promise<unknown>): Promise<string> => {
  const outcome = promise.then(
    () => 'granted',
    () => 'rejected'
  );
  const waiting = new Promise<string>((resolve) => {
    setTimeout(resolve, 0, 'waiting');
  });

  return Promise.race([outcome, waiting]);
};
