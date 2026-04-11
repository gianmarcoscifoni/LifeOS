'use client';
import { motion } from 'framer-motion';

interface XpBarProps {
  currentXp: number;
  xpToNextLevel: number;
  level: number;
}

export function XpBar({ currentXp, xpToNextLevel, level }: XpBarProps) {
  const pct = Math.min(100, Math.round((currentXp / xpToNextLevel) * 100));

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs" style={{ color: 'rgba(226,232,240,0.6)' }}>
        <span>Level {level}</span>
        <span>{currentXp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP</span>
      </div>

      {/* Track */}
      <div
        className="h-3 rounded-full overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Fill */}
        <motion.div
          className="h-full rounded-full xp-shimmer"
          style={{
            background: 'linear-gradient(90deg, #3B0D7A, #9333EA, #C9A84C)',
            boxShadow: '0 0 14px rgba(147, 51, 234, 0.7), 0 0 30px rgba(147,51,234,0.3)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 14, delay: 0.3 }}
        />
      </div>

      <p className="text-xs text-right" style={{ color: 'rgba(201,168,76,0.7)' }}>
        {pct}% → Level {level + 1}
      </p>
    </div>
  );
}
