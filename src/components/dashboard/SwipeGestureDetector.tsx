'use client';

import React, { useRef, useCallback, ReactNode } from 'react';

interface SwipeGestureDetectorProps {
  children: ReactNode;
  onSwipe: (direction: 'left' | 'right' | 'up' | 'down', velocity?: number) => void;
  threshold?: number;
  velocityThreshold?: number;
  preventScroll?: boolean;
  className?: string;
}

interface TouchInfo {
  x: number;
  y: number;
  time: number;
}

export function SwipeGestureDetector({
  children,
  onSwipe,
  threshold = 50,
  velocityThreshold = 0.3,
  preventScroll = false,
  className = ''
}: SwipeGestureDetectorProps) {
  const touchStart = useRef<TouchInfo | null>(null);
  const touchEnd = useRef<TouchInfo | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    touchEnd.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.touches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    // Prevent default scrolling if needed
    if (preventScroll) {
      const deltaX = Math.abs(touch.clientX - touchStart.current.x);
      const deltaY = Math.abs(touch.clientY - touchStart.current.y);
      
      // If horizontal swipe is more significant than vertical, prevent vertical scroll
      if (deltaX > deltaY && deltaX > threshold * 0.3) {
        e.preventDefault();
      }
    }
  }, [preventScroll, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;
    
    // Calculate absolute distances
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // Calculate velocity (pixels per millisecond)
    const velocityX = absDeltaX / deltaTime;
    const velocityY = absDeltaY / deltaTime;
    
    // Determine if this qualifies as a swipe
    const isHorizontalSwipe = absDeltaX > threshold && absDeltaX > absDeltaY;
    const isVerticalSwipe = absDeltaY > threshold && absDeltaY > absDeltaX;
    
    if (isHorizontalSwipe && velocityX > velocityThreshold) {
      // Horizontal swipe
      const direction = deltaX > 0 ? 'right' : 'left';
      onSwipe(direction, velocityX);
    } else if (isVerticalSwipe && velocityY > velocityThreshold) {
      // Vertical swipe
      const direction = deltaY > 0 ? 'down' : 'up';
      onSwipe(direction, velocityY);
    }

    // Reset touch tracking
    touchStart.current = null;
    touchEnd.current = null;
  }, [onSwipe, threshold, velocityThreshold]);

  // Handle touch cancel (when touch is interrupted)
  const handleTouchCancel = useCallback(() => {
    touchStart.current = null;
    touchEnd.current = null;
  }, []);

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        touchAction: preventScroll ? 'pan-y' : 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      {children}
    </div>
  );
}