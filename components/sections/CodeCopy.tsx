'use client';

import { useEffect } from 'react';

const LABEL = 'העתקה';
const DONE = 'הועתק ✓';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Insecure context or denied permission: fall back to a hidden textarea.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

/** Adds a copy button to every code block inside the article body. The body is server-rendered sanitized HTML, so the buttons are attached after hydration. */
export function CodeCopy({ root = '.prose' }: { root?: string }) {
  useEffect(() => {
    const timers = new Set<number>();
    const added: HTMLElement[] = [];
    document.querySelectorAll<HTMLPreElement>(`${root} pre`).forEach((pre) => {
      if (pre.parentElement?.classList.contains('codeblock')) return;
      const wrap = document.createElement('div');
      wrap.className = 'codeblock';
      pre.replaceWith(wrap);
      wrap.append(pre);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'codeblock__copy';
      btn.textContent = LABEL;
      btn.setAttribute('aria-label', 'העתקת הקוד ללוח');
      btn.addEventListener('click', async () => {
        await copyText((pre.querySelector('code') ?? pre).textContent ?? '');
        btn.textContent = DONE;
        btn.dataset.done = '';
        const t = window.setTimeout(() => {
          btn.textContent = LABEL;
          delete btn.dataset.done;
          timers.delete(t);
        }, 1800);
        timers.add(t);
      });
      wrap.append(btn);
      added.push(wrap);
    });

    return () => {
      timers.forEach(clearTimeout);
      // Restore the original markup so a remount (or React reconciliation) never sees a double wrap.
      added.forEach((wrap) => {
        const pre = wrap.querySelector('pre');
        if (pre) wrap.replaceWith(pre);
      });
    };
  }, [root]);

  return null;
}
