'use client';

import { indexNowSubmit } from '../../app/admin/actions';
import { Icon } from './Icon';
import { useAct } from './ui';

export function IndexNowButton({ disabled }: { disabled: boolean }) {
  const { act, pending } = useAct();
  return (
    <button type="button" className="ad-btn ad-btn--primary" disabled={disabled || pending} aria-busy={pending} onClick={() => act(() => indexNowSubmit(), 'נשלח ל־IndexNow')}>
      <Icon name="refresh" /> שליחת כל העמודים לאינדוקס
    </button>
  );
}
