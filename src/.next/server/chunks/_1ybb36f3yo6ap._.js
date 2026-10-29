(()=>{"use strict";module.exports=[57876,e=>{let t=`
const OFFLINE = '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>אין חיבור</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#0a1013;color:#f1f5f6;font-family:system-ui,sans-serif;text-align:center;padding:24px}h1{font-size:26px;margin:0 0 8px}p{color:#9fb0b6;margin:0 0 22px}button{font:inherit;background:#acf4f8;color:#04181a;border:0;border-radius:14px;padding:14px 26px;font-weight:700}</style><div><h1>אין חיבור כרגע</h1><p>הנתונים נטענים מהשרת. נסו שוב כשיש רשת.</p><button onclick="location.reload()">ניסיון נוסף</button></div></html>';
const STATIC = 'systm-admin-static-v1';

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== STATIC) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(caches.open(STATIC).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (req.mode === 'navigate' && url.pathname.startsWith('/admin')) {
    e.respondWith(fetch(req).catch(() => new Response(OFFLINE, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } })));
  }
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'SYSTM', {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag || 'systm',
      dir: 'rtl',
      lang: 'he',
      data: { url: d.url || '/admin/leads/' },
    });
    if (self.navigator && self.navigator.setAppBadge) { try { await self.navigator.setAppBadge(); } catch (_) {} }
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/admin/leads/';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes('/admin')) { await c.focus(); if ('navigate' in c) await c.navigate(url); return; }
    }
    await self.clients.openWindow(url);
  })());
});
`;e.s(["GET",0,function(){return new Response(t,{headers:{"content-type":"application/javascript; charset=utf-8","service-worker-allowed":"/admin/","cache-control":"no-cache, no-store, must-revalidate"}})}])},14137,e=>{var t=e.i(47909),a=e.i(74017),r=e.i(96250),n=e.i(59756),i=e.i(61916),s=e.i(74677),o=e.i(69741),l=e.i(16795),c=e.i(87718),d=e.i(95169),u=e.i(47587),p=e.i(66012),h=e.i(70101),f=e.i(26937),m=e.i(10372),w=e.i(93695),v=e.i(9580);e.i(52474);var g=e.i(220);let y=new t.AppRouteRouteModule({definition:{kind:a.f.APP_ROUTE,page:"/admin/sw.js/route",pathname:"/admin/sw.js",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/admin/sw.js/route.ts",nextConfigOutput:"",userland:()=>e.r(57876),...{}}),{workAsyncStorage:x,workUnitAsyncStorage:R,serverHooks:E}=y;async function b(e,t,a){a.requestMeta&&(0,n.R)(e,a.requestMeta),y.isDev&&(0,n.i)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let r="/admin/sw.js/route";r=r.replace(/\/index$/,"")||"/";let{instrumentation:s}=await y.ensureInstrumentation(e,{deferSpans:!0});return y.traceRequest(e,{tracer:(0,i.v)(),spanName:`${e.method||"GET"} ${r}`,httpTarget:e.url,instrumentation:s},(n,i)=>T(e,t,a,r,!1,n,i))}async function T(e,t,r,x,R,E,b){let T=await y.prepare(e,t,{srcPage:x,multiZoneDraftMode:R});if(!T)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:C,deploymentId:A,params:k,nextConfig:U,parsedUrl:P,isDraftMode:S,prerenderManifest:q,routerServerContext:O,isOnDemandRevalidate:I,revalidateOnlyGenerated:L,resolvedPathname:_,clientReferenceManifest:j,serverActionsManifest:M,previewProps:N}=T,D=(0,o.f)(x),G=!!q.routes[_]&&(y.isDev||(0,v.f)(_,y.cacheOwner,q.routes[_])),F=!!(q.dynamicRoutes[D]||G),H=async()=>((null==O?void 0:O.render404)?await O.render404(e,t,P,!1):t.end("This page could not be found"),null);if(F&&!S){let e=q.dynamicRoutes[D];if(e&&!1===e.fallback&&!G){if(U.adapterPath)return await H();throw new w.NoFallbackError}}let W=null;!F||y.isDev||S||(W="/index"===(W=_)?"/":W),M&&j&&(0,s.f)({page:x,clientReferenceManifest:j,serverActionsManifest:M});let $=e.method||"GET",B=(0,i.v)(),K=!!(null==O?void 0:O.isWrappedByNextServer),J=!!(0,n.w)(e,"minimalMode"),Q=(0,n.w)(e,"incrementalCache")||await y.getIncrementalCache(e,U,N,q,J);null==Q||Q.resetRequestCache(),globalThis.__incrementalCache=Q;let V={params:k,previewProps:N,renderOpts:{experimental:{authInterrupts:!!U.experimental.authInterrupts,useCacheTimeout:U.experimental.useCacheTimeout,durableUseCacheEntries:!!U.experimental.durableUseCacheEntries},cacheComponents:!!U.cacheComponents,validationLevel:U.experimental.instantInsights.validationLevel,isDraftMode:S,incrementalCache:Q,hmrRefreshHash:(0,n.w)(e,"hmrRefreshHash"),cacheLifeProfiles:U.cacheLife,staticPageGenerationTimeout:U.staticPageGenerationTimeout,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0},sharedContext:{buildId:C,deploymentId:A}},z=new l.x(e),Y=new l.e(t),X=c.k.fromNodeNextRequest(z,(0,c.t)(t)),Z=async({previousCacheEntry:a})=>{try{if(!J&&I&&L&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=null===W?await y.handle(X,V):await y.prerender(X,V);e.fetchMetrics=V.renderOpts.fetchMetrics;let i=V.renderOpts.pendingWaitUntil;i&&r.waitUntil&&(r.waitUntil(i),i=void 0);let s=V.renderOpts.collectedTags;if(!F)return await (0,p.f)(z,Y,n,i),null;{let e=await n.blob(),t=(0,h.S)(n.headers);s&&(t[m.M]=s),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==V.renderOpts.collectedRevalidate&&!(V.renderOpts.collectedRevalidate>=m.Q)&&V.renderOpts.collectedRevalidate,r=void 0===V.renderOpts.collectedExpire||V.renderOpts.collectedExpire>=m.Q?!1!==a&&a>0?U.expireTime:void 0:V.renderOpts.collectedExpire;return{value:{kind:g.x.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await y.onRequestError(e,t,{routerKind:"App Router",routePath:x,routeType:"route",revalidateReason:(0,u.f)({isStaticGeneration:null!==W,isOnDemandRevalidate:I})},!1,O),t}},ee=async n=>{try{var s,o;let n=await y.handleResponse({req:e,nextConfig:U,cacheKey:W,routeKind:a.f.APP_ROUTE,isFallback:!1,previewProps:N,prerenderManifest:q,isRoutePPREnabled:!1,isOnDemandRevalidate:I,revalidateOnlyGenerated:L,responseGenerator:Z,waitUntil:r.waitUntil,isMinimalMode:J});if(null!==n&&"error"in n)throw n.error;if(!F)return;if((null==n||null==(s=n.value)?void 0:s.kind)!==g.x.APP_ROUTE)throw Error(`Invariant: app-route received invalid cache entry ${null==n||null==(o=n.value)?void 0:o.kind}`);J||t.setHeader("x-nextjs-cache",I?"REVALIDATED":n.isMiss?"MISS":n.isStale?"STALE":"HIT"),S&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let i=(0,h.G)(n.value.headers);J&&F||i.delete(m.M),!n.cacheControl||t.getHeader("Cache-Control")||i.get("Cache-Control")||i.set("Cache-Control",(0,f.f)(n.cacheControl)),await (0,p.f)(z,Y,new Response(n.value.body,{headers:i,status:n.value.status||200}));return}catch(a){if(a instanceof w.NoFallbackError||await y.onRequestError(e,a,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,u.f)({isStaticGeneration:null!==W,isOnDemandRevalidate:I})},!1,O),F)throw a;if(t.headersSent){if(n){let e=a instanceof Error?a:Error("Unknown app route error");n.recordException(e),n.setStatus({code:i.J.ERROR,message:e.message}),n.setAttribute("error.type",e.name)}t.writableEnded||t.destroyed||t.end()}else await (0,p.f)(z,Y,new Response(null,{status:500}));return}finally{(()=>{if(!n)return;let e=t.statusCode;n.setAttributes({"http.status_code":e,"next.rsc":!1}),e&&e>=500&&(n.setStatus({code:i.J.ERROR}),n.setAttribute("error.type",e.toString()));let a=B.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==d.q.handleRequest)return console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route")||D,s=`${$} ${r}`;n.setAttributes({"next.route":r,"http.route":r,"next.span_name":s}),n.updateName(s),b&&b!==n&&(b.setAttribute("http.route",r),b.updateName(s))})()}};K||void 0===e.url||null==E||E.setAttribute("http.target",e.url),await ee(E)}e.s(["handler",0,b,"patchFetch",0,function(){return(0,r.f)({workAsyncStorage:x,workUnitAsyncStorage:R})},"routeModule",0,y,"serverHooks",0,E,"workAsyncStorage",0,x,"workUnitAsyncStorage",0,R])}]})();

//# sourceMappingURL=_1ybb36f3yo6ap._.js.map