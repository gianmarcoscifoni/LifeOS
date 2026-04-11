'use client';
import { motion } from 'framer-motion';
import { XpBar } from './XpBar';

interface CharacterCardProps {
  codename: string;
  title: string;
  level: number;
  tier: string;
  totalXp: number;
  currentLevelXp: number;
  xpToNextLevel: number;
}

const TIER_BADGE: Record<string, { label: string; color: string; glow: string }> = {
  bronze:    { label: 'BRONZE',    color: '#CD7F32', glow: 'rgba(205,127,50,0.5)' },
  silver:    { label: 'SILVER',    color: '#C0C0C0', glow: 'rgba(192,192,192,0.4)' },
  gold:      { label: 'GOLD',      color: '#C9A84C', glow: 'rgba(201,168,76,0.6)' },
  platinum:  { label: 'PLATINUM',  color: '#67E8F9', glow: 'rgba(103,232,249,0.5)' },
  legendary: { label: 'LEGENDARY', color: '#C084FC', glow: 'rgba(192,132,252,0.6)' },
};

export function CharacterCard({
  codename, title, level, tier, totalXp, currentLevelXp, xpToNextLevel,
}: CharacterCardProps) {
  const badge = TIER_BADGE[tier] ?? TIER_BADGE.bronze;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      className="relative overflow-hidden rounded-2xl p-6 space-y-5"
      style={{
        background: 'linear-gradient(135deg, rgba(59,13,122,0.55) 0%, rgba(107,33,168,0.35) 50%, rgba(10,4,21,0.6) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid ${badge.color}30`,
        boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 30px ${badge.glow}`,
      }}
      whileHover={{ scale: 1.01, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
    >
      {/* Decorative corner orb */}
      <div
        className="absolute -top-20 -right-20 w-56 h-56 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${badge.color}30 0%, transparent 70%)`,
          filter: 'blur(30px)',
        }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <h2
            className="text-3xl font-black tracking-tight"
            style={{
              color: '#E2E8F0',
              textShadow: '0 0 20px rgba(147,51,234,0.5)',
            }}
          >
            {codename}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(226,232,240,0.55)' }}>{title}</p>
        </div>

        <div
          className="flex flex-col items-center px-3 py-1.5 rounded-xl"
          style={{
            background: `${badge.color}18`,
            border: `1px solid ${badge.color}50`,
            boxShadow: `0 0 12px ${badge.glow}`,
          }}
        >
          <span className="text-xs font-black tracking-widest" style={{ color: badge.color }}>
            {badge.label}
          </span>
          <span className="text-lg font-black" style={{ color: badge.color }}>
            LV{level}
          </span>
        </div>
      </div>

      <div className="relative z-10">
        <XpBar currentXp={currentLevelXp} xpToNextLevel={xpToNextLevel} level={level} />
      </div>

      <p className="text-xs relative z-10" style={{ color: 'rgba(201,168,76,0.5)' }}>
        Total XP: {totalXp.toLocaleString()}
      </p>
    </motion.div>
  );
}
