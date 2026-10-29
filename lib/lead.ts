// Lead validation shared by the browser form and the /api/leads route. Pure functions, no framework imports,
// so node:test can run them directly.

export const SERVICE_VALUES = ['ai-agents', 'automation', 'consulting', 'workshops', 'claude-code', 'not-sure'] as const;
export type ServiceValue = (typeof SERVICE_VALUES)[number];

export type Lead = {
  service: ServiceValue;
  name: string;
  phone: string;
  email: string;
  company: string;
  message: string;
  consent: true;
};

export type LeadErrors = Partial<Record<keyof Lead | 'website', string>>;

const LIMITS = { name: 100, phone: 30, email: 180, company: 120, message: 3000 } as const;

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function phoneDigits(phone: string) {
  return phone.replace(/\D/g, '');
}

export function validateLead(input: unknown): { ok: true; data: Lead } | { ok: false; errors: LeadErrors } {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const errors: LeadErrors = {};

  const service = clean(raw.service, 40) as ServiceValue;
  if (!SERVICE_VALUES.includes(service)) errors.service = 'בחרו כיוון לפנייה כדי להמשיך.';

  const name = clean(raw.name, LIMITS.name);
  if (name.length < 2) errors.name = 'כתבו שם מלא.';

  const phone = clean(raw.phone, LIMITS.phone);
  const digits = phoneDigits(phone);
  if (digits.length < 8 || digits.length > 15 || !/^[\d\s()+\-]+$/.test(phone)) errors.phone = 'יש להזין מספר טלפון תקין.';

  const email = clean(raw.email, LIMITS.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'כתובת האימייל אינה תקינה.';

  const company = clean(raw.company, LIMITS.company);
  const message = clean(raw.message, LIMITS.message);

  if (raw.consent !== true) errors.consent = 'כדי להמשיך צריך לאשר את העברת הפרטים.';
  if (clean(raw.website, 100)) errors.website = 'spam';

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { service, name, phone, email, company, message, consent: true } };
}

export function buildWhatsAppText(lead: Pick<Lead, 'name' | 'phone' | 'email' | 'company' | 'message'>, serviceLabel: string) {
  return [
    'היי אריאל, הגעתי דרך האתר של SYSTM.',
    '',
    `מעניין אותי: ${serviceLabel}`,
    `שם: ${lead.name}`,
    `טלפון: ${lead.phone}`,
    lead.email ? `אימייל: ${lead.email}` : '',
    lead.company ? `העסק: ${lead.company}` : '',
    lead.message ? `\nמה הייתי רוצה לשפר:\n${lead.message}` : '',
  ]
    .filter((line, i, all) => line !== '' || (i > 0 && all[i - 1] !== ''))
    .join('\n')
    .trim();
}
