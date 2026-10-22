/** The bundle's default export is the class, which the CJS-shaped package typings hide; only specs import it. */
declare module 'elkjs/lib/elk.bundled.js' {
  import type { ElkInstance } from 'elkjs/lib/elk-api.js';

  const elkConstructor: new () => ElkInstance;

  export default elkConstructor;
}
