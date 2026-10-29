import type { CSSProperties, ReactNode } from 'react';
import { ArrowUpLeft } from './Icons';
import { SmartLink } from './SmartLink';

type Props = {
  href: string;
  variant?: 'ice' | 'glass';
  size?: 'md' | 'sm';
  children: ReactNode;
  external?: boolean;
  delay?: number;
  noReveal?: boolean;
  icon?: ReactNode;
  className?: string;
  'aria-label'?: string;
};

/** Primary (ice) and liquid-glass buttons. Reveal sits on the button itself so the glass keeps its backdrop. */
export function Btn({ href, variant = 'ice', size = 'md', children, external, delay = 0, noReveal, icon, className = '', ...rest }: Props) {
  const cls = [
    'btn',
    variant === 'ice' ? 'btn--ice' : 'btn--glass lg lg--pill',
    size === 'sm' ? 'btn--sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const reveal = noReveal ? {} : { 'data-reveal': '', style: { '--d': `${delay}ms` } as CSSProperties };
  const refract = variant === 'glass' ? { 'data-refract': '14' } : {};
  const inner = (
    <>
      <span>{children}</span>
      {icon ?? <ArrowUpLeft />}
    </>
  );

  if (external) {
    return (
      <a className={cls} href={href} target="_blank" rel="noopener noreferrer" {...reveal} {...refract} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <SmartLink className={cls} href={href} {...reveal} {...refract} {...rest}>
      {inner}
    </SmartLink>
  );
}
