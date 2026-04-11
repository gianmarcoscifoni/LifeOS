'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TierMap } from '@/components/xp/TierMap';
import { XP_ACTIONS, tierForLevel, levelFromTotalXp, xpToNextLevel } from '@/lib/xp';

export default function LevelsPage() {
  const [totalXp, setTotalXp] = useState(0);
  const [level, setLevel]     = useState(1);
  const [currentXp, setCurrentXp] = useState(0);
  const [xpNext, setXpNext]   = useState(1000);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [logging, setLogging] = useState<string | null>(null);
  const [lastGain, setLastGain] = useState<{ xp: number; label: string } | null>(null);

  useEffect(() => {
    fetch('/api/proxy/brand/profile')
      .then(r => r.ok ? r.json() : null)
      .then(p => {
        if (p) {
          setTotalXp(p.totalXp ?? 0);
          setLevel(p.level ?? 1);
          setCurrentXp(p.currentLevelXp ?? 0);
          setXpNext(p.xpToNextLevel ?? xpToNextLevel(p.level ?? 1));
        }
      })
      .catch(() => {});
  }, []);

  const derived = levelFromTotalXp(totalXp);
  const displayLevel = derived.level;
  const tier = tierForLevel(displayLevel);
  const pct = Math.min(100, Math.round((derived.currentLevelXp / derived.xpToNext) * 100));

  async function logAction(action: typeof XP_ACTIONS[0]) {
    setLogging(action.id);
    try {
      const res = await fetch('/api/proxy/brand/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action.label }),
      });
      if (res.ok) {
        const data = await res.json();
        setTotalXp(prev => prev + (data.xpGained ?? action.xp));
        setLastGain({ xp: data.xpGained ?? action.xp, label: action.label });
        setTimeout(() => setLastGain(null), 2500);
      }
    } catch { /* offline */ }
    finally { setLogging(null); }
  }

  const categories = ['all', 'mind', 'health', 'gratitude', 'brand', 'career', 'finance'];
  const filtered = activeCategory === 'all'
    ? XP_ACTIONS
    : XP_ACTIONS.filter(a => a.category === activeCategory);

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1
          className="text-4xl font-syne font-extrabold tracking-hero"
          style={{
            background: `linear-gradient(135deg, ${tier.color} 0%, #E2E8F0 100%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          XP & Levels
        </h1>
        <p className="text-sm font-inter mt-1" style={{ color: 'rgba(226,232,240,0.4)' }}>
          From Initiate to Sovereign — top 0.1% worldwide
        </p>
      </motion.div>

      {/* XP Bar hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-purple p-6 space-y-4"
        style={{ borderRadius: '1.5rem' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-inter tracking-widest mb-1" style={{ color: `${tier.color}80` }}>
              CURRENT LEVEL
            </p>
            <p
              className="text-5xl font-syne font-extrabold"
              style={{ color: tier.color, textShadow: `0 0 30px ${tier.glow}` }}
            >
              {displayLevel}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-2xl font-syne font-black tracking-wider"
              style={{ color: tier.color }}
            >
              {tier.name}
            </p>
            <p className="text-xs font-inter mt-1" style={{ color: 'rgba(226,232,240,0.4)' }}>
              {tier.percentile}
            </p>
          </div>
        </div>

        {/* XP bar */}
        <div>
          <div
            className="h-4 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <motion.div
              className="h-full rounded-full xp-shimmer"
              style={{
                background: `linear-gradient(90deg, ${tier.color}80, ${tier.color})`,
                boxShadow: `0 0 16px ${tier.glow}`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 50, damping: 14, delay: 0.4 }}
            />
          </div>
          <div className="flex justify-between text-xs font-inter mt-1.5" style={{ color: 'rgba(226,232,240,0.4)' }}>
            <span>{derived.currentLevelXp.toLocaleString()} XP</span>
            <span>{pct}% → Lv{displayLevel + 1}</span>
            <span>{derived.xpToNext.toLocaleString()} needed</span>
          </div>
        </div>

        <p className="text-sm font-syne font-bold italic" style={{ color: tier.color }}>
          &ldquo;{tier.motto}&rdquo;
        </p>
      </motion.div>

      {/* +XP toast */}
      {lastGain && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2"
          style={{
            background: 'rgba(134,239,172,0.15)',
            border: '1px solid rgba(134,239,172,0.35)',
            boxShadow: '0 0 24px rgba(134,239,172,0.2)',
          }}
        >
          <span className="text-lg">⚡</span>
          <span className="font-syne font-bold text-sm" style={{ color: '#86EFAC' }}>
            +{lastGain.xp} XP — {lastGain.label}
          </span>
        </motion.div>
      )}

      {/* Log XP section */}
      <div className="space-y-4">
        <h2 className="font-syne font-extrabold text-xl tracking-tight" style={{ color: '#E2E8F0' }}>
          Log an Action
        </h2>

        {/* Category filter */}
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-3 py-1.5 rounded-xl text-xs font-inter font-semibold capitalize transition-all"
              style={activeCategory === cat ? {
                background: 'rgba(147,51,234,0.25)',
                border: '1px solid rgba(147,51,234,0.4)',
                color: '#C084FC',
              } : {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(226,232,240,0.5)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {filtered.map((action, i) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => logAction(action)}
              disabled={logging === action.id}
              className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                opacity: logging === action.id ? 0.6 : 1,
              }}
              whileHover={{
                background: 'rgba(147,51,234,0.1)',
                borderColor: 'rgba(147,51,234,0.25)',
                scale: 1.02,
                transition: { type: 'spring', stiffness: 400 },
              }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="text-2xl">{action.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-inter font-medium truncate" style={{ color: '#E2E8F0' }}>
                  {action.label}
                </p>
                <p className="text-xs font-inter" style={{ color: 'rgba(201,168,76,0.7)' }}>
                  +{action.xp} XP
                </p>
              </div>
              {logging === action.id && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: '#9333EA', borderTopColor: 'transparent' }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tier Map */}
      <div className="space-y-3">
        <h2 className="font-syne font-extrabold text-xl tracking-tight" style={{ color: '#E2E8F0' }}>
          The Journey
        </h2>
        <TierMap currentLevel={displayLevel} totalXp={totalXp} />
      </div>
    </div>
  );
}
