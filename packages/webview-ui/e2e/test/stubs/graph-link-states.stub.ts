import type { EdgeStates, NodeStates } from '../../common/graph.type.ts';

/** The link `web → ui` tapped: both ends lit, everything else dimmed. */
export const WEB_UI_NODES_STUB: NodeStates = {
  web: 'highlighted',
  ui: 'highlighted',
  admin: 'dimmed',
  docs: 'dimmed',
  data: 'dimmed',
  core: 'dimmed',
  config: 'dimmed',
  base: 'dimmed',
  solo: 'dimmed'
};

/** The link `web → ui` selected, the other seven links dimmed. */
export const WEB_UI_EDGES_STUB: EdgeStates = {
  'web>ui': 'selected',
  'web>data': 'dimmed',
  'admin>ui': 'dimmed',
  'docs>web': 'dimmed',
  'ui>core': 'dimmed',
  'data>core': 'dimmed',
  'core>config': 'dimmed',
  'config>base': 'dimmed'
};
