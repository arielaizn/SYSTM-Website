'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useContent } from '../layout/ContentContext';
import { buildWhatsAppText, validateLead, type LeadErrors } from '../../lib/lead';
import { site, waLinkFor } from '../../lib/config';
import { ArrowUpLeft, Check } from '../ui/Icons';

type Values = { service: string; name: string; phone: string; email: string; company: string; message: string; consent: boolean; website: string };
const empty: Values = { service: '', name: '', phone: '', email: '', company: '', message: '', consent: false, website: '' };

const STEP_FIELDS: Record<number, (keyof LeadErrors)[]> = {
  1: ['service'],
  2: ['name', 'phone', 'email'],
  3: ['consent'],
};

const STEP_TITLES = ['מה היית רוצה לקדם?', 'נעים להכיר.', 'מה היית רוצה לשפר?'];

type Result = { kind: 'whatsapp'; href: string; text: string } | { kind: 'sent' } | { kind: 'failed'; href: string };

/**
 * Three-step contact form. In WhatsApp mode it only prepares a message and says plainly that nothing was sent.
 * In webhook mode it reports success only when /api/leads answered 2xx. Nothing is stored in the browser.
 */
export function ContactWizard() {
  const { contactChoices, settings } = useContent();
  const waLink = (text: string) => waLinkFor(settings.whatsapp, text);
  const [step, setStep] = useState(1);
  const [v, setV] = useState<Values>(empty);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const wanted = new URLSearchParams(location.search).get('service');
    if (wanted && contactChoices.some((c) => c.value === wanted)) setV((p) => ({ ...p, service: wanted }));
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    heading.current?.focus();
  }, [step, result]);

  const set = <K extends keyof Values>(k: K, val: Values[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errors[k as keyof LeadErrors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const check = (n: number) => {
    const res = validateLead({ ...v });
    const found: LeadErrors = {};
    if (!res.ok) for (const k of STEP_FIELDS[n]) if (res.errors[k]) found[k] = res.errors[k];
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const serviceLabel = contactChoices.find((c) => c.value === v.service)?.label ?? '';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!check(step)) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"], .wizard__choices input')?.focus());
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    for (const n of [1, 2]) {
      if (!check(n)) {
        setStep(n);
        return;
      }
    }
    if (v.website) return; // honeypot: a person never sees this field
    const text = buildWhatsAppText(v, serviceLabel);
    if (site.contactMode === 'webhook') {
      setBusy(true);
      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(v),
          signal: AbortSignal.timeout(12000),
        });
        setResult(res.ok ? { kind: 'sent' } : { kind: 'failed', href: waLink(text) });
      } catch {
        setResult({ kind: 'failed', href: waLink(text) });
      } finally {
        setBusy(false);
      }
    } else {
      setResult({ kind: 'whatsapp', href: waLink(text), text });
    }
  }

  if (result) {
    return (
      <div className="wizard__result" role="status" aria-live="polite">
        <span className="wizard__check">
          <Check />
        </span>
        {result.kind === 'whatsapp' ? (
          <>
            <h2 tabIndex={-1} ref={heading} className="h-md">
              ההודעה מוכנה.
            </h2>
            <p className="muted">הפרטים עדיין לא נשלחו. פתחו את ההודעה ב־WhatsApp, בדקו אותה ושלחו כשנוח לכם.</p>
            <textarea className="wizard__preview" readOnly value={result.text} rows={7} aria-label="תצוגה מקדימה של ההודעה" />
            <div className="wizard__row">
              <a className="btn btn--ice" href={result.href} target="_blank" rel="noopener noreferrer">
                <span>פתיחה ב־WhatsApp</span>
                <ArrowUpLeft />
              </a>
              <button type="button" className="wizard__back" onClick={() => setResult(null)}>
                חזרה לעריכה
              </button>
            </div>
          </>
        ) : result.kind === 'sent' ? (
          <>
            <h2 tabIndex={-1} ref={heading} className="h-md">
              הפנייה התקבלה.
            </h2>
            <p className="muted">נחזור אליכם בהקדם לטלפון שהשארתם.</p>
          </>
        ) : (
          <>
            <h2 tabIndex={-1} ref={heading} className="h-md">
              הפנייה לא עברה.
            </h2>
            <p className="muted">אפשר לנסות שוב, או לשלוח את אותה הודעה ישירות ב־WhatsApp.</p>
            <div className="wizard__row">
              <a className="btn btn--ice" href={result.href} target="_blank" rel="noopener noreferrer">
                <span>שליחה ב־WhatsApp</span>
                <ArrowUpLeft />
              </a>
              <button type="button" className="wizard__back" onClick={() => setResult(null)}>
                ניסיון נוסף
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const err = (k: keyof LeadErrors) => errors[k];

  return (
    <form className="wizard" noValidate onSubmit={onSubmit} aria-labelledby="wizard-title">
      <div className="wizard__top">
        <span aria-live="polite">שלב {step} מתוך 3</span>
        <div className="wizard__bar" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label="התקדמות בטופס">
          {[1, 2, 3].map((n) => (
            <i key={n} data-on={n <= step} />
          ))}
        </div>
      </div>

      <h2 id="wizard-title" ref={heading} tabIndex={-1} className="h-md wizard__title">
        {STEP_TITLES[step - 1]}
      </h2>

      {step === 1 ? (
        <fieldset className="wizard__choices">
          <legend className="sr-only">בחירת כיוון לפנייה</legend>
          {contactChoices.map((c) => (
            <label key={c.value} className="choice">
              <input type="radio" name="service" value={c.value} checked={v.service === c.value} onChange={() => set('service', c.value)} aria-describedby={err('service') ? 'e-service' : undefined} />
              <span>{c.label}</span>
              <ArrowUpLeft />
            </label>
          ))}
          {err('service') ? (
            <p id="e-service" className="wizard__error" role="alert">
              {err('service')}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {step === 2 ? (
        <div className="wizard__grid">
          <label>
            שם מלא
            <input name="name" autoComplete="name" maxLength={100} value={v.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!err('name')} aria-describedby={err('name') ? 'e-name' : undefined} />
            {err('name') ? (
              <small id="e-name" className="wizard__error" role="alert">
                {err('name')}
              </small>
            ) : null}
          </label>
          <label>
            טלפון
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} dir="ltr" value={v.phone} onChange={(e) => set('phone', e.target.value)} aria-invalid={!!err('phone')} aria-describedby={err('phone') ? 'e-phone' : undefined} />
            {err('phone') ? (
              <small id="e-phone" className="wizard__error" role="alert">
                {err('phone')}
              </small>
            ) : null}
          </label>
          <label>
            אימייל <span className="muted">(לא חובה)</span>
            <input name="email" type="email" autoComplete="email" maxLength={180} dir="ltr" value={v.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!err('email')} aria-describedby={err('email') ? 'e-email' : undefined} />
            {err('email') ? (
              <small id="e-email" className="wizard__error" role="alert">
                {err('email')}
              </small>
            ) : null}
          </label>
          <label>
            שם העסק <span className="muted">(לא חובה)</span>
            <input name="company" autoComplete="organization" maxLength={120} value={v.company} onChange={(e) => set('company', e.target.value)} />
          </label>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="wizard__stack">
          <label>
            כמה מילים על העבודה שלך
            <textarea name="message" rows={5} maxLength={3000} placeholder="איזה תהליך חוזר על עצמו? מה מעכב אתכם?" value={v.message} onChange={(e) => set('message', e.target.value)} />
          </label>
          <label className="consent">
            <input type="checkbox" name="consent" checked={v.consent} onChange={(e) => set('consent', e.target.checked)} aria-invalid={!!err('consent')} aria-describedby={err('consent') ? 'e-consent' : undefined} />
            <span>
              קראתי את{' '}
              <a href="/privacy/" target="_blank" rel="noopener noreferrer">
                מדיניות הפרטיות
              </a>{' '}
              ואני מסכים/ה להעברת הפרטים לצורך מענה לפנייה.
            </span>
          </label>
          {err('consent') ? (
            <p id="e-consent" className="wizard__error" role="alert">
              {err('consent')}
            </p>
          ) : null}
          <p className="wizard__note">
            {site.contactMode === 'webhook' ? 'הפנייה תישלח אלינו, ונחזור אליכם לטלפון שהשארתם.' : 'בשלב הבא תיפתח הודעת WhatsApp מוכנה. אפשר לבדוק ולערוך אותה לפני שליחה.'}
          </p>
          <div className="wizard__trap" aria-hidden="true">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" name="website" value={v.website} onChange={(e) => set('website', e.target.value)} />
            </label>
          </div>
        </div>
      ) : null}

      <div className="wizard__row">
        <button type="submit" className="btn btn--ice" disabled={busy}>
          <span>{step === 3 ? (site.contactMode === 'webhook' ? (busy ? 'שולחים...' : 'שליחת פנייה') : 'להמשך בוואטסאפ') : 'המשך'}</span>
          <ArrowUpLeft />
        </button>
        {step > 1 ? (
          <button type="button" className="wizard__back" onClick={() => setStep(step - 1)}>
            חזרה
          </button>
        ) : null}
      </div>
    </form>
  );
}
