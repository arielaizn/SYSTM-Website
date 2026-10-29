// Same-document page transitions. router.push() resolves asynchronously, so the View Transition promise is
// held open until the new route has committed (settleTransition is called from RouteEffects on pathname change).
type Router = { push: (href: string) => void };

let pending: (() => void) | null = null;

export function navigate(router: Router, href: string) {
  const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => unknown };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const samePage = href.split('#')[0] === location.pathname && !href.includes('?');
  if (!doc.startViewTransition || reduced || samePage) {
    router.push(href);
    return;
  }
  doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        pending = resolve;
        router.push(href);
        // Never leave the page frozen behind a transition that cannot finish.
        setTimeout(() => {
          if (pending === resolve) {
            pending = null;
            resolve();
          }
        }, 1500);
      }),
  );
}

export function settleTransition() {
  if (!pending) return;
  const resolve = pending;
  pending = null;
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
}
