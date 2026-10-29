# SYSTM / Delivery QA / 2026-10-27

## Automated checks

- Build completed: 18 HTML routes plus the static 404 fallback.
- Four Node test cases passed: lead validation; all local page/media links and Hebrew/H1 structure; API origin/consent/delivery behavior; unconfigured or failed provider responses.
- Tests use local injected providers. No lead was transmitted to a business, CRM or WhatsApp recipient.

## Browser checks performed

- Desktop Chromium, viewport 1363×936: homepage rendered with brand assets, local fonts, readable RTL, primary navigation and hero. No horizontal document overflow observed.
- Scroll reveal: observed hidden blocks at blur(8px)/opacity 0 and in-view blocks at blur(0px)/opacity 1. Re-entry behavior is implemented by the observer.
- Motion toggle: observed motion-off enabled and all reveal blocks visible at opacity 1.
- Contact wizard: empty service validation, service choice, step two fields, step three consent and preparation of a WhatsApp link. The result explicitly states that details have not yet been sent. The external send link was not activated.
- Service CTA preselection: automation selected on contact URL query parameter.
- Knowledge search: filtering for פיילוט yielded the relevant single article. Singular result wording corrected afterward.
- FAQ: disclosure opened and exposed the expected answer.
- Mobile layout: tested actual CSS in a same-origin srcdoc iframe with 390px frame width / 375px content width including scrollbar. Homepage, automation service and contact layout had equal document clientWidth and scrollWidth, indicating no horizontal overflow. Mobile menu opened and closed with Escape. This is a responsive layout check, not an iPhone hardware or Safari certification.
- Browser error messages observed were from the browser extension metadata bridge, not from site source. No site JavaScript exception was observed in the tested flow.

## Remaining deployment checks

Not run: physical iOS/Android testing, screen-reader audit, Lighthouse or real-user performance measurement, a live domain, a production CRM webhook or actual external message transmission. The archive makes no passing-score or accessibility-certification claim.

Source reference note: public frontend code supported the 8px / 800ms / 30% reveal specification. The reference website also produced a loading error in the inspection browser; complete visual parity was neither required nor claimed.

## Delivery status

Runnable local build and development package verified for the checks above. Production launch still requires the actual domain, contact-detail confirmation and the final environment checks listed in docs/11-LAUNCH-INPUTS-HE.md.
