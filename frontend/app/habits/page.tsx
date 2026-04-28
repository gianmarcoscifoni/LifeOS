'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { HabitGrid } from '@/components/habits/HabitGrid';
import { StreakFire } from '@/components/habits/StreakFire';
import { HabitCheckIn } from '@/components/habits/HabitCheckIn';
import { PageVoiceEntry } from '@/components/voice/PageVoiceEntry';

interface Habit {
  id: string;
  name: string;
  frequency: string;
  currentStreak: number;
  completedToday: boolean;
  logs: { loggedDate: string; completed: boolean }[];
}

const FREQ = ['daily', 'weekly', 'weekdays'];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFreq, setNewFreq] = useState('daily');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [todayRes, logsRes] = await Promise.all([
      fetch('/api/proxy/habits/today').then(r => r.ok ? r.json() : { habits: [], today_logs: [] }).catch(() => ({ habits: [], today_logs: [] })),
      fetch('/api/proxy/habits/logs/recent').then(r => r.ok ? r.json() : []).catch(() => []),
    ]);

    const todayLogIds = new Set<string>(
      (todayRes.today_logs ?? []).filter((l: Record<string, unknown>) => l.completed).map((l: Record<string, unknown>) => String(l.habit_id))
    );

    const logsByHabit = new Map<string, { loggedDate: string; completed: boolean }[]>();
    for (const l of (logsRes as { habit_id: string; logged_date: string; completed: boolean }[])) {
      const arr = logsByHabit.get(l.habit_id) ?? [];
      arr.push({ loggedDate: l.logged_date, completed: l.completed });
      logsByHabit.set(l.habit_id, arr);
    }

    const mapped: Habit[] = (todayRes.habits ?? []).map((h: Record<string, unknown>) => ({
      id: h.id as string,
      name: h.name as string,
      frequency: (h.frequency as string) ?? 'daily',
      currentStreak: (h.streak_current ?? h.streakCurrent ?? 0) as number,
      completedToday: todayLogIds.has(h.id as string),
      logs: logsByHabit.get(h.id as string) ?? [],
    }));

    setHabits(mapped);
  }

  useEffect(() => { load(); }, []);

  async function createHabit() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/proxy/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), frequency: newFreq }),
      });
      if (res.ok) {
        setShowNew(false);
        setNewName('');
        setNewFreq('daily');
        await load();
      }
    } finally { setSaving(false); }
  }

  const maxStreak = habits.reduce((m, h) => Math.max(m, h.currentStreak), 0);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1
          className="text-3xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #C084FC 0%, #E2E8F0 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Habits
        </h1>
        <div className="flex items-center gap-3">
          {maxStreak > 0 && <StreakFire streak={maxStreak} />}
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: 'rgba(147,51,234,0.15)',
              border: '1px solid rgba(147,51,234,0.3)',
              color: '#C084FC',
            }}
          >
            <Plus size={13} /> New Habit
          </button>
        </div>
      </motion.div>

      <PageVoiceEntry domain="habits" />

      {/* New Habit modal */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="glass-purple p-5 space-y-4"
            style={{ borderRadius: '1.25rem' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: '#C084FC' }}>New Habit</p>
              <button onClick={() => setShowNew(false)} style={{ color: 'rgba(226,232,240,0.4)' }}>
                <X size={16} />
              </button>
            </div>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createHabit()}
              placeholder="e.g. Morning workout"
              className="w-full bg-transparent outline-none text-sm"
              style={{
                color: '#E2E8F0',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.75rem',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.04)',
              }}
            />
            <div className="flex gap-2">
              {FREQ.map(f => (
                <button
                  key={f}
                  onClick={() => setNewFreq(f)}
                  className="flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
                  style={newFreq === f ? {
                    background: 'rgba(147,51,234,0.25)',
                    border: '1px solid rgba(147,51,234,0.5)',
                    color: '#C084FC',
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(226,232,240,0.4)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={createHabit}
              disabled={saving || !newName.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: saving || !newName.trim() ? 'rgba(147,51,234,0.1)' : 'rgba(147,51,234,0.3)',
                border: '1px solid rgba(147,51,234,0.4)',
                color: saving || !newName.trim() ? 'rgba(192,132,252,0.4)' : '#C084FC',
              }}
            >
              {saving ? 'Saving…' : 'Create Habit'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {habits.length === 0 && !showNew && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass text-center py-14"
          style={{ borderRadius: '1.25rem', borderStyle: 'dashed' }}
        >
          <p className="text-3xl mb-2">🌙</p>
          <p className="text-sm mb-4" style={{ color: 'rgba(226,232,240,0.4)' }}>
            No habits yet
          </p>
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(147,51,234,0.2)', border: '1px solid rgba(147,51,234,0.3)', color: '#C084FC' }}
          >
            + Add your first habit
          </button>
        </motion.div>
      )}

      <motion.div
        className="space-y-4"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {habits.map(habit => {
          const streakLevel = habit.currentStreak >= 30 ? 'gold' : habit.currentStreak >= 7 ? 'glow' : 'default';
          return (
            <motion.div
              key={habit.id}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 110, damping: 16 } } }}
              className="glass-purple p-5 space-y-4"
              style={{
                borderRadius: '1.25rem',
                ...(streakLevel === 'gold' ? {
                  border: '1px solid rgba(201,168,76,0.4)',
                  boxShadow: '0 0 24px rgba(201,168,76,0.15)',
                } : {}),
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base" style={{ color: '#E2E8F0' }}>{habit.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                      style={{ background: 'rgba(147,51,234,0.15)', border: '1px solid rgba(147,51,234,0.25)', color: '#C084FC' }}
                    >
                      {habit.frequency}
                    </span>
                    {habit.currentStreak > 0 && (
                      <span className="text-xs" style={{ color: 'rgba(201,168,76,0.8)' }}>
                        🔥 {habit.currentStreak}d streak
                      </span>
                    )}
                  </div>
                </div>
                <HabitCheckIn
                  habitId={habit.id}
                  completedToday={habit.completedToday}
                  onCheckedIn={load}
                />
              </div>
              <HabitGrid logs={habit.logs} />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
