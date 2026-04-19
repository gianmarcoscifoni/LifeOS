'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useXpFloaterStore, useXpStore, type FloatReward } from '@/lib/store';

// ── Slash bar — Fruit Ninja style ─────────────────────────────────────────

interface SlashEvent {
  id: string;
  rewards: FloatReward[];
  combo: number;          // 1 = single, 2 = x2, 3 = x3…
  totalXp: number;
  color: string;
  icon: string;
}

const COMBO_WINDOW_MS = 900; // rewards arriving within this window stack a combo

export function XpFloater() {
  const { rewards, removeReward }   = useXpFloaterStore();
  const { addXp }                    = useXpStore();
  const [slashes, setSlashes]        = useState<SlashEvent[]>([]);
  const pendingRef                   = useRef<FloatReward[]>([]);
  const timerRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedRef                 = useRef<Set<string>>(new Set());

  // Collect arriving rewards into pending, then fire a single SlashEvent
  useEffect(() => {
    const fresh = rewards.filter(r => !processedRef.current.has(r.id));
    if (fresh.length === 0) return;

    fresh.forEach(r => processedRef.current.add(r.id));
    pendingRef.current = [...pendingRef.current, ...fresh];

    // Clear existing debounce — wait for more to arrive
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const batch = pendingRef.current;
      pendingRef.current = [];
      if (batch.length === 0) return;

      const totalXp = batch.reduce((sum, r) => {
        const n = parseInt(r.label.replace(/[^0-9]/g, ''), 10) || 0;
        return sum + n;
      }, 0);
      const combo   = batch.length;
      const primary = batch[batch.length - 1];

      addXp(totalXp);

      const slash: SlashEvent = {
        id:      `slash-${Date.now()}`,
        rewards: batch,
        combo,
        totalXp,
        color:   primary.color,
        icon:    primary.icon,
      };
      setSlashes(prev => [...prev, slash]);
      batch.forEach(r => removeReward(r.id));
    }, COMBO_WINDOW_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewards]);

  return (
    <div className="fixed inset-0 z-[8000] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {slashes.map(slash => (
          <SlashBar
            key={slash.id}
            slash={slash}
            onDone={() => setSlashes(prev => prev.filter(s => s.id !== slash.id))}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── SlashBar ─────────────────────────────────────────────────────────────────

function SlashBar({ slash, onDone }: { slash: SlashEvent; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, slash.combo >= 2 ? 3200 : 2400);
    return () => clearTimeout(t);
  }, [onDone, slash.combo]);

  const isCombo = slash.combo >= 2;

  return (
    <motion.div
      className="absolute"
      style={{ top: 56, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}
      initial={{ x: '110%', opacity: 0, skewX: -8 }}
      animate={{ x: 0, opacity: 1, skewX: 0 }}
      exit={{ x: '110%', opacity: 0, skewX: 6 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
    >
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl"
        style={{
          background: `linear-gradient(100deg, rgba(5,2,16,0.9) 0%, ${slash.color}18 100%)`,
          border: `1.5px solid ${slash.color}55`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: `0 0 40px ${slash.color}30, 0 4px 24px rgba(0,0,0,0.5)`,
          minWidth: 220,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Slash sweep shimmer */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(105deg, transparent 30%, ${slash.color}28 50%, transparent 70%)`,
          }}
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.05 }}
        />

        {/* Icon */}
        <motion.span
          className="text-xl leading-none flex-shrink-0"
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: [0, 1.5, 1.1], rotate: [0, 8, 0] }}
          transition={{ duration: 0.4, times: [0, 0.5, 1], delay: 0.08 }}
        >
          {slash.icon}
        </motion.span>

        {/* XP label */}
        <div className="flex-1 min-w-0">
          <motion.p
            className="font-syne font-black leading-tight whitespace-nowrap"
            style={{ color: slash.color, textShadow: `0 0 16px ${slash.color}` }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            {isCombo ? `+${slash.totalXp} XP` : slash.rewards[0]?.label ?? `+${slash.totalXp} XP`}
          </motion.p>
          {slash.rewards[0]?.label && !isCombo && (
            <p className="text-xs font-inter truncate" style={{ color: `${slash.color}80` }}>
              {slash.rewards[0].label.replace(/^\+\d+\s*XP\s*[-–]?\s*/i, '')}
            </p>
          )}
        </div>

        {/* Combo badge */}
        {isCombo && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.6, 1.2], rotate: [0, 12, 0] }}
            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.18 }}
            className="flex-shrink-0 flex flex-col items-center justify-center px-2.5 py-1 rounded-xl"
            style={{
              background: `${slash.color}22`,
              border: `1.5px solid ${slash.color}60`,
            }}
          >
            <span
              className="font-syne font-black text-lg leading-none"
              style={{ color: slash.color, textShadow: `0 0 12px ${slash.color}` }}
            >
              x{slash.combo}
            </span>
            <span
              className="text-[9px] font-inter font-bold tracking-widest uppercase"
              style={{ color: `${slash.color}90` }}
            >
              combo
            </span>
          </motion.div>
        )}

        {/* XP bar fill */}
        <XpFillBar color={slash.color} />
      </div>
    </motion.div>
  );
}

// ── Animated fill bar (slides across bottom like a progress bar) ──────────

function XpFillBar({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute bottom-0 left-0 h-0.5 rounded-full"
      style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      initial={{ width: '100%' }}
      animate={{ width: '0%' }}
      transition={{ duration: 2.4, ease: 'linear', delay: 0.3 }}
    />
  );
}
