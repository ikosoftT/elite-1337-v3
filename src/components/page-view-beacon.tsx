'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Reports page views and refreshes private, expiring presence while the tab is visible. */
export function PageViewBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const send = (url: string) => {
      const payload = JSON.stringify({ path: pathname });
      try {
        if (!navigator.sendBeacon?.(url, new Blob([payload], { type: 'application/json' }))) void fetch(url, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => undefined);
      } catch { /* optional telemetry must never break the app */ }
    };
    if (!pathname.startsWith('/admin')) send('/api/track');
    send('/api/presence');
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') send('/api/presence'); }, 60_000);
    const visible = () => { if (document.visibilityState === 'visible') send('/api/presence'); };
    document.addEventListener('visibilitychange', visible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [pathname]);
  return null;
}
