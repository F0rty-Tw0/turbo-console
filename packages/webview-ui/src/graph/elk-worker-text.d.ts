/** The build's `elk-worker-text` plugin loads this file as text, so the default import is the worker source. */
declare module 'elkjs/lib/elk-worker.min.js' {
  const source: string;

  export default source;
}
