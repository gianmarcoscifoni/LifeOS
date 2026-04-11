'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  isUnlocked: boolean;
  xpReward: number;
}

export function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <AnimatePresence>
      <motion.div
        key={achievement.id}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="relative flex flex-col items-center gap-2 p-4 rounded-2xl cursor-default"
        style={
          achievement.isUnlocked
            ? {
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.35)',
                boxShadow: '0 0 20px rgba(201,168,76,0.12)',
              }
            : {
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                opacity: 0.45,
                filter: 'grayscale(1)',
              }
        }
        whileHover={achievement.isUnlocked ? {
          scale: 1.05,
          boxShadow: '0 0 30px rgba(201,168,76,0.25)',
          transition: { type: 'spring', stiffness: 400, damping: 20 },
        } : {}}
      >
        {achievement.isUnlocked && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{
              boxShadow: [
                '0 0 0px rgba(201,168,76,0)',
                '0 0 18px rgba(201,168,76,0.35)',
                '0 0 0px rgba(201,168,76,0)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        )}

        <Trophy
          size={26}
          style={
            achievement.isUnlocked
              ? { color: '#C9A84C', filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.8))' }
              : { color: 'rgba(226,232,240,0.3)' }
          }
        />
        <span
          className="text-xs font-semibold text-center leading-tight"
          style={{ color: achievement.isUnlocked ? '#E2E8F0' : 'rgba(226,232,240,0.4)' }}
        >
          {achievement.name}
        </span>
        <span
          className="text-[10px] font-bold"
          style={{ color: achievement.isUnlocked ? 'rgba(201,168,76,0.8)' : 'rgba(226,232,240,0.25)' }}
        >
          +{achievement.xpReward} XP
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
