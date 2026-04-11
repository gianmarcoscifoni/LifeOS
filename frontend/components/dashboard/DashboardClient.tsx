'use client';
import { motion } from 'framer-motion';
import { Activity, Briefcase, DollarSign, FileText, Zap } from 'lucide-react';
import { XpBar } from '@/components/brand/XpBar';

interface DashboardOverview {
  brand: {
    codename: string;
    level: number;
    tier: string;
    totalXp: number;
    xpToNextLevel: number;
    currentLevelXp: number;
  };
  habits: {
    totalHabits: number;
    completedToday: number;
    longestStreak: number;
  };
  career: {
    activeGoals: number;
    totalMilestones: number;
    completedMilestones: number;
  };
  finance: {
    currentRal: number;
    targetRal: number;
    monthlySavings: number;
  };
  content: {
    queueSize: number;
    publishedThisMonth: number;
    readyToPublish: number;
  };
}

const TIER_COLOR: Record<string, string> = {
  bronze:    '#CD7F32',
  silver:    '#C0C0C0',
  gold:      '#C9A84C',
  platinum:  '#67E8F9',
  legendary: '#C084FC',
};

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 110, damping: 16 } },
};

export function DashboardClient({ data }: { data: DashboardOverview | null }) {
  const xpPercent = data
    ? Math.min(100, Math.round((data.brand.currentLevelXp / data.brand.xpToNextLevel) * 100))
    : 0;
  const tierColor = data ? (TIER_COLOR[data.brand.tier] ?? '#9333EA') : '#9333EA';

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1
            className="text-3xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #E2E8F0 0%, rgba(226,232,240,0.6) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(226,232,240,0.4)' }}>
            {data ? data.brand.codename : 'sovereign_engineer'} ✦ Digital Aura
          </p>
        </div>

        {data && (
          <div
            className="px-3 py-1.5 rounded-xl text-xs font-black tracking-widest"
            style={{
              color: tierColor,
              background: `${tierColor}15`,
              border: `1px solid ${tierColor}40`,
              boxShadow: `0 0 12px ${tierColor}30`,
            }}
          >
            {data.brand.tier.toUpperCase()} · LV{data.brand.level}
          </div>
        )}
      </motion.div>

      {/* XP Card */}
      {data && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 90, damping: 15, delay: 0.1 }}
          className="glass-purple p-5"
          style={{ borderRadius: '1.25rem' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} style={{ color: '#9333EA', filter: 'drop-shadow(0 0 6px rgba(147,51,234,0.8))' }} />
            <span className="text-sm font-semibold" style={{ color: '#C084FC' }}>
              Aura Progress
            </span>
          </div>
          <XpBar
            currentXp={data.brand.currentLevelXp}
            xpToNextLevel={data.brand.xpToNextLevel}
            level={data.brand.level}
          />
          <p className="text-xs mt-3" style={{ color: 'rgba(226,232,240,0.35)' }}>
            {xpPercent}% to Level {data.brand.level + 1} · Total: {data.brand.totalXp.toLocaleString()} XP
          </p>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <StatCard
          icon={<Activity size={20} />}
          label="Habits Today"
          value={data ? `${data.habits.completedToday}/${data.habits.totalHabits}` : '—'}
          sub={data ? `🔥 ${data.habits.longestStreak}d streak` : ''}
          accent="#9333EA"
        />
        <StatCard
          icon={<Briefcase size={20} />}
          label="Active Goals"
          value={data ? String(data.career.activeGoals) : '—'}
          sub={data ? `${data.career.completedMilestones}/${data.career.totalMilestones} milestones` : ''}
          accent="#C084FC"
        />
        <StatCard
          icon={<DollarSign size={20} />}
          label="Monthly Savings"
          value={data ? `€${data.finance.monthlySavings.toLocaleString()}` : '—'}
          sub={data ? `Target: €${data.finance.targetRal.toLocaleString()} RAL` : ''}
          accent="#C9A84C"
        />
        <StatCard
          icon={<FileText size={20} />}
          label="Content Queue"
          value={data ? String(data.content.queueSize) : '—'}
          sub={data ? `${data.content.readyToPublish} ready` : ''}
          accent="#F0C96E"
        />
      </motion.div>

      {/* Career milestones bar */}
      {data && data.career.totalMilestones > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass p-5"
          style={{ borderRadius: '1.25rem' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: 'rgba(226,232,240,0.7)' }}>
              Career Milestones
            </span>
            <span className="text-xs" style={{ color: 'rgba(226,232,240,0.4)' }}>
              {data.career.completedMilestones}/{data.career.totalMilestones}
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #6B21A8, #9333EA)' }}
              initial={{ width: 0 }}
              animate={{
                width: `${Math.round((data.career.completedMilestones / data.career.totalMilestones) * 100)}%`,
              }}
              transition={{ type: 'spring', stiffness: 60, damping: 14, delay: 0.5 }}
            />
          </div>
        </motion.div>
      )}

      {!data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass text-center py-12"
          style={{ borderRadius: '1.25rem', borderStyle: 'dashed' }}
        >
          <p className="text-2xl mb-2">🌙</p>
          <p className="text-sm" style={{ color: 'rgba(226,232,240,0.4)' }}>
            Backend offline — avvia l&apos;API per i dati live
          </p>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <motion.div
      variants={item}
      className="glass p-4 space-y-2 cursor-default"
      style={{ borderRadius: '1.25rem' }}
      whileHover={{
        scale: 1.03,
        boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 20px ${accent}25`,
        transition: { type: 'spring', stiffness: 400, damping: 20 },
      }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="flex items-center gap-2" style={{ color: accent }}>
        {icon}
        <span className="text-xs font-medium" style={{ color: 'rgba(226,232,240,0.5)' }}>{label}</span>
      </div>
      <p
        className="text-2xl font-black"
        style={{ color: '#E2E8F0', textShadow: `0 0 16px ${accent}40` }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: 'rgba(226,232,240,0.4)' }}>{sub}</p>
      )}
    </motion.div>
  );
}
