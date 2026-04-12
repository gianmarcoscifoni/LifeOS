'use client';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useXpFloaterStore, type FloatReward } from '@/lib/store';

export function XpFloater() {
  const { rewards, removeReward } = useXpFloaterStore();

  return (
    <div className="fixed inset-0 z-[8000] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {rewards.map((reward, i) => (
          <FloatItem
            key={reward.id}
            reward={reward}
            index={i}
            onDone={() => removeReward(reward.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function FloatItem({
  reward,
  index,
  onDone,
}: {
  reward: FloatReward;
  index: number;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2600 + index * 200);
    return () => clearTimeout(timer);
  }, [onDone, index]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.4, x: '-50%' }}
      animate={{
        opacity: [0, 1, 1, 1, 0],
        y: [-10, -60, -100, -140, -180],
        scale: [0.4, 1.15, 1.05, 1, 0.85],
        x: '-50%',
      }}
      transition={{
        duration: 2.4,
        delay: index * 0.18,
        ease: [0.22, 1, 0.36, 1],
        times: [0, 0.15, 0.4, 0.7, 1],
      }}
      style={{
        position: 'absolute',
        bottom: '120px',
        left: `${reward.x}%`,
        transform: 'translateX(-50%)',
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full font-syne font-black text-sm whitespace-nowrap select-none"
        style={{
          background: `${reward.color}18`,
          border: `1.5px solid ${reward.color}60`,
          color: reward.color,
          boxShadow: `0 0 20px ${reward.color}40, 0 4px 16px rgba(0,0,0,0.4)`,
          backdropFilter: 'blur(8px)',
          textShadow: `0 0 12px ${reward.color}`,
        }}
      >
        <span className="text-lg leading-none">{reward.icon}</span>
        <span>{reward.label}</span>
      </div>
    </motion.div>
  );
}
