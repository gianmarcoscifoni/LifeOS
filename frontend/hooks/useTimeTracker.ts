'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const KEY = 'lo_time_v1';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function recordTime(pathname: string, seconds: number) {
  if (seconds < 1 || typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(KEY);
    const data: Record<string, Record<string, number>> = raw ? JSON.parse(raw) : {};
    const day = todayKey();
    if (!data[day]) data[day] = {};
    data[day][pathname] = (data[day][pathname] ?? 0) + seconds;
    // keep 30 days
    const days = Object.keys(data).sort();
    if (days.length > 30) days.slice(0, days.length - 30).forEach(d => delete data[d]);
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

export function getTimeData(): Record<string, Record<string, number>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function useTimeTracker() {
  const pathname = usePathname();
  const startRef = useRef<number>(Date.now());
  const pathRef  = useRef<string>(pathname);

  useEffect(() => {
    const elapsed = Math.round((Date.now() - startRef.current) / 1000);
    recordTime(pathRef.current, elapsed);
    startRef.current = Date.now();
    pathRef.current  = pathname;
  }, [pathname]);

  useEffect(() => {
    const flush = () => {
      const elapsed = Math.round((Date.now() - startRef.current) / 1000);
      recordTime(pathRef.current, elapsed);
      startRef.current = Date.now();
    };
    window.addEventListener('beforeunload', flush);
    const iv = setInterval(flush, 30_000);
    return () => {
      window.removeEventListener('beforeunload', flush);
      clearInterval(iv);
    };
  }, []);
}
