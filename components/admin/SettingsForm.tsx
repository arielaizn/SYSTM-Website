'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { settingsSave } from '../../app/admin/actions';
import { Counter, useUnsavedGuard } from './editors';
import { Icon } from './Icon';
import { Switch, useAct } from './ui';

export type SettingsInput = {
  phone: string;
  phoneDisplay: string;
  whatsapp: string;
  email: string;
  description: string;
  socials: { label: string; href: string }[];
  banner: { enabled: boolean; text: string; href: string };
};

export function SettingsForm({ initial }: { initial: SettingsInput }) {
  const router = useRouter();
  const { act, pending } = useAct();
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = useMemo(() => JSON.stringify(s) !== JSON.stringify(saved), [s, saved]);
  useUnsavedGuard(dirty);
  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) => setS((p) => ({ ...p, [k]: v }));

  async function save() {
    const data = { ...s, socials: s.socials.filter((x) => x.label.trim() && x.href.trim()) };
    const r = await act(() => settingsSave(data), 'נשמר, והאתר מתעדכן');
    if (r.ok) {
      setS(data);
      setSaved(data);
      router.refresh();
    }
  }

  return (
    <div className="ad-editor">
      <div className="ad-card">
        <div className="ad-card__head">
          <h2>פרטי קשר</h2>
          <p>מופיעים בפוטר, בעמוד הקשר ובכפתורי הוואטסאפ</p>
        </div>
        <div className="ad-row ad-row--2">
          <label className="ad-field">
            <span>טלפון (לחיוג)</span>
            <input className="ad-input ltr" dir="ltr" value={s.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+972534122548" />
          </label>
          <label className="ad-field">
            <span>טלפון (איך מוצג)</span>
            <input className="ad-input ltr" dir="ltr" value={s.phoneDisplay} onChange={(e) => set('phoneDisplay', e.target.value)} placeholder="053-412-2548" />
          </label>
          <label className="ad-field">
            <span>מספר וואטסאפ</span>
            <input className="ad-input ltr" dir="ltr" value={s.whatsapp} onChange={(e) => set('whatsapp', e.target.value.replace(/\D/g, ''))} placeholder="972534122548" />
            <small>ספרות בלבד, עם קידומת מדינה ובלי פלוס. כך נבנים קישורי wa.me.</small>
          </label>
          <label className="ad-field">
            <span>אימייל (לא חובה)</span>
            <input className="ad-input ltr" dir="ltr" type="email" value={s.email} onChange={(e) => set('email', e.target.value)} />
            <small>אם ריק, האתר לא מציג אימייל.</small>
          </label>
        </div>
        <label className="ad-field">
          <span>תיאור האתר</span>
          <textarea className="ad-textarea" rows={2} value={s.description} onChange={(e) => set('description', e.target.value)} maxLength={400} />
          <small>ברירת המחדל לתיאור בגוגל ובשיתוף ברשתות.</small>
          <Counter value={s.description} max={400} />
        </label>
      </div>

      <div className="ad-card">
        <div className="ad-card__head">
          <h2>רשתות חברתיות</h2>
          <p>מופיעות בפוטר כשיש לפחות אחת</p>
        </div>
        <div className="ad-array">
          {s.socials.map((x, i) => (
            <div className="ad-array__row" key={i} style={{ gridTemplateColumns: '1fr 2fr auto' }}>
              <input className="ad-input" placeholder="שם (למשל לינקדאין)" value={x.label} onChange={(e) => set('socials', s.socials.map((y, k) => (k === i ? { ...y, label: e.target.value } : y)))} aria-label={`שם הרשת ${i + 1}`} />
              <input className="ad-input ltr" dir="ltr" placeholder="https://…" value={x.href} onChange={(e) => set('socials', s.socials.map((y, k) => (k === i ? { ...y, href: e.target.value } : y)))} aria-label={`קישור ${i + 1}`} />
              <button type="button" className="ad-btn ad-btn--icon ad-btn--ghost" aria-label="הסרה" onClick={() => set('socials', s.socials.filter((_, k) => k !== i))}>
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>
        {s.socials.length < 8 ? (
          <button type="button" className="ad-btn ad-btn--sm" style={{ justifySelf: 'start' }} onClick={() => set('socials', [...s.socials, { label: '', href: '' }])}>
            <Icon name="plus" /> הוספת רשת
          </button>
        ) : null}
      </div>

      <div className="ad-card">
        <div className="ad-card__head">
          <h2>הודעה בראש האתר</h2>
          <Switch checked={s.banner.enabled} onChange={(v) => set('banner', { ...s.banner, enabled: v })}>
            פעילה
          </Switch>
        </div>
        <div className="ad-row ad-row--2">
          <label className="ad-field">
            <span>הטקסט</span>
            <input className="ad-input" value={s.banner.text} onChange={(e) => set('banner', { ...s.banner, text: e.target.value })} maxLength={200} placeholder="סדנה חדשה נפתחת בחודש הבא" />
            <Counter value={s.banner.text} max={200} />
          </label>
          <label className="ad-field">
            <span>קישור (לא חובה)</span>
            <input className="ad-input ltr" dir="ltr" value={s.banner.href} onChange={(e) => set('banner', { ...s.banner, href: e.target.value })} placeholder="/workshops/ או https://…" />
            <small>נתיב באתר או כתובת https.</small>
          </label>
        </div>
        {s.banner.text ? (
          <div className="ad-field">
            <span>כך זה ייראה</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: 12, border: '1px solid rgb(172 244 248 / 0.28)', background: 'linear-gradient(90deg, rgb(172 244 248 / 0.16), rgb(172 244 248 / 0.07)), #0b1215', fontSize: 14, opacity: s.banner.enabled ? 1 : 0.5 }}>
              {s.banner.text}
            </div>
            {!s.banner.enabled ? <small>ההודעה כבויה ולא מוצגת באתר.</small> : null}
          </div>
        ) : null}
      </div>

      <div className="ad-sticky-save">
        <span>{dirty ? 'יש שינויים שלא נשמרו' : 'הכול שמור'}</span>
        <button type="button" className="ad-btn ad-btn--primary" disabled={pending || !dirty} aria-busy={pending} onClick={save}>
          {pending ? 'שומרים...' : 'שמירה'}
        </button>
      </div>
    </div>
  );
}
