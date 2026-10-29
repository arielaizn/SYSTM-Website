'use client';

import { useSyncExternalStore } from 'react';
import { motionStore, setMotionOff } from '../../lib/motion';

/** Local off switch for animations (docs/04). The OS reduced-motion setting always wins and locks the switch. */
export function MotionToggle() {
  const state = useSyncExternalStore(motionStore.subscribe, motionStore.getSnapshot, motionStore.getServerSnapshot);
  const userOff = (state & 1) === 1;
  const system = (state & 2) === 2;
  const off = userOff || system;

  return (
    <button
      type="button"
      className="motion-toggle"
      aria-pressed={off}
      disabled={system}
      aria-label={off ? 'הפעלת אנימציות' : 'כיבוי אנימציות'}
      title={system ? 'תנועה מופחתת לפי הגדרת המערכת' : off ? 'הפעלת אנימציות' : 'כיבוי אנימציות'}
      onClick={() => setMotionOff(!userOff)}
    >
      <span className="motion-toggle__label">תנועה</span>
      <span className="motion-toggle__sw" aria-hidden="true" />
    </button>
  );
}
