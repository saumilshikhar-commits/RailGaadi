import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the value.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Returns a human-readable relative time string that auto-updates.
 * e.g. "Updated 32 sec ago", "Updated 2 min ago"
 */
export function useRelativeTime(isoString: string | undefined): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!isoString) {
      setLabel('Unknown');
      return;
    }

    function compute() {
      const diffMs = Date.now() - new Date(isoString!).getTime();
      const secs = Math.floor(diffMs / 1000);
      if (secs < 60) return `Updated ${secs} sec ago`;
      const mins = Math.floor(secs / 60);
      if (mins < 60) return `Updated ${mins} min ago`;
      const hrs = Math.floor(mins / 60);
      return `Updated ${hrs}h ago`;
    }

    setLabel(compute());
    const interval = setInterval(() => setLabel(compute()), 1000);
    return () => clearInterval(interval);
  }, [isoString]);

  return label;
}

/**
 * Tracks whether document is currently visible.
 */
export function usePageVisibility(): boolean {
  const [visible, setVisible] = useState(!document.hidden);

  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return visible;
}

/**
 * Formats delay for display.
 */
export function formatDelay(minutes: number | undefined): {
  label: string;
  type: 'ontime' | 'delayed' | 'early';
  isLate: boolean;
} {
  if (minutes === undefined || minutes === null) return { label: 'On time', type: 'ontime', isLate: false };
  if (minutes === 0) return { label: 'On time', type: 'ontime', isLate: false };
  if (minutes > 0) return { label: `${minutes}m Late`, type: 'delayed', isLate: true };
  return { label: `${Math.abs(minutes)}m Early`, type: 'early', isLate: false };
}

/**
 * Formats a distance in km.
 */
export function formatDistance(km: number | undefined): string {
  if (km === undefined) return '—';
  if (km >= 1000) return `${(km / 1000).toFixed(1).replace(/\.0$/, '')}k km`;
  return `${Math.round(km)} km`;
}

/**
 * Formats an ISO time string for display.
 */
export function formatTime(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}
