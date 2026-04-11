'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export function HabitCheckIn({ habitId, completedToday }: { habitId: string; completedToday: boolean }) {
  const [done, setDone] = useState(completedToday);
  const [loading, setLoading] = useState(false);
  const [burst, setBurst] = useState(false);

  async function handleCheckIn() {
    if (done || loading) return;
    setLoading(true);
    try {
      await fetch(`/api/proxy/habits/${habitId}/log`, { method: 'POST' });
      setDone(true);
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  return (
    <motion.button
      onClick={handleCheckIn}
      disabled={done || loading}
      className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
      style={done ? {
        background: 'rgba(147,51,234,0.2)',
        border: '1px solid rgba(147,51,234,0.4)',
        color: '#C084FC',
        cursor: 'default',
        boxShadow: '0 0 12px rgba(147,51,234,0.2)',
      } : {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'rgba(226,232,240,0.6)',
      }}
      whileTap={done ? {} : { scale: 0.93 }}
      whileHover={done ? {} : { scale: 1.05, borderColor: 'rgba(147,51,234,0.4)' }}
      animate={burst ? { scale: [1, 1.2, 0.95, 1] } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
    >
      <Check size={12} />
      {done ? 'Done' : loading ? '...' : 'Check in'}
    </motion.button>
  );
}
