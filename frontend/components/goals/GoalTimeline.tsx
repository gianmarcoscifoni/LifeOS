'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import { loadGoalsByPeriod, type DailyGoalItem } from '@/lib/goalSession';

type Period = 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  week:  'Settimana',
  month: 'Mese',
  year:  'Anno',
};

const AREA_COLOR: Record<string, string> = {
  career:        '#9333EA',
  habits:        '#86EFAC',
  finance:       '#C9A84C',
  health:        '#F0C96E',
  brand:         '#C084FC',
  relationships: '#67E8F9',
};

function areaColor(area: string) {
  return AREA_COLOR[area?.toLowerCase()] ?? '#94A3B8';
}

function groupByDate(goals: DailyGoalItem[]): Record<string, DailyGoalItem[]> {
  return goals.reduce<Record<string, DailyGoalItem[]>>((acc, g) => {
    (acc[g.date] ??= []).push(g);
    return acc;
  }, {});
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function WeekView({ goals }: { goals: DailyGoalItem[] }) {
  const grouped = groupByDate(goals);
  const dates = Object.keys(grouped).sort().reverse();
  const completed = goals.filter(g => g.completedAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: 'rgba(226,232,240,0.4)' }}>
          {completed}/{goals.length} completati
        </p>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 80, background: 'rgba(255,255,255,0.07)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #9333EA, #C9A84C)' }}
            initial={{ width: 0 }}
            animate={{ width: `${goals.length > 0 ? Math.round((completed / goals.length) * 100) : 0}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 14 }}
          />
        </div>
      </div>
      {dates.map(date => (
        <div key={date} className="space-y-2">
          <p className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(226,232,240,0.3)' }}>
            {formatDate(date)}
          </p>
          {grouped[date].map(goal => {
            const color = areaColor(goal.area);
            const done = !!goal.completedAt;
            return (
              <div
                key={goal.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{
                  background: `${color}08`,
                  border: `1px solid ${color}18`,
                  opacity: done ? 0.5 : 1,
                }}
              >
                {done
                  ? <CheckCircle2 size={14} style={{ color: '#86EFAC', flexShrink: 0 }} />
                  : <Circle size={14} style={{ color: `${color}80`, flexShrink: 0 }} />
                }
                <p className="text-sm flex-1 truncate"
                  style={{
                    color: done ? 'rgba(226,232,240,0.35)' : 'rgba(226,232,240,0.85)',
                    textDecoration: done ? 'line-through' : 'none',
                  }}>
                  {goal.title}
                </p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                  style={{ background: `${color}15`, color }}>
                  {goal.area}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MonthView({ goals }: { goals: DailyGoalItem[] }) {
  const grouped = groupByDate(goals);

  // Build last 30 days grid
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  return (
    <div className="space-y-4">
      {/* Mini calendar dots */}
      <div className="grid grid-cols-10 gap-1.5">
        {days.map(day => {
          const dayGoals = grouped[day] ?? [];
          const done = dayGoals.filter(g => g.completedAt).length;
          const total = dayGoals.length;
          const intensity = total === 0 ? 0 : done / total;
          return (
            <div
              key={day}
              title={`${day}: ${done}/${total}`}
              className="aspect-square rounded-sm"
              style={{
                background: total === 0
                  ? 'rgba(255,255,255,0.05)'
                  : `rgba(147,51,234,${0.15 + intensity * 0.7})`,
              }}
            />
          );
        })}
      </div>
      <p className="text-[10px]" style={{ color: 'rgba(226,232,240,0.25)' }}>
        Ultimi 30 giorni · {Object.keys(grouped).length} giorni attivi · {goals.filter(g => g.completedAt).length}/{goals.length} completati
      </p>
      <WeekView goals={goals} />
    </div>
  );
}

function YearView({ goals }: { goals: DailyGoalItem[] }) {
  // Group by month
  const byMonth: Record<number, DailyGoalItem[]> = {};
  for (let m = 0; m < 12; m++) byMonth[m] = [];
  goals.forEach(g => {
    const m = new Date(g.date + 'T00:00:00').getMonth();
    byMonth[m].push(g);
  });

  const monthNames = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const maxCount = Math.max(...Object.values(byMonth).map(a => a.length), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1.5 h-24">
        {monthNames.map((name, m) => {
          const count = byMonth[m].length;
          const done = byMonth[m].filter(g => g.completedAt).length;
          const heightPct = count === 0 ? 0 : Math.max(8, Math.round((count / maxCount) * 100));
          return (
            <div key={m} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ delay: m * 0.04, type: 'spring', stiffness: 120, damping: 18 }}
                  className="w-full rounded-t-sm"
                  style={{
                    background: count === 0
                      ? 'rgba(255,255,255,0.05)'
                      : `linear-gradient(180deg, rgba(147,51,234,0.6), rgba(201,168,76,0.4))`,
                    minHeight: count > 0 ? 4 : 0,
                  }}
                  title={`${name}: ${done}/${count}`}
                />
              </div>
              <span className="text-[8px]" style={{ color: 'rgba(226,232,240,0.3)' }}>{name}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px]" style={{ color: 'rgba(226,232,240,0.25)' }}>
        {goals.length} goal totali · {goals.filter(g => g.completedAt).length} completati
      </p>
    </div>
  );
}

export function GoalTimeline() {
  const [period, setPeriod] = useState<Period>('week');
  const [goals, setGoals] = useState<DailyGoalItem[]>([]);

  useEffect(() => {
    setGoals(loadGoalsByPeriod(period));
  }, [period]);

  return (
    <div className="space-y-4">
      {/* Period toggle */}
      <div className="flex gap-2">
        {(['week', 'month', 'year'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all"
            style={{
              background: period === p ? 'rgba(147,51,234,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${period === p ? 'rgba(147,51,234,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: period === p ? '#C084FC' : 'rgba(226,232,240,0.45)',
            }}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {goals.length === 0 ? (
        <div className="py-12 text-center rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <p className="text-sm" style={{ color: 'rgba(226,232,240,0.3)' }}>
            Nessun goal in questo periodo
          </p>
        </div>
      ) : (
        <motion.div
          key={period}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {period === 'week'  && <WeekView goals={goals} />}
          {period === 'month' && <MonthView goals={goals} />}
          {period === 'year'  && <YearView goals={goals} />}
        </motion.div>
      )}
    </div>
  );
}
