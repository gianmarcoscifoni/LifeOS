'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useXpFloaterStore, useXpStore, type FloatReward } from '@/lib/store';

const DOMAIN_LABELS: Record<string, { label: string; icon: string }> = {
  habits:    { label: 'Habits',    icon: '🏋️' },
  career:    { label: 'Career',    icon: '💼' },
  content:   { label: 'Content',   icon: '📝' },
  finance:   { label: 'Finance',   icon: '💰' },
  journal:   { label: 'Journal',   icon: '📖' },
  gratitude: { label: 'Gratitude', icon: '🙏' },
  brand:     { label: 'Brand',     icon: '⚡' },
  health:    { label: 'Health',    icon: '❤️' },
  general:   { label: 'General',   icon: '✨' },
};

interface SlashEvent {
  id: string;
  rewards: FloatReward[];
  combo: number;
  totalXp: number;
  finalXp: number;      // after x2 + momentum
  color: string;
  icon: string;
  domain?: string;
  isTaskDone: boolean;
  momentumCount: number;
}

const COMBO_WINDOW_MS = 900;

// Save XP to backend (fire-and-forget)
async function saveXpToDb(reward: FloatReward, finalXp: number) {
  try {
    await fetch('/api/proxy/xp/quick-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action:     reward.action ?? reward.label.replace(/^\+\d+\s*XP\s*/i, '') || 'Action',
        domain:     reward.domain ?? 'general',
        xp_base:    reward.xpBase ?? finalXp,
        is_task_done: reward.isTaskDone ?? false,
      }),
    });
  } catch { /* fire-and-forget, UI already updated */ }
}

export function XpFloater() {
  const { rewards, removeReward, momentumCount, incrementMomentum } = useXpFloaterStore();
  const { addXp }    = useXpStore();
  const [slashes, setSlashes]    = useState<SlashEvent[]>([]);
  const pendingRef   = useRef<FloatReward[]>([]);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fresh = rewards.filter(r => !processedRef.current.has(r.id));
    if (fresh.length === 0) return;
    fresh.forEach(r => processedRef.current.add(r.id));
    pendingRef.current = [...pendingRef.current, ...fresh];

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const batch = pendingRef.current;
      pendingRef.current = [];
      if (batch.length === 0) return;

      const primary    = batch[batch.length - 1];
      const isTaskDone = batch.some(r => r.isTaskDone);
      const combo      = batch.length;

      // Base XP from labels
      const baseXp = batch.reduce((sum, r) => {
        const n = (r.xpBase ?? parseInt(r.label.replace(/[^0-9]/g, ''), 10)) || 0;
        return sum + n;
      }, 0);

      // x2 if task done
      const afterDouble = isTaskDone ? baseXp * 2 : baseXp;

      // Momentum bonus: each consecutive event in 30s window adds 10% (cap x3)
      incrementMomentum();
      const mc = useXpFloaterStore.getState().momentumCount;
      const momentumMult = Math.min(3, 1 + (mc - 1) * 0.15);
      const finalXp = Math.round(afterDouble * momentumMult);

      addXp(finalXp);
      batch.forEach(r => saveXpToDb(r, finalXp));

      setSlashes(prev => [...prev, {
        id:            `slash-${Date.now()}`,
        rewards:       batch,
        combo,
        totalXp:       baseXp,
        finalXp,
        color:         primary.color,
        icon:          primary.icon,
        domain:        primary.domain,
        isTaskDone,
        momentumCount: mc,
      }]);
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

// ── SlashBar ──────────────────────────────────────────────────────────────────

function SlashBar({ slash, onDone }: { slash: SlashEvent; onDone: () => void }) {
  const duration = slash.momentumCount >= 3 ? 3800 : slash.isTaskDone ? 3400 : slash.combo >= 2 ? 3200 : 2600;
  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);

  const isCombo    = slash.combo >= 2;
  const hasMomentum = slash.momentumCount >= 2;
  const domainMeta = DOMAIN_LABELS[slash.domain ?? 'general'] ?? DOMAIN_LABELS.general;
  const xpLabel    = `+${slash.finalXp} XP`;

  return (
    <motion.div
      className="absolute"
      style={{ top: 56, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}
      initial={{ x: '110%', opacity: 0, skewX: -8 }}
      animate={{ x: 0, opacity: 1, skewX: 0 }}
      exit={{ x: '110%', opacity: 0, skewX: 6 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>

        {/* Domain chip — appears first, underlines the category */}
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ delay: 0.04, type: 'spring', stiffness: 380, damping: 22 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 999,
            background: `${slash.color}18`,
            border: `1px solid ${slash.color}45`,
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            color: slash.color,
            backdropFilter: 'blur(12px)',
          }}
        >
          <span>{domainMeta.icon}</span>
          <span style={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {domainMeta.label}
          </span>
          {slash.isTaskDone && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.4, 1.1] }}
              transition={{ delay: 0.12, duration: 0.35 }}
              style={{
                background: `${slash.color}30`,
                border: `1px solid ${slash.color}60`,
                borderRadius: 6,
                padding: '1px 5px',
                fontSize: 10,
                fontWeight: 900,
                color: slash.color,
              }}
            >
              ×2
            </motion.span>
          )}
          {hasMomentum && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.18, duration: 0.3 }}
              style={{
                background: 'rgba(201,168,76,0.2)',
                border: '1px solid rgba(201,168,76,0.5)',
                borderRadius: 6,
                padding: '1px 5px',
                fontSize: 10,
                fontWeight: 900,
                color: '#C9A84C',
              }}
            >
              🔥 ×{slash.momentumCount}
            </motion.span>
          )}
        </motion.div>

        {/* Main XP bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 20px',
            borderRadius: 18,
            background: `linear-gradient(100deg, rgba(5,2,16,0.92) 0%, ${slash.color}18 100%)`,
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
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `linear-gradient(105deg, transparent 30%, ${slash.color}28 50%, transparent 70%)`,
            }}
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.05 }}
          />

          {/* Icon */}
          <motion.span
            style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: [0, 1.5, 1.1], rotate: [0, 8, 0] }}
            transition={{ duration: 0.4, times: [0, 0.5, 1], delay: 0.08 }}
          >
            {slash.icon}
          </motion.span>

          {/* XP number */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <motion.p
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                color: slash.color,
                textShadow: `0 0 16px ${slash.color}`,
              }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              {xpLabel}
            </motion.p>
            {slash.isTaskDone && (
              <p style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: `${slash.color}80`, marginTop: 1 }}>
                Task complete — double XP!
              </p>
            )}
            {!slash.isTaskDone && slash.rewards[0]?.action && (
              <p style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', color: `${slash.color}70`, marginTop: 1 }}>
                {slash.rewards[0].action}
              </p>
            )}
          </div>

          {/* Combo badge */}
          {isCombo && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [0, 1.6, 1.2], rotate: [0, 12, 0] }}
              transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.18 }}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 10px',
                borderRadius: 12,
                background: `${slash.color}22`,
                border: `1.5px solid ${slash.color}60`,
              }}
            >
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 18, lineHeight: 1, color: slash.color, textShadow: `0 0 12px ${slash.color}` }}>
                x{slash.combo}
              </span>
              <span style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: `${slash.color}90` }}>
                combo
              </span>
            </motion.div>
          )}

          {/* Countdown bar */}
          <motion.div
            style={{ position: 'absolute', bottom: 0, left: 0, height: 2, borderRadius: 999, background: slash.color, boxShadow: `0 0 6px ${slash.color}` }}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: duration / 1000, ease: 'linear', delay: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
