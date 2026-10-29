'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComponentProps, MouseEvent } from 'react';
import { navigate } from '../../lib/transition';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

/** next/link plus a View Transition on same-origin navigation. Falls back to a plain push. */
export function SmartLink({ href, onClick, target, children, ...rest }: Props) {
  const router = useRouter();

  function handle(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (target && target !== '_self') return;
    if (!href.startsWith('/') || href.startsWith('//')) return;
    e.preventDefault();
    navigate(router, href);
  }

  return (
    <Link href={href} target={target} onClick={handle} {...rest}>
      {children}
    </Link>
  );
}
