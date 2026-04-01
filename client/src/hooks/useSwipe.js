import { useRef, useEffect } from 'react';

/**
 * useSwipe - fires onSwipeLeft / onSwipeRight after a touch swipe
 * @param {object} options
 * @param {() => void} options.onSwipeLeft
 * @param {() => void} options.onSwipeRight
 * @param {number}  options.threshold  - min px distance (default 60)
 */
export default function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 60 } = {}) {
  const startX = useRef(null);
  const startY = useRef(null);

  const handlers = {
    onTouchStart: (e) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    },
    onTouchEnd: (e) => {
      if (startX.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;

      // Only fire if horizontal movement dominates
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        if (dx < 0 && onSwipeLeft) onSwipeLeft();
        if (dx > 0 && onSwipeRight) onSwipeRight();
      }
      startX.current = null;
      startY.current = null;
    },
  };

  return handlers;
}
