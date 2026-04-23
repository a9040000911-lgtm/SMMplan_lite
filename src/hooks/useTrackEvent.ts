'use client';
import { useCallback, useRef, useEffect } from 'react';

export function useTrackEvent() {
  // Generate a random stable session ID for this visit (if not available via other means)
  // We keep it in memory. It resets when the user reloads the page.
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = Math.random().toString(36).substring(2, 15);
    }
  }, []);

  const track = useCallback(async (event: string, metadata?: any) => {
    try {
      const sessionId = sessionIdRef.current;
      
      const payload = JSON.stringify({
        event,
        metadata,
        sessionId,
      });

      // Use target endpoint
      const url = '/api/analytics';

      // Advanced: use navigator.sendBeacon for true fire-and-forget, especially on page unload
      if (navigator.sendBeacon) {
        // Blob required to set correct content-type for standard JSON body parsing in Next.js
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
      }

      // Fallback: fetch with keepalive 
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true, 
      });
    } catch (e) {
      // Stealth: never expose errors to console
    }
  }, []);

  return { track };
}
