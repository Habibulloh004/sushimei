"use client";

import { useEffect, useRef, useState } from 'react';

export function useScrollDirection(thresholdDown = 30, thresholdUp = 15) {
  const [visible, setVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    let scrollDirection: 'up' | 'down' | null = null;
    let directionStart = 0;

    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 10) {
        setVisible(true);
        scrollDirection = null;
        lastScrollYRef.current = currentY;
        return;
      }

      const newDirection = currentY > lastScrollYRef.current ? 'down' : 'up';
      if (newDirection !== scrollDirection) {
        scrollDirection = newDirection;
        directionStart = lastScrollYRef.current;
      }

      const distance = Math.abs(currentY - directionStart);
      if (scrollDirection === 'down' && distance > thresholdDown) {
        setVisible(false);
      } else if (scrollDirection === 'up' && distance > thresholdUp) {
        setVisible(true);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [thresholdDown, thresholdUp]);

  return visible;
}
