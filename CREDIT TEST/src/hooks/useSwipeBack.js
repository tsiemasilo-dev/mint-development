import { useEffect, useRef, useCallback } from 'react';

const useSwipeBack = (onBack, options = {}) => {
  const {
    enabled = true,
    edgeThreshold = 30,
    minSwipeDistance = 80,
    maxVerticalDistance = 100,
  } = options;

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);
  const startedFromEdge = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchCurrentX.current = touch.clientX;
    
    startedFromEdge.current = touch.clientX <= edgeThreshold;
    isSwiping.current = startedFromEdge.current;
  }, [enabled, edgeThreshold]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled || !isSwiping.current || !startedFromEdge.current) return;
    
    const touch = e.touches[0];
    touchCurrentX.current = touch.clientX;
    
    const verticalDistance = Math.abs(touch.clientY - touchStartY.current);
    if (verticalDistance > maxVerticalDistance) {
      isSwiping.current = false;
      startedFromEdge.current = false;
    }
  }, [enabled, maxVerticalDistance]);

  const handleTouchEnd = useCallback((e) => {
    if (!enabled || !startedFromEdge.current) return;
    
    const swipeDistance = touchCurrentX.current - touchStartX.current;
    
    if (swipeDistance >= minSwipeDistance && isSwiping.current) {
      if (onBack && typeof onBack === 'function') {
        onBack();
      }
    }
    
    isSwiping.current = false;
    startedFromEdge.current = false;
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchCurrentX.current = 0;
  }, [enabled, minSwipeDistance, onBack]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return null;
};

export default useSwipeBack;
