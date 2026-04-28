'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Flame, Trophy, Calendar, Zap } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────

interface MilestoneData {
  days: number;
  name: string;
  icon: string;
  color: string;
  xp_reward: number;
  achieved: boolean;
}

interface NextMilestone {
  days: number;
  name: string;
  icon: string;
  color: string;
  xp_reward: number;
  days_away: number;
}

export interface StreakState {
  current_streak: number;
  longest_streak: number;
  total_days: number;
  today_checked_in: boolean;
  xp_awarded_today: number;
  milestone_hit: { days: number; name: string; icon: string; xp_reward: number; color: string } | null;
  next_milestone: NextMilestone | null;
  milestones_achieved: { days: number; name: string; icon: string; color: string }[];
  milestones_all: MilestoneData[];
  heatmap: boolean[];
}

// ── Animated counter ──────────────────────────────────────────────────────

function AnimatedNumber({ value, className, style }: {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const mv  = useMotionValue(0);
  const spr = useSpring(mv, { stiffness: 60, damping: 18 });
  const [display, setDisplay] = useState(0);

  useEffect(() => { mv.set(value); }, [value, mv]);
  useEffect(() => spr.on('change', v => setDisplay(Math.round(v))), [spr]);

  return <span className={className} style={style}>{display}</span>;
}

// ── Heatmap ───────────────────────────────────────────────────────────────

function Heatmap({ data }: { data: boolean[] }) {
  // 365 bools, index 0 = oldest. Render as 53 weeks × 7 days grid
  const weeks: boolean[][] = [];
  for (let w = 0; w < 53; w++) {
    const week: boolean[] = [];
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      week.push(idx < data.length ? data[idx] : false);
    }
    weeks.push(week);
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px] min-w-max">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((active, di) => (
              <motion.div
                key={di}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (wi * 7 + di) * 0.0008 }}
                className="w-[10px] h-[10px] rounded-[2px]"
                style={{
                  background: active
                    ? `rgba(147,51,234,${0.4 + Math.random() * 0.6})`
                    : 'rgba(255,255,255,0.05)',
                  boxShadow: active ? '0 0 4px rgba(147,51,234,0.4)' : 'none',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Milestone Road ────────────────────────────────────────────────────────

function MilestoneRoad({ milestones, current }: { milestones: MilestoneData[]; current: number }) {
  const visibleMilestones = milestones.filter((_, i) => {
    // Show last 2 achieved + next 4 upcoming
    const achievedCount = milestones.filter(m => m.achieved).length;
    const idx = milestones.indexOf(milestones[i]);
    return idx >= Math.max(0, achievedCount - 2);
  }).slice(0, 6);

  return (
    <div className="relative">
      {/* Connection line */}
      <div
        className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 hidden sm:block"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      />

      <div className="flex items-center justify-between gap-2 sm:gap-0">
        {visibleMilestones.map((m, i) => (
          <motion.div
            key={m.days}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex flex-col items-center gap-1.5 relative z-10"
          >
            <motion.div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
              style={{
                background: m.achieved ? `${m.color}20` : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${m.achieved ? m.color : 'rgba(255,255,255,0.08)'}`,
                boxShadow: m.achieved ? `0 0 16px ${m.color}50` : 'none',
                filter: m.achieved ? 'none' : 'grayscale(1) opacity(0.35)',
              }}
              whileHover={m.achieved ? { scale: 1.15 } : {}}
            >
              {m.icon}
            </motion.div>
            <div className="text-center">
              <p
                className="text-[9px] font-syne font-bold tracking-wide"
                style={{ color: m.achieved ? m.color : 'rgba(226,232,240,0.25)' }}
              >
                {m.days >= 365
                  ? `${Math.round(m.days / 365)}Y`
                  : m.days >= 30
                  ? `${Math.round(m.days / 30)}M`
                  : `${m.days}D`}
              </p>
              {m.days === current && (
                <motion.div
                  className="w-1.5 h-1.5 rounded-full mx-auto mt-0.5"
                  style={{ background: m.color }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Main StreakHero ───────────────────────────────────────────────────────

export function StreakHero() {
  const [state, setState]         = useState<StreakState | null>(null);
  const [showCelebration, setShow] = useState(false);
  const checkedRef                = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    fetch('/api/proxy/streak/checkin', { method: 'POST' })
      .then(r => r.ok ? r.json() : null)
      .then((data: StreakState | null) => {
        if (!data) return;
        setState(data);
        if (data.milestone_hit) setShow(true);
      })
      .catch(() => {
        // Fallback: just read current state
        fetch('/api/proxy/streak')
          .then(r => r.ok ? r.json() : null)
          .then(d => d && setState(d))
          .catch(() => {});
      });
  }, []);

  if (!state) {
    return (
      <div className="rounded-3xl animate-pulse h-48" style={{ background: 'rgba(255,255,255,0.03)' }} />
    );
  }

  const { current_streak, longest_streak, total_days, next_milestone, milestones_all, heatmap, xp_awarded_today } = state;
  const pctToNext = next_milestone
    ? Math.min(100, ((current_streak / next_milestone.days) * 100))
    : 100;

  return (
    <>
      {/* Milestone celebration overlay */}
      <AnimatePresence>
        {showCelebration && state.milestone_hit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
            onClick={() => setShow(false)}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="text-center px-8 py-10 rounded-3xl max-w-sm"
              style={{ background: '#0F0720', border: `2px solid ${state.milestone_hit.color}50` }}
            >
              <motion.div
                className="text-7xl mb-4"
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {state.milestone_hit.icon}
              </motion.div>
              <h2 className="font-syne font-black text-2xl mb-1" style={{ color: state.milestone_hit.color }}>
                {state.milestone_hit.name}
              </h2>
              <p className="font-inter text-sm mb-3" style={{ color: 'rgba(226,232,240,0.6)' }}>
                {state.milestone_hit.days} day streak unlocked
              </p>
              <div
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-syne font-bold text-sm"
                style={{ background: `${state.milestone_hit.color}15`, color: state.milestone_hit.color }}
              >
                <Zap size={14} /> +{state.milestone_hit.xp_reward.toLocaleString()} XP
              </div>
              <p className="text-[10px] font-inter mt-5" style={{ color: 'rgba(226,232,240,0.2)' }}>
                tap to continue
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {/* Main streak card */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(109,40,217,0.15) 0%, rgba(10,4,21,0.9) 60%)',
            border: '1.5px solid rgba(147,51,234,0.3)',
            boxShadow: '0 0 60px rgba(147,51,234,0.12)',
          }}
        >
          {/* Background glow */}
          <div
            className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.2) 0%, transparent 70%)' }}
          />

          <div className="relative flex items-start justify-between gap-4">
            {/* Left: streak number */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame size={16} style={{ color: current_streak > 0 ? '#F97316' : 'rgba(226,232,240,0.3)', filter: current_streak > 0 ? 'drop-shadow(0 0 6px rgba(249,115,22,0.7))' : 'none' }} />
                <span className="text-[10px] font-syne font-bold tracking-widest uppercase" style={{ color: 'rgba(226,232,240,0.4)' }}>
                  Daily Streak
                </span>
              </div>

              <div className="flex items-end gap-2">
                <AnimatedNumber
                  value={current_streak}
                  className="font-syne font-black leading-none"
                  style={{
                    fontSize: 'clamp(3rem, 8vw, 5rem)',
                    background: current_streak > 0
                      ? 'linear-gradient(135deg, #F97316 0%, #FCD34D 100%)'
                      : 'rgba(226,232,240,0.25)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                />
                <span className="font-syne text-xl font-bold mb-2" style={{ color: 'rgba(226,232,240,0.4)' }}>
                  {current_streak === 1 ? 'day' : 'days'}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-[11px] font-inter" style={{ color: 'rgba(226,232,240,0.35)' }}>
                  <Trophy size={10} /> Best: {longest_streak}d
                </span>
                <span className="flex items-center gap-1 text-[11px] font-inter" style={{ color: 'rgba(226,232,240,0.35)' }}>
                  <Calendar size={10} /> Total: {total_days}d
                </span>
                {xp_awarded_today > 0 && (
                  <motion.span
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1 text-[11px] font-syne font-bold"
                    style={{ color: '#C9A84C' }}
                  >
                    <Zap size={10} /> +{xp_awarded_today} XP today
                  </motion.span>
                )}
              </div>
            </div>

            {/* Right: next milestone */}
            {next_milestone && (
              <div className="flex-shrink-0 text-right">
                <p className="text-[10px] font-syne tracking-widest uppercase mb-1" style={{ color: 'rgba(226,232,240,0.3)' }}>
                  Next
                </p>
                <div className="text-3xl mb-0.5">{next_milestone.icon}</div>
                <p className="text-[10px] font-syne font-bold" style={{ color: next_milestone.color }}>
                  {next_milestone.name}
                </p>
                <p className="text-[10px] font-inter" style={{ color: 'rgba(226,232,240,0.3)' }}>
                  {next_milestone.days_away}d away
                </p>
              </div>
            )}
          </div>

          {/* Progress bar to next milestone */}
          {next_milestone && (
            <div className="mt-5">
              <div className="flex justify-between text-[10px] font-inter mb-1.5" style={{ color: 'rgba(226,232,240,0.3)' }}>
                <span>{current_streak}d</span>
                <span style={{ color: next_milestone.color }}>{next_milestone.days}d — {next_milestone.name}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, #7C3AED, ${next_milestone.color})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pctToNext}%` }}
                  transition={{ type: 'spring', stiffness: 50, damping: 14, delay: 0.3 }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Milestone road */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-purple px-5 py-4"
        >
          <p className="text-[10px] font-syne font-bold tracking-widest uppercase mb-4" style={{ color: 'rgba(226,232,240,0.3)' }}>
            Milestone Path
          </p>
          <MilestoneRoad milestones={milestones_all} current={current_streak} />
        </motion.div>

        {/* Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-purple px-5 py-4"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-syne font-bold tracking-widest uppercase" style={{ color: 'rgba(226,232,240,0.3)' }}>
              Activity — last 365 days
            </p>
            <p className="text-[10px] font-inter" style={{ color: 'rgba(226,232,240,0.2)' }}>
              {heatmap.filter(Boolean).length} days active
            </p>
          </div>
          <Heatmap data={heatmap} />
        </motion.div>
      </div>
    </>
  );
}
