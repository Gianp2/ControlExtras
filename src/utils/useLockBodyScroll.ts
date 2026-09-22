import { useEffect } from 'react';

// Global counter of active scroll locks to prevent nested/concurrent modals from corrupting body overflow
let activeLocks = 0;

/**
 * Prevents the background page from scrolling when a modal, drawer, or card detail is open.
 * Safely reference-counted: upon closing all modals, document.body overflow and padding
 * are always cleanly cleared, never leaving the page frozen or locked.
 */
export function useLockBodyScroll(isLocked: boolean = true): void {
  useEffect(() => {
    if (!isLocked) return;

    activeLocks++;
    if (activeLocks === 1) {
      document.body.style.overflow = 'hidden';
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
    }

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);
      if (activeLocks === 0) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    };
  }, [isLocked]);
}
