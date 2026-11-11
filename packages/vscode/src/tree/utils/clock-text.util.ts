const twoDigits = (value: number): string => String(value).padStart(2, '0');

/** Local `HH:MM` of the time `at`, zero-padded. */
export const clockOf = (at: number): string => {
  const date = new Date(at);

  return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
};
