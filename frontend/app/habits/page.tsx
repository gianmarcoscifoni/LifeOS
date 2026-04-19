'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HabitGrid } from '@/components/habits/HabitGrid';
import { StreakFire } from '@/components/habits/StreakFire';
import { HabitCheckIn } from '@/components/habits/HabitCheckIn';
import { PageVoiceEntry } from '@/components/voice/PageVoiceEntry';

interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: string;
  currentStreak: number;
  logs: { loggedDate: string; completed: boolean }[];
  completedToday: boolean;
}

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 110, damping: 16 } },
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);

  useEffect(() => {
    fetch('/api/proxy/habits')
      .then(r => r.ok ? r.json() : [])
      .then(setHabits)
      .catch(() => setHabits([]));
  }, []);

  const maxStreak = habits.reduce((m, h) => Math.max(m, h.currentStreak), 0);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
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
        {maxStreak > 0 && <StreakFire streak={maxStreak} />}
      </motion.div>

      <PageVoiceEntry domain="habits" />

      {habits.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass text-center py-14"
          style={{ borderRadius: '1.25rem', borderStyle: 'dashed' }}
        >
          <p className="text-3xl mb-2">🌙</p>
          <p className="text-sm" style={{ color: 'rgba(226,232,240,0.4)' }}>
            No habits yet — add some via the API
          </p>
        </motion.div>
      )}

      <motion.div className="space-y-4" variants={container} initial="hidden" animate="visible">
        {habits.map(habit => {
          const streakLevel =
            habit.currentStreak >= 30 ? 'gold' :
            habit.currentStreak >= 7  ? 'glow' : 'default';

          return (
            <motion.div
              key={habit.id}
              variants={item}
              className="glass p-5 space-y-4"
              style={{
                borderRadius: '1.25rem',
                ...(streakLevel === 'gold' ? {
                  border: '1px solid rgba(201,168,76,0.4)',
                  boxShadow: '0 0 24px rgba(201,168,76,0.15)',
                  animation: 'goldPulse 2.5s ease-in-out infinite',
                } : streakLevel === 'glow' ? {
                  border: '1px solid rgba(147,51,234,0.35)',
                  boxShadow: '0 0 16px rgba(147,51,234,0.12)',
                } : {}),
              }}
              whileHover={{
                scale: 1.01,
                transition: { type: 'spring', stiffness: 400, damping: 20 },
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base" style={{ color: '#E2E8F0' }}>
                    {habit.name}
                  </p>
                  {habit.description && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(226,232,240,0.4)' }}>
                      {habit.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(147,51,234,0.15)',
                        border: '1px solid rgba(147,51,234,0.25)',
                        color: '#C084FC',
                      }}
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
                <HabitCheckIn habitId={habit.id} completedToday={habit.completedToday} />
              </div>

              <HabitGrid logs={habit.logs} />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
