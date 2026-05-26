import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

export const PullToRefresh: React.FC<{
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
}> = ({ children, onRefresh }) => {
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullHeight = useRef(0);
  const controls = useAnimation();
  const maxPull = 120;
  const triggerHeight = 80;

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        setStartY(e.touches[0].clientY);
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;
      const y = e.touches[0].clientY;
      const dy = y - startY;

      if (dy > 0 && window.scrollY === 0) {
        // Prevent default scrolling when pulling down at top
        if (e.cancelable) e.preventDefault();
        pullHeight.current = Math.min(dy * 0.4, maxPull);
        controls.set({ y: pullHeight.current });
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshing) return;
      setIsPulling(false);

      if (pullHeight.current >= triggerHeight) {
        setIsRefreshing(true);
        controls.start({ y: 50, transition: { type: 'spring', bounce: 0, duration: 0.3 } });
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          pullHeight.current = 0;
          controls.start({ y: 0, transition: { type: 'spring', bounce: 0, duration: 0.3 } });
        }
      } else {
        pullHeight.current = 0;
        controls.start({ y: 0, transition: { type: 'spring', bounce: 0, duration: 0.3 } });
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    // Use non-passive for move so we can preventDefault
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [startY, isPulling, isRefreshing, onRefresh, controls]);

  return (
    <div className="relative w-full h-full min-h-screen">
      <motion.div
        className="fixed top-safe left-0 right-0 flex justify-center items-center z-[99999] pointer-events-none"
        style={{ height: '50px', top: '-50px' }}
        animate={controls}
      >
        <div className="bg-white dark:bg-zinc-800 shadow-xl rounded-full w-10 h-10 flex items-center justify-center transform-gpu">
          <RefreshCw 
            size={20} 
            className={`text-indigo-500 ${isRefreshing ? 'animate-spin' : ''}`} 
            style={{
               transform: isRefreshing ? 'none' : `rotate(${pullHeight.current * 3}deg)`
            }}
          />
        </div>
      </motion.div>
      <div className="w-full h-full min-h-screen">
        {children}
      </div>
    </div>
  );
};
