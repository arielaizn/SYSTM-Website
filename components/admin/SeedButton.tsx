'use client';

import { useRouter } from 'next/navigation';
import { seedDefaults } from '../../app/admin/actions';
import { Icon } from './Icon';
import { useAct, useAdmin } from './ui';

/** Copies the site's built-in copy into Convex so it can be edited. Asks first because it replaces existing content. */
export function SeedButton({ label = 'ייבוא התוכן הקיים לעריכה', replacing = false }: { label?: string; replacing?: boolean }) {
  const { confirm } = useAdmin();
  const { act, pending } = useAct();
  const router = useRouter();
  return (
    <button
      type="button"
      className="ad-btn ad-btn--primary"
      disabled={pending}
      aria-busy={pending}
      onClick={async () => {
        const yes = await confirm({
          title: replacing ? 'להחליף את כל התוכן בתוכן המובנה?' : 'לייבא את התוכן הקיים?',
          text: replacing ? 'כל השירותים, המדריכים, השאלות וההגדרות שערכתם יוחלפו בגרסה המובנית של האתר. הלידים לא ייגעו.' : 'השירותים, המדריכים, השאלות הנפוצות וההגדרות ייכנסו למערכת ואפשר יהיה לערוך אותם. האתר ימשיך להיראות אותו דבר.',
          confirm: replacing ? 'כן, להחליף' : 'לייבא',
          danger: replacing,
        });
        if (!yes) return;
        const r = await act(() => seedDefaults(), 'התוכן יובא. עכשיו אפשר לערוך אותו');
        if (r.ok) router.refresh();
      }}
    >
      <Icon name="download" />
      {label}
    </button>
  );
}
