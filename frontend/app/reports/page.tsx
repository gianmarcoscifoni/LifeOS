'use client';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Briefcase, Activity, DollarSign,
  Zap, FileText, BookOpen, Bot, Heart, Star, BarChart2,
} from 'lucide-react';
import { getTimeData } from '@/hooks/useTimeTracker';

// ── Section registry ──────────────────────────────────────────────────────

const SECTIONS: { href: string; label: string; icon: React.ElementType; color: string }[] = [
  { href: '/',          label: 'Dashboard',      icon: LayoutDashboard, color: '#9333EA' },
  { href: '/levels',    label: 'XP & Levels',    icon: Star,            color: '#C9A84C' },
  { href: '/brand',     label: 'Brand RPG',      icon: Zap,             color: '#A855F7' },
  { href: '/content',   label: 'Content Studio', icon: FileText,        color: '#818CF8' },
  { href: '/habits',    label: 'Habits',         icon: Activity,        color: '#34D399' },
  { href: '/gratitude', label: 'Gratitude',      icon: Heart,           color: '#FCD34D' },
  { href: '/finance',   label: 'Finance',        icon: DollarSign,      color: '#6EE7B7' },
  { href: '/career',    label: 'Career',         icon: Briefcase,       color: '#60A5FA' },
  { href: '/journal',   label: 'Journal',        icon: BookOpen,        color: '#FB923C' },
  { href: '/claude',    label: 'Ask Claude',     icon: Bot,             color: '#E879F9' },
  { href: '/reports',   label: 'Reports',        icon: BarChart2,       color: '#94A3B8' },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function isoDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h === 0) return `${m}m`;
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

function formatTimeLong(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h === 0 && m === 0) return '0m';
  if (h === 0) return `${m}m`;
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${String(rem).padStart(2, '0')}m`;
}

type Period = 'today' | 'yesterday' | 'week';

function aggregateSeconds(data: Record<string, Record<string, number>>, period: Period) {
  const map: Record<string, number> = {};

  if (period === 'today') {
    const day = isoDate(0);
    Object.entries(data[day] ?? {}).forEach(([k, v]) => { map[k] = (map[k] ?? 0) + v; });
  } else if (period === 'yesterday') {
    const day = isoDate(1);
    Object.entries(data[day] ?? {}).forEach(([k, v]) => { map[k] = (map[k] ?? 0) + v; });
  } else {
    for (let i = 0; i < 7; i++) {
      const day = isoDate(i);
      Object.entries(data[day] ?? {}).forEach(([k, v]) => { map[k] = (map[k] ?? 0) + v; });
    }
  }
  return map;
}

function weekDayBars(data: Record<string, Record<string, number>>) {
  // last 7 days, newest right
  return Array.from({ length: 7 }, (_, i) => {
    const day = isoDate(6 - i);
    const total = Object.values(data[day] ?? {}).reduce((a, b) => a + b, 0);
    const label = new Date(day + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }).toUpperCase();
    return { day, label, total };
  });
}

// ── Component ─────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('today');
  const [data, setData] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => { setData(getTimeData()); }, []);

  const seconds = aggregateSeconds(data, period);
  const totalSec = Object.values(seconds).reduce((a, b) => a + b, 0);
  const maxSec   = Math.max(...Object.values(seconds), 1);

  const rows = SECTIONS
    .map(s => ({ ...s, sec: seconds[s.href] ?? 0, pct: (seconds[s.href] ?? 0) / maxSec }))
    .filter(r => r.sec > 0)
    .sort((a, b) => b.sec - a.sec);

  const bars = weekDayBars(data);
  const maxBarSec = Math.max(...bars.map(b => b.total), 1);

  const periodLabel: Record<Period, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'Last 7 days',
  };

  return (
    <div className="min-h-screen px-5 pt-14 pb-24 max-w-lg mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="font-inter text-[10px] font-medium tracking-[0.18em] mb-1"
          style={{ color: 'rgba(226,232,240,0.25)' }}>
          USAGE ANALYTICS
        </p>
        <h1 className="font-syne font-extrabold text-3xl tracking-tight"
          style={{ color: 'rgba(226,232,240,0.92)' }}>
          Reports
        </h1>
      </div>

      {/* Period tabs */}
      <div className="flex gap-0 mb-8 rounded-lg overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.07)', display: 'inline-flex' }}>
        {(['today', 'yesterday', 'week'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="px-4 py-1.5 font-inter text-xs font-medium transition-colors"
            style={{
              background: period === p ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: period === p ? 'rgba(226,232,240,0.9)' : 'rgba(226,232,240,0.32)',
              borderRight: p !== 'week' ? '1px solid rgba(255,255,255,0.07)' : undefined,
            }}
          >
            {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : '7 Days'}
          </button>
        ))}
      </div>

      {/* Total time */}
      <div className="mb-8">
        <p className="font-inter text-[10px] tracking-[0.14em] mb-1"
          style={{ color: 'rgba(226,232,240,0.25)' }}>
          TOTAL TIME — {periodLabel[period].toUpperCase()}
        </p>
        <p className="font-syne font-extrabold text-5xl tracking-tight"
          style={{ color: 'rgba(226,232,240,0.92)', letterSpacing: '-0.03em' }}>
          {totalSec === 0 ? '—' : formatTimeLong(totalSec)}
        </p>
      </div>

      {/* Week mini-bars (only in week view) */}
      {period === 'week' && (
        <div className="mb-8">
          <p className="font-inter text-[10px] tracking-[0.14em] mb-3"
            style={{ color: 'rgba(226,232,240,0.25)' }}>
            DAILY BREAKDOWN
          </p>
          <div className="flex items-end gap-1.5" style={{ height: 48 }}>
            {bars.map((b) => (
              <div key={b.day} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-full rounded-sm"
                  style={{
                    height: b.total === 0 ? 2 : Math.max(4, (b.total / maxBarSec) * 40),
                    background: b.total === 0
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(147,51,234,0.55)',
                    transition: 'height 400ms ease',
                  }}
                />
                <span className="font-inter text-[9px]"
                  style={{ color: 'rgba(226,232,240,0.25)' }}>
                  {b.label[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section list */}
      <div>
        <p className="font-inter text-[10px] tracking-[0.14em] mb-4"
          style={{ color: 'rgba(226,232,240,0.25)' }}>
          BY SECTION
        </p>

        {rows.length === 0 ? (
          <p className="font-inter text-sm" style={{ color: 'rgba(226,232,240,0.2)' }}>
            No data for this period.
          </p>
        ) : (
          <div className="flex flex-col">
            {rows.map((row, idx) => {
              const Icon = row.icon;
              return (
                <div key={row.href}>
                  {idx > 0 && (
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0' }} />
                  )}
                  <div className="flex items-center gap-3 py-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${row.color}14` }}>
                      <Icon size={13} style={{ color: row.color }} />
                    </div>

                    {/* Label + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-inter text-[12px] font-medium"
                          style={{ color: 'rgba(226,232,240,0.72)' }}>
                          {row.label}
                        </span>
                        <span className="font-inter text-[11px] tabular-nums font-medium ml-4"
                          style={{ color: 'rgba(226,232,240,0.45)', flexShrink: 0 }}>
                          {formatTime(row.sec)}
                        </span>
                      </div>
                      {/* Bar track */}
                      <div className="w-full rounded-full overflow-hidden"
                        style={{ height: 3, background: 'rgba(255,255,255,0.05)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${row.pct * 100}%`,
                            background: row.color,
                            opacity: 0.65,
                            transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer note */}
      {totalSec > 0 && (
        <p className="mt-10 font-inter text-[10px] text-center"
          style={{ color: 'rgba(226,232,240,0.15)', letterSpacing: '0.06em' }}>
          SESSION TIME · STORED LOCALLY · RESETS EVERY 30 DAYS
        </p>
      )}
    </div>
  );
}
