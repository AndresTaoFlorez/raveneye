import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

export function useEntranceAnimation<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
  }, []);

  return ref;
}
