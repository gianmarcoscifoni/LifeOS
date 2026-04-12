'use client';
import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpBannerProps {
  level: number;
  tier: string;
  title: string;
  onDismiss: () => void;
}

const TIER_COLOR: Record<string, string> = {
  bronze:    '#CD7F32',
  silver:    '#C0C0C0',
  gold:      '#C9A84C',
  platinum:  '#67E8F9',
  legendary: '#C084FC',
};

export function LevelUpBanner({ level, tier, title, onDismiss }: LevelUpBannerProps) {
  const tierColor = TIER_COLOR[tier] ?? '#9333EA';

  // Auto-dismiss after 4s
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  // Pre-generate particles with stable values (not random on each render)
  const particles = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      angle: (i / 28) * 360,
      distance: 90 + (i % 4) * 30,
      color: i % 3 === 0 ? '#C9A84C' : i % 3 === 1 ? '#9333EA' : '#fff',
      size: 4 + (i % 3) * 2,
    })),
  []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center"
      style={{ background: 'rgba(5,2,16,0.9)', backdropFilter: 'blur(20px)' }}
      onClick={onDismiss}
    >
      <div className="relative flex flex-col items-center gap-4">
        {/* Particles */}
        {particles.map((p, i) => {
          const rad = (p.angle * Math.PI) / 180;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: Math.cos(rad) * p.distance,
                y: Math.sin(rad) * p.distance,
                scale: [0, 1.5, 1, 0],
              }}
              transition={{ duration: 1.2, delay: 0.2 + i * 0.02, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                background: p.color,
                boxShadow: `0 0 8px ${p.color}`,
              }}
            />
          );
        })}

        {/* Central card */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
          className="flex flex-col items-center gap-3 px-10 py-8 rounded-3xl text-center"
          style={{
            background: 'rgba(17,8,48,0.95)',
            border: `2px solid ${tierColor}60`,
            boxShadow: `0 0 60px ${tierColor}30, 0 24px 80px rgba(0,0,0,0.8)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* LEVEL UP text */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-syne font-black tracking-widest uppercase"
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 4rem)',
              background: `linear-gradient(135deg, #9333EA, ${tierColor})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1,
            }}
          >
            Level Up!
          </motion.p>

          {/* Level number */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 300, damping: 20 }}
            className="text-6xl font-black font-syne"
            style={{ color: tierColor, textShadow: `0 0 30px ${tierColor}` }}
          >
            {level}
          </motion.div>

          {/* Tier badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase"
            style={{
              background: `${tierColor}20`,
              border: `1px solid ${tierColor}50`,
              color: tierColor,
            }}
          >
            {tier.toUpperCase()}
          </motion.div>

          {/* Title */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
            className="text-base font-inter font-semibold"
            style={{ color: 'rgba(226,232,240,0.7)' }}
          >
            {title}
          </motion.p>

          {/* Dismiss hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-xs font-inter"
            style={{ color: 'rgba(226,232,240,0.25)' }}
          >
            tap to dismiss
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}
