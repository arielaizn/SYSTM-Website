'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { exportData, importContent, importLeads, signOutEverywhere } from '../../app/admin/actions';
import { Icon } from './Icon';
import { useAct, useAdmin } from './ui';

function download(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

export function ExportButton() {
  const { act, pending } = useAct();
  return (
    <button
      type="button"
      className="ad-btn"
      disabled={pending}
      onClick={async () => {
        const r = await act(() => exportData(), 'הגיבוי ירד');
        if (r.ok) download(`systm-backup-${new Date().toISOString().slice(0, 10)}.json`, r.data);
      }}
    >
      <Icon name="download" /> הורדת גיבוי מלא
    </button>
  );
}

/** Reads a backup file in the browser and hands the text to a server action. Always asks first. */
export function ImportButton({ kind }: { kind: 'content' | 'leads' }) {
  const input = useRef<HTMLInputElement>(null);
  const { act, pending } = useAct();
  const { confirm, toast } = useAdmin();
  const router = useRouter();

  async function onFile(file: File) {
    if (file.size > 4_000_000) return toast('הקובץ גדול מדי (עד 4MB)', 'error');
    const text = await file.text();
    const ok = await confirm(
      kind === 'content'
        ? { title: 'לשחזר תוכן מהקובץ?', text: 'כל השירותים, המדריכים, השאלות וההגדרות הקיימים יוחלפו בתוכן שבקובץ. הלידים לא ייגעו.', confirm: 'שחזור', danger: true }
        : { title: 'לייבא לידים מהקובץ?', text: 'יתווספו רק לידים שעוד לא קיימים. לידים קיימים לא ישתנו.', confirm: 'ייבוא' },
    );
    if (!ok) return;
    if (kind === 'content') {
      const r = await act(() => importContent(text), 'התוכן שוחזר');
      if (r.ok) router.refresh();
    } else {
      const r = await act(() => importLeads(text));
      if (r.ok) {
        toast(`נוספו ${r.data} לידים`);
        router.refresh();
      }
    }
  }

  return (
    <>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} onClick={(e) => ((e.target as HTMLInputElement).value = '')} />
      <button type="button" className="ad-btn" disabled={pending} onClick={() => input.current?.click()}>
        <Icon name="upload" /> {kind === 'content' ? 'שחזור תוכן מקובץ' : 'ייבוא לידים מקובץ'}
      </button>
    </>
  );
}

export function SignOutEverywhere() {
  const { act, pending } = useAct();
  const { confirm } = useAdmin();
  const router = useRouter();
  return (
    <button
      type="button"
      className="ad-btn ad-btn--danger"
      disabled={pending}
      onClick={async () => {
        if (!(await confirm({ title: 'לצאת מכל המכשירים?', text: 'כל ההתחברויות, כולל זו, יפוגו. תצטרכו להיכנס שוב עם הסיסמה.', confirm: 'יציאה מהכול', danger: true }))) return;
        const r = await act(() => signOutEverywhere());
        if (r.ok) router.replace('/admin/login');
      }}
    >
      <Icon name="logout" /> יציאה מכל המכשירים
    </button>
  );
}
