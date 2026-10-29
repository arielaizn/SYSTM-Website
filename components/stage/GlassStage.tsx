'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { SceneHandle } from './scene';

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Fixed full-viewport WebGL canvas behind every page. Three.js is loaded after first paint, off the critical path. */
export function GlassStage() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const handle = useRef<SceneHandle | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    let dead = false;
    if (!webglAvailable()) {
      html.dataset.gl = 'off';
      return;
    }
    const boot = () => {
      import('./scene')
        .then(({ createScene }) => {
          if (dead || !canvas.current) return;
          handle.current = createScene(canvas.current, {
            onFirstFrame: () => {
              html.dataset.gl = 'on';
            },
            onLost: () => {
              html.dataset.gl = 'off';
            },
          });
        })
        .catch(() => {
          html.dataset.gl = 'off';
        });
    };
    const idle = 'requestIdleCallback' in window;
    const id = idle ? window.requestIdleCallback(boot, { timeout: 1200 }) : window.setTimeout(boot, 250);
    return () => {
      dead = true;
      if (idle) window.cancelIdleCallback(id);
      else clearTimeout(id);
      handle.current?.dispose();
      handle.current = null;
    };
  }, []);

  // New route = new section markers. Rescan now and again once images and fonts have settled.
  useEffect(() => {
    handle.current?.rescan();
    const ids = [120, 500, 1400].map((ms) => window.setTimeout(() => handle.current?.rescan(), ms));
    return () => ids.forEach(clearTimeout);
  }, [pathname]);

  return (
    <div className="stage" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
