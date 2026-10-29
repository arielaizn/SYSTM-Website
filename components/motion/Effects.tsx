'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { installLiquidGlass, installPointerLight } from '../../lib/liquid-glass';
import { installMotion } from '../../lib/motion';
import { settleTransition } from '../../lib/transition';

/** Mounts every global behaviour once: blur reveal, glass refraction, pointer light, route transitions. */
export function Effects() {
  const pathname = usePathname();

  useEffect(() => {
    installMotion();
    const stopGlass = installLiquidGlass();
    const stopLight = installPointerLight();
    return () => {
      stopGlass();
      stopLight();
    };
  }, []);

  useEffect(() => {
    settleTransition();
  }, [pathname]);

  return null;
}
