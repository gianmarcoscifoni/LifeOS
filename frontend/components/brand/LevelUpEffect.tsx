'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LevelUpEffectProps {
  newLevel: number;
  onDismiss: () => void;
}

export function LevelUpEffect({ newLevel, onDismiss }: LevelUpEffectProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDismiss(); }, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            className="relative z-10 text-center"
            initial={{ scale: 0.4, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <motion.p
              className="text-yellow-400 text-6xl font-black tracking-widest"
              animate={{ textShadow: ['0 0 20px #C9A84C', '0 0 60px #C9A84C', '0 0 20px #C9A84C'] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              LEVEL UP!
            </motion.p>
            <p className="text-white text-2xl font-bold mt-2">
              Level <span className="text-yellow-400">{newLevel}</span>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
