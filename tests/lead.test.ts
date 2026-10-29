import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWhatsAppText, validateLead } from '../lib/lead.ts';

const good = { service: 'automation', name: 'דנה כהן', phone: '053-412-2548', email: '', company: '', message: 'ליד שנופל בין הכיסאות', consent: true, website: '' };

test('accepts a complete lead and trims fields', () => {
  const r = validateLead({ ...good, name: '  דנה כהן  ' });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.data.name, 'דנה כהן');
    assert.equal(r.data.consent, true);
  }
});

test('rejects an unknown service, short name and short phone', () => {
  const r = validateLead({ ...good, service: 'hack', name: 'ד', phone: '12345' });
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ['name', 'phone', 'service']);
});

test('phone accepts separators and a plus sign but not letters', () => {
  assert.equal(validateLead({ ...good, phone: '+972 53-412-2548' }).ok, true);
  assert.equal(validateLead({ ...good, phone: '053abc4122548' }).ok, false);
});

test('email is optional but must be valid when present', () => {
  assert.equal(validateLead({ ...good, email: 'dana@example.co.il' }).ok, true);
  assert.equal(validateLead({ ...good, email: 'dana@' }).ok, false);
});

test('explicit consent is mandatory (a string "true" is not consent)', () => {
  assert.equal(validateLead({ ...good, consent: false }).ok, false);
  assert.equal(validateLead({ ...good, consent: 'true' }).ok, false);
  assert.equal(validateLead({ ...good, consent: undefined }).ok, false);
});

test('a filled honeypot is rejected', () => {
  const r = validateLead({ ...good, website: 'http://spam.example' });
  assert.equal(r.ok, false);
});

test('garbage input never throws', () => {
  for (const x of [null, undefined, 42, 'x', [], {}]) assert.equal(validateLead(x).ok, false);
});

test('over-long fields are cut to their limits', () => {
  const r = validateLead({ ...good, message: 'א'.repeat(5000) });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.data.message.length, 3000);
});

test('WhatsApp text lists what was entered and omits empty optional lines', () => {
  const text = buildWhatsAppText({ name: 'דנה כהן', phone: '053-412-2548', email: '', company: '', message: '' }, 'אוטומציות לעסקים');
  assert.match(text, /מעניין אותי: אוטומציות לעסקים/);
  assert.match(text, /שם: דנה כהן/);
  assert.doesNotMatch(text, /אימייל|העסק:/);
});
