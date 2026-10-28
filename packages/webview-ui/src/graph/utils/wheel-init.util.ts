type WheelSource = Pick<
  WheelEvent,
  | 'altKey'
  | 'clientX'
  | 'clientY'
  | 'ctrlKey'
  | 'deltaMode'
  | 'deltaX'
  | 'deltaY'
  | 'deltaZ'
  | 'metaKey'
  | 'screenX'
  | 'screenY'
  | 'shiftKey'
>;

/** The init of a copy of a wheel: Cytoscape reads the deltas, mode and client point; the rest keep the event whole. */
export const wheelInitOf = (event: WheelSource): WheelEventInit => {
  const init: WheelEventInit = {
    deltaX: event.deltaX,
    deltaY: event.deltaY,
    deltaZ: event.deltaZ,
    deltaMode: event.deltaMode,
    clientX: event.clientX,
    clientY: event.clientY,
    screenX: event.screenX,
    screenY: event.screenY,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
    bubbles: true,
    cancelable: true
  };

  return init;
};
