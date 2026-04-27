'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Target, CalendarDays, ListTodo, Trophy, Mic } from 'lucide-react';
import { DailyView } from '@/components/goals/DailyView';
import { GoalTimeline } from '@/components/goals/GoalTimeline';
import { Top10Goals } from '@/components/goals/Top10Goals';
import { PageVoiceEntry } from '@/components/voice/PageVoiceEntry';
import { InterviewsTab } from '@/components/career/InterviewsTab';

type CareerTab = 'daily' | 'goals' | 'timeline' | 'top10' | 'interviews';

const TAB_CONFIG: { id: CareerTab; label: string; icon: React.ReactNode }[] = [
  { id: 'daily',      label: 'Oggi',        icon: <ListTodo size={13} /> },
  { id: 'goals',      label: 'Goals',       icon: <Target size={13} /> },
  { id: 'timeline',   label: 'Timeline',    icon: <CalendarDays size={13} /> },
  { id: 'top10',      label: 'Top 10',      icon: <Trophy size={13} /> },
  { id: 'interviews', label: 'Interviews',  icon: <Mic size={13} /> },
];

interface Milestone { id: string; title: string; isCompleted: boolean; dueDate?: string }
interface Goal { id: string; title: string; description?: string; status: string; milestones: Milestone[] }

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 110, damping: 16 } },
};

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  completed:   { color: '#34D399', bg: 'rgba(52,211,153,0.12)',   border: 'rgba(52,211,153,0.25)' },
  in_progress: { color: '#C084FC', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)' },
  paused:      { color: 'rgba(226,232,240,0.4)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' },
};

function GoalsTab() {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    fetch('/api/proxy/career/goals')
      .then(r => r.ok ? r.json() : [])
      .then(setGoals)
      .catch(() => setGoals([]));
  }, []);

  if (goals.length === 0) {
    return (
      <div className="glass text-center py-14" style={{ borderRadius: '1.25rem', borderStyle: 'dashed' }}>
        <p className="text-3xl mb-2">🌙</p>
        <p className="text-sm" style={{ color: 'rgba(226,232,240,0.4)' }}>No goals yet</p>
      </div>
    );
  }

  return (
    <motion.div className="space-y-4" variants={container} initial="hidden" animate="visible">
      {goals.map(goal => {
        const total = goal.milestones?.length ?? 0;
        const done  = goal.milestones?.filter(m => m.isCompleted).length ?? 0;
        const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
        const ss = STATUS_STYLE[goal.status] ?? STATUS_STYLE.paused;

        return (
          <motion.div
            key={goal.id}
            variants={item}
            className="glass p-5 space-y-4"
            style={{ borderRadius: '1.25rem' }}
            whileHover={{ scale: 1.01, transition: { type: 'spring', stiffness: 400 } }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Target size={16} style={{ color: '#9333EA', marginTop: 3, flexShrink: 0 }} />
                <div>
                  <p className="font-bold" style={{ color: '#E2E8F0' }}>{goal.title}</p>
                  {goal.description && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(226,232,240,0.4)' }}>
                      {goal.description}
                    </p>
                  )}
                </div>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}
              >
                {goal.status}
              </span>
            </div>

            {total > 0 && (
              <>
                <div>
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'rgba(226,232,240,0.4)' }}>
                    <span>{done}/{total} milestones</span>
                    <span style={{ color: '#9333EA' }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #6B21A8, #9333EA)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ type: 'spring', stiffness: 60, damping: 14 }}
                    />
                  </div>
                </div>
                <ul className="space-y-2">
                  {goal.milestones.map(m => (
                    <li key={m.id} className="flex items-center gap-2 text-sm">
                      {m.isCompleted
                        ? <CheckCircle2 size={14} style={{ color: '#34D399', flexShrink: 0 }} />
                        : <Circle size={14} style={{ color: 'rgba(226,232,240,0.3)', flexShrink: 0 }} />
                      }
                      <span style={{
                        color: m.isCompleted ? 'rgba(226,232,240,0.4)' : '#E2E8F0',
                        textDecoration: m.isCompleted ? 'line-through' : 'none',
                      }}>
                        {m.title}
                      </span>
                      {m.dueDate && (
                        <span className="ml-auto text-xs" style={{ color: 'rgba(226,232,240,0.3)' }}>
                          {new Date(m.dueDate).toLocaleDateString('it-IT')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export default function CareerPage() {
  const [tab, setTab] = useState<CareerTab>('daily');

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-black tracking-tight"
        style={{
          background: 'linear-gradient(135deg, #C084FC 0%, #E2E8F0 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Career
      </motion.h1>

      <PageVoiceEntry domain="career" />

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TAB_CONFIG.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all"
            style={{
              background: tab === t.id ? 'rgba(147,51,234,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${tab === t.id ? 'rgba(147,51,234,0.5)' : 'rgba(255,255,255,0.08)'}`,
              color: tab === t.id ? '#C084FC' : 'rgba(226,232,240,0.4)',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {tab === 'daily'      && <DailyView />}
        {tab === 'goals'      && <GoalsTab />}
        {tab === 'timeline'   && <GoalTimeline />}
        {tab === 'top10'      && <Top10Goals year={new Date().getFullYear()} />}
        {tab === 'interviews' && <InterviewsTab />}
      </motion.div>
    </div>
  );
}
