import type { KeepClearTrigger } from '../common/keep-clear.type.ts';

/** Whether `trigger` pans the anchors clear of the overlay: only an open panel in overlay mode, never on restore or refresh. */
export const shouldKeepClear = (trigger: KeepClearTrigger, isOverlay: boolean, isOpen: boolean): boolean => {
  const isMove = trigger !== 'restore' && trigger !== 'refresh';

  return isOverlay && isOpen && isMove;
};
