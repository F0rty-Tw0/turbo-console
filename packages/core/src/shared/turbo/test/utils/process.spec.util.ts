/** Signal 0 only probes whether `pid` still exists. */
export const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
};
