'use client';

import { useState } from 'react';

type State = { status: 'idle' | 'sending' | 'done' | 'error'; message?: string };

/** Lead form of a landing page. Posts to /api/leads with source "lp:<slug>", so the lead shows up in the admin inbox tagged by page. */
export function LandingForm({ slug, service, button, preview }: { slug: string; service: string; button: string; preview?: boolean }) {
  const [state, setState] = useState<State>({ status: 'idle' });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview) return;
    const f = new FormData(e.currentTarget);
    setState({ status: 'sending' });
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ service, name: f.get('name'), phone: f.get('phone'), email: f.get('email'), company: '', message: f.get('message') ?? '', consent: f.get('consent') === 'on', website: f.get('website'), source: `lp:${slug}` }),
      });
      if (res.ok) setState({ status: 'done' });
      else setState({ status: 'error', message: res.status === 422 ? 'בדקו שהשם והטלפון תקינים ואשרו את העברת הפרטים.' : 'לא הצלחנו לשלוח. אפשר לנסות שוב, או לכתוב לנו בוואטסאפ.' });
    } catch {
      setState({ status: 'error', message: 'אין חיבור. נסו שוב בעוד רגע.' });
    }
  }

  if (state.status === 'done')
    return (
      <p className="lp-form__done" role="status">
        תודה, קיבלנו. נחזור אליכם בהקדם.
      </p>
    );

  return (
    <form className="lp-form" onSubmit={onSubmit} noValidate={false}>
      <label>
        <span>שם מלא</span>
        <input name="name" autoComplete="name" required minLength={2} maxLength={100} />
      </label>
      <label>
        <span>טלפון</span>
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required dir="ltr" maxLength={30} />
      </label>
      <label>
        <span>אימייל (לא חובה)</span>
        <input name="email" type="email" autoComplete="email" dir="ltr" maxLength={180} />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="lp-form__hp" />
      <label className="lp-form__consent">
        <input name="consent" type="checkbox" required />
        <span>אני מאשר/ת להעביר את הפרטים כדי שיחזרו אליי.</span>
      </label>
      {state.status === 'error' ? (
        <p className="lp-form__err" role="alert">
          {state.message}
        </p>
      ) : null}
      <button className="btn btn--ice" type="submit" disabled={state.status === 'sending'} aria-busy={state.status === 'sending'}>
        <span>{state.status === 'sending' ? 'שולח…' : button}</span>
      </button>
    </form>
  );
}
