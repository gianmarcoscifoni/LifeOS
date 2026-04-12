'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Mic } from 'lucide-react';
import { loadDailyGoals, markGoalComplete, type DailyGoalItem } from '@/lib/goalSession';

const AREA_COLOR: Record<string, string> = {
  career:        '#9333EA',
  habits:        '#86EFAC',
  finance:       '#C9A84C',
  health:        '#F0C96E',
  brand:         '#C084FC',
  relationships: '#67E8F9',
};

const PRIORITY_DOT: Record<string, string> = {
  high:   '#F87171',
  medium: '#FCD34D',
  low:    '#6EE7B7',
};

function areaColor(area: string) {
  return AREA_COLOR[area?.toLowerCase()] ?? '#94A3B8';
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDay() {
  return new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export function DailyView() {
  const [goals, setGoals] = useState<DailyGoalItem[]>([]);
  const [completing, setCompleting] = useState<string | null>(null);

  const load = useCallback(() => {
    setGoals(loadDailyGoals(todayStr()));
  }, []);

  useEffect(() => {
    load();
    // Also poll every 5s in case VoiceOrb commits in the background
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  async function handleComplete(goal: DailyGoalItem) {
    if (goal.completedAt) return;
    setCompleting(goal.id);

    // Update localStorage immediately (optimistic)
    markGoalComplete(goal.id);
    setGoals(prev => prev.map(g =>
      g.id === goal.id ? { ...g, completedAt: new Date().toISOString() } : g
    ));

    // If we have a real DB id, patch it
    if (goal.dbGoalId) {
      try {
        await fetch(`/api/proxy/career/goals/${goal.dbGoalId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'in_progress' }),
        });
      } catch {
        // non-blocking — localStorage already updated
      }
    }
    setCompleting(null);
  }

  const completed = goals.filter(g => g.completedAt).length;
  const total = goals.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(226,232,240,0.35)' }}>
            {formatDay()}
          </p>
          {total > 0 && (
            <p className="text-sm font-bold mt-0.5"
              style={{ color: completed === total ? '#86EFAC' : 'rgba(226,232,240,0.7)' }}>
              {completed}/{total} obiettivi
            </p>
          )}
        </div>
        {total > 0 && (
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ width: 80, background: 'rgba(255,255,255,0.07)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #9333EA, #C9A84C)' }}
              initial={{ width: 0 }}
              animate={{ width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%` }}
              transition={{ type: 'spring', stiffness: 60, damping: 14 }}
            />
          </div>
        )}
      </div>

      {/* Goal list */}
      {total === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 py-14 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
        >
          <Mic size={28} style={{ color: 'rgba(226,232,240,0.2)' }} />
          <p className="text-sm text-center" style={{ color: 'rgba(226,232,240,0.35)' }}>
            Fai un voice check-in<br />per popolare la lista di oggi
          </p>
        </motion.div>
      ) : (
        <AnimatePresence initial={false}>
          {goals.map((goal, i) => {
            const color = areaColor(goal.area);
            const done = !!goal.completedAt;
            return (
              <motion.div
                key={goal.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer select-none"
                style={{
                  background: done ? 'rgba(255,255,255,0.02)' : `${color}08`,
                  border: `1px solid ${done ? 'rgba(255,255,255,0.06)' : color + '22'}`,
                  opacity: done ? 0.55 : 1,
                }}
                onClick={() => handleComplete(goal)}
              >
                <motion.div
                  animate={completing === goal.id ? { scale: [1, 1.4, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {done
                    ? <CheckCircle2 size={18} style={{ color: '#86EFAC', flexShrink: 0 }} />
                    : <Circle size={18} style={{ color: `${color}80`, flexShrink: 0 }} />
                  }
                </motion.div>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{
                      color: done ? 'rgba(226,232,240,0.35)' : 'rgba(226,232,240,0.9)',
                      textDecoration: done ? 'line-through' : 'none',
                    }}
                  >
                    {goal.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                      style={{ background: `${color}15`, color }}
                    >
                      {goal.area}
                    </span>
                  </div>
                </div>

                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: PRIORITY_DOT[goal.priority] ?? '#94A3B8' }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
