'use client';
import { motion } from 'framer-motion';
import { TIERS, tierForLevel, xpToNextLevel, totalXpForLevel } from '@/lib/xp';
import { Crown, Lock } from 'lucide-react';

interface TierMapProps {
  currentLevel: number;
  totalXp: number;
}

export function TierMap({ currentLevel, totalXp }: TierMapProps) {
  const currentTier = tierForLevel(currentLevel);

  return (
    <div className="space-y-3">
      {/* Current tier hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 14 }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: `linear-gradient(135deg, ${currentTier.bg} 0%, rgba(10,4,21,0.6) 100%)`,
          border: `1px solid ${currentTier.border}`,
          boxShadow: `0 0 40px ${currentTier.glow}`,
        }}
      >
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${currentTier.glow} 0%, transparent 70%)`, filter: 'blur(30px)' }}
        />
        <div className="relative z-10 flex items-start justify-between mb-3">
          <div>
            <p className="text-xs tracking-widest mb-1 font-inter font-semibold" style={{ color: currentTier.color, opacity: 0.8 }}>
              CURRENT TIER
            </p>
            <h2
              className="text-4xl font-syne font-extrabold tracking-hero"
              style={{ color: currentTier.color, textShadow: `0 0 30px ${currentTier.glow}` }}
            >
              {currentTier.name}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-3xl font-syne font-black" style={{ color: currentTier.color }}>
              LV{currentLevel}
            </p>
            <p className="text-xs font-inter" style={{ color: 'rgba(226,232,240,0.5)' }}>
              {currentTier.percentile}
            </p>
          </div>
        </div>
        <p className="text-sm font-inter mb-1" style={{ color: 'rgba(226,232,240,0.65)' }}>
          {currentTier.description}
        </p>
        <p
          className="text-base font-syne font-bold italic"
          style={{ color: currentTier.color, textShadow: `0 0 12px ${currentTier.glow}` }}
        >
          &ldquo;{currentTier.motto}&rdquo;
        </p>
      </motion.div>

      {/* Tier progression map */}
      <div className="space-y-2">
        <p className="text-xs tracking-widest font-inter font-semibold px-1" style={{ color: 'rgba(226,232,240,0.35)' }}>
          JOURNEY TO SOVEREIGN
        </p>
        {TIERS.map((tier, i) => {
          const isReached  = currentLevel >= tier.minLevel;
          const isCurrent  = currentTier.id === tier.id;
          const tierTotalXp = totalXpForLevel(tier.minLevel);

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative flex items-center gap-4 p-3 rounded-xl"
              style={isCurrent ? {
                background: `${tier.bg}`,
                border: `1px solid ${tier.border}`,
                boxShadow: `0 0 16px ${tier.glow}`,
              } : isReached ? {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              } : {
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                opacity: 0.5,
              }}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                style={isReached ? {
                  background: `${tier.color}20`,
                  border: `1px solid ${tier.color}50`,
                  color: tier.color,
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(226,232,240,0.25)',
                }}
              >
                {tier.id === 'sovereign' ? <Crown size={14} /> : isReached ? '✦' : <Lock size={12} />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-syne font-black tracking-wider"
                    style={{ color: isReached ? tier.color : 'rgba(226,232,240,0.3)' }}
                  >
                    {tier.name}
                  </span>
                  <span className="text-[10px] font-inter" style={{ color: 'rgba(226,232,240,0.3)' }}>
                    Lv {tier.minLevel}{tier.maxLevel !== tier.minLevel ? `–${tier.maxLevel}` : ''}
                  </span>
                  {isCurrent && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}40` }}
                    >
                      YOU ARE HERE
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-inter mt-0.5 truncate" style={{ color: 'rgba(226,232,240,0.35)' }}>
                  {tier.motto}
                </p>
              </div>

              {/* Right */}
              <div className="text-right shrink-0">
                <p className="text-[10px] font-inter font-bold" style={{ color: isReached ? tier.color : 'rgba(226,232,240,0.2)' }}>
                  {tierTotalXp >= 1000000
                    ? `${(tierTotalXp / 1000000).toFixed(1)}M`
                    : tierTotalXp >= 1000
                    ? `${(tierTotalXp / 1000).toFixed(0)}K`
                    : tierTotalXp.toLocaleString()} XP
                </p>
                <p className="text-[9px] font-inter" style={{ color: 'rgba(226,232,240,0.25)' }}>
                  {tier.percentile}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-[10px] font-inter text-center pb-2" style={{ color: 'rgba(226,232,240,0.2)' }}>
        Total XP to Sovereign Lv100: ~{(totalXpForLevel(100) / 1000000).toFixed(1)}M
      </p>
    </div>
  );
}
