'use client';
import { motion } from 'framer-motion';

export function StreakFire({ streak }: { streak: number }) {
  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2 rounded-2xl"
      style={{
        background: streak >= 30
          ? 'rgba(255,107,0,0.15)'
          : 'rgba(201,168,76,0.12)',
        border: streak >= 30
          ? '1px solid rgba(255,107,0,0.35)'
          : '1px solid rgba(201,168,76,0.3)',
        boxShadow: streak >= 30
          ? '0 0 20px rgba(255,107,0,0.2)'
          : '0 0 14px rgba(201,168,76,0.15)',
      }}
      animate={{
        boxShadow: streak >= 7 ? [
          '0 0 10px rgba(201,168,76,0.15)',
          '0 0 22px rgba(201,168,76,0.3)',
          '0 0 10px rgba(201,168,76,0.15)',
        ] : undefined,
      }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <motion.span
        className="text-2xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      >
        🔥
      </motion.span>
      <div>
        <p
          className="font-black text-xl leading-none"
          style={{
            color: streak >= 30 ? '#FF6B00' : '#C9A84C',
            textShadow: streak >= 7 ? '0 0 10px rgba(201,168,76,0.7)' : 'none',
          }}
        >
          {streak}
        </p>
        <p className="text-[10px]" style={{ color: 'rgba(226,232,240,0.45)' }}>day streak</p>
      </div>
    </motion.div>
  );
}
