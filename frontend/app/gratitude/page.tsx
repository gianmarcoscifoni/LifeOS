'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Zap, Heart, Sparkles } from 'lucide-react';
import {
  MORNING_AFFIRMATIONS,
  EVENING_REFLECTIONS,
  GRATITUDE_PROMPTS,
  LOW_CORTISOL_TIPS,
} from '@/lib/gratitude';

interface GratitudeEntry {
  id: string;
  date: string;
  items: string[];
  mood: number;
  affirmation: string;
  xpGained: number;
}

const hour = new Date().getHours();
const isEvening = hour >= 17;

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function GratitudePage() {
  const [affirmation, setAffirmation] = useState('');
  const [prompts, setPrompts] = useState<string[]>([]);
  const [entries, setEntries] = useState(['', '', '']);
  const [mood, setMood] = useState(4);
  const [saved, setSaved] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [history, setHistory] = useState<GratitudeEntry[]>([]);
  const [tipIndex, setTipIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'journal' | 'affirmations' | 'cortisol'>('journal');

  const refreshAffirmation = useCallback(() => {
    setAffirmation(pickRandom(isEvening ? EVENING_REFLECTIONS : MORNING_AFFIRMATIONS));
  }, []);

  useEffect(() => {
    refreshAffirmation();
    setPrompts([pickRandom(GRATITUDE_PROMPTS), pickRandom(GRATITUDE_PROMPTS), pickRandom(GRATITUDE_PROMPTS)]);
    // Load today's entry from localStorage
    const stored = localStorage.getItem('gratitude_history');
    if (stored) {
      const parsed: GratitudeEntry[] = JSON.parse(stored);
      setHistory(parsed);
      const todayEntry = parsed.find(e => e.date === todayKey());
      if (todayEntry) { setEntries(todayEntry.items); setSaved(true); }
    }
    // Rotate tip every 8s
    const t = setInterval(() => setTipIndex(i => (i + 1) % LOW_CORTISOL_TIPS.length), 8000);
    return () => clearInterval(t);
  }, [refreshAffirmation]);

  async function handleSave() {
    if (saved || entries.every(e => !e.trim())) return;
    const filled = entries.filter(e => e.trim()).length;
    const xp = filled === 3 ? 45 : filled === 2 ? 30 : 15;

    const entry: GratitudeEntry = {
      id: Date.now().toString(),
      date: todayKey(),
      items: entries,
      mood,
      affirmation,
      xpGained: xp,
    };

    const updated = [entry, ...history.filter(e => e.date !== todayKey())].slice(0, 60);
    localStorage.setItem('gratitude_history', JSON.stringify(updated));
    setHistory(updated);
    setSaved(true);
    setXpGained(xp);

    // Try to log XP to backend
    fetch('/api/proxy/brand/xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'Full gratitude journal entry', note: entries.filter(Boolean).join(' | ') }),
    }).catch(() => {});
  }

  const TABS = [
    { id: 'journal' as const, label: 'Journal', icon: '✍️' },
    { id: 'affirmations' as const, label: 'Affirmations', icon: '💛' },
    { id: 'cortisol' as const, label: 'Low Cortisol', icon: '🌿' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1
          className="text-4xl font-syne font-extrabold tracking-hero"
          style={{
            background: 'linear-gradient(135deg, #FCD34D 0%, #F0C96E 50%, #E2E8F0 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Gratitude
        </h1>
        <p className="text-sm font-inter mt-1" style={{ color: 'rgba(226,232,240,0.4)' }}>
          {isEvening ? 'Evening reflection' : 'Morning practice'} · {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </motion.div>

      {/* Cortisol tip rotator */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tipIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{
            background: 'rgba(134,239,172,0.07)',
            border: '1px solid rgba(134,239,172,0.18)',
          }}
        >
          <span className="text-xl">{LOW_CORTISOL_TIPS[tipIndex].icon}</span>
          <p className="text-sm font-inter" style={{ color: 'rgba(226,232,240,0.65)' }}>
            {LOW_CORTISOL_TIPS[tipIndex].tip}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-inter font-semibold rounded-xl transition-colors"
            style={{ color: activeTab === tab.id ? '#E2E8F0' : 'rgba(226,232,240,0.4)' }}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="gratTab"
                className="absolute inset-0 rounded-xl"
                style={{ background: 'rgba(252,211,77,0.1)', border: '1px solid rgba(252,211,77,0.2)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              />
            )}
            <span className="relative z-10">{tab.icon} {tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

        {/* ─── Journal Tab ───────────────────────────────── */}
        {activeTab === 'journal' && (
          <div className="space-y-5">
            {/* Affirmation card */}
            <div
              className="relative p-5 rounded-2xl cursor-pointer group"
              style={{
                background: 'rgba(252,211,77,0.07)',
                border: '1px solid rgba(252,211,77,0.18)',
              }}
              onClick={refreshAffirmation}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-syne font-bold italic leading-relaxed" style={{ color: '#FCD34D' }}>
                  &ldquo;{affirmation}&rdquo;
                </p>
                <RefreshCw
                  size={14}
                  className="shrink-0 mt-1 opacity-40 group-hover:opacity-80 transition-opacity"
                  style={{ color: '#FCD34D' }}
                />
              </div>
            </div>

            {/* Mood selector */}
            <div>
              <p className="text-xs tracking-widest font-inter font-semibold mb-2" style={{ color: 'rgba(226,232,240,0.4)' }}>
                HOW ARE YOU FEELING?
              </p>
              <div className="flex gap-2">
                {[
                  { v: 1, emoji: '😞', label: 'Low' },
                  { v: 2, emoji: '😕', label: 'Off' },
                  { v: 3, emoji: '😐', label: 'Ok' },
                  { v: 4, emoji: '😊', label: 'Good' },
                  { v: 5, emoji: '😄', label: 'Great' },
                ].map(({ v, emoji, label }) => (
                  <motion.button
                    key={v}
                    onClick={() => setMood(v)}
                    className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-inter"
                    style={mood === v ? {
                      background: 'rgba(252,211,77,0.15)',
                      border: '1px solid rgba(252,211,77,0.4)',
                      color: '#FCD34D',
                    } : {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: 'rgba(226,232,240,0.5)',
                    }}
                    whileTap={{ scale: 0.93 }}
                    whileHover={{ scale: 1.04 }}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span>{label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* 3 gratitude inputs */}
            <div className="space-y-3">
              <p className="text-xs tracking-widest font-inter font-semibold" style={{ color: 'rgba(226,232,240,0.4)' }}>
                3 THINGS YOU&apos;RE GRATEFUL FOR
              </p>
              {entries.map((val, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[10px] font-inter" style={{ color: 'rgba(252,211,77,0.55)' }}>
                    {prompts[i]}
                  </p>
                  <textarea
                    value={val}
                    onChange={e => {
                      const updated = [...entries];
                      updated[i] = e.target.value;
                      setEntries(updated);
                    }}
                    disabled={saved}
                    rows={2}
                    placeholder={`Gratitude ${i + 1}…`}
                    className="w-full resize-none text-sm font-inter focus:outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '0.875rem',
                      padding: '10px 14px',
                      color: '#E2E8F0',
                      opacity: saved ? 0.6 : 1,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(252,211,77,0.4)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  />
                </div>
              ))}
            </div>

            {/* Save button */}
            <motion.button
              onClick={handleSave}
              disabled={saved}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-syne font-bold"
              style={saved ? {
                background: 'rgba(134,239,172,0.12)',
                border: '1px solid rgba(134,239,172,0.3)',
                color: '#86EFAC',
                cursor: 'default',
              } : {
                background: 'linear-gradient(135deg, rgba(252,211,77,0.3), rgba(201,168,76,0.5))',
                border: '1px solid rgba(252,211,77,0.4)',
                color: '#FCD34D',
                boxShadow: '0 0 20px rgba(252,211,77,0.2)',
              }}
              whileHover={!saved ? { scale: 1.02, boxShadow: '0 0 28px rgba(252,211,77,0.3)' } : {}}
              whileTap={!saved ? { scale: 0.97 } : {}}
            >
              {saved ? (
                <>
                  <Heart size={15} fill="currentColor" />
                  Saved — +{xpGained} XP earned ✦
                </>
              ) : (
                <>
                  <Zap size={15} />
                  Save & Earn XP (+45 XP)
                </>
              )}
            </motion.button>

            {/* History */}
            {history.filter(e => e.date !== todayKey()).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs tracking-widest font-inter font-semibold" style={{ color: 'rgba(226,232,240,0.35)' }}>
                  PAST ENTRIES
                </p>
                {history.filter(e => e.date !== todayKey()).slice(0, 5).map(entry => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="text-xs font-inter" style={{ color: 'rgba(226,232,240,0.4)' }}>
                        {new Date(entry.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-xs font-bold font-inter" style={{ color: '#C9A84C' }}>
                        +{entry.xpGained} XP
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {entry.items.filter(Boolean).map((item, i) => (
                        <li key={i} className="text-xs font-inter" style={{ color: 'rgba(226,232,240,0.55)' }}>
                          ✦ {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Affirmations Tab ──────────────────────────── */}
        {activeTab === 'affirmations' && (
          <div className="space-y-3">
            <p className="text-xs font-inter" style={{ color: 'rgba(226,232,240,0.4)' }}>
              Read aloud. Feel it. Let it land.
            </p>
            {[...MORNING_AFFIRMATIONS, ...EVENING_REFLECTIONS].map((phrase, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="p-4 rounded-xl cursor-default"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
                whileHover={{
                  background: 'rgba(252,211,77,0.06)',
                  borderColor: 'rgba(252,211,77,0.2)',
                  transition: { duration: 0.15 },
                }}
              >
                <div className="flex items-start gap-3">
                  <Sparkles size={14} className="mt-0.5 shrink-0" style={{ color: i < MORNING_AFFIRMATIONS.length ? '#FCD34D' : '#C084FC' }} />
                  <p className="text-sm font-inter leading-relaxed" style={{ color: 'rgba(226,232,240,0.75)' }}>
                    {phrase}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ─── Low Cortisol Tab ──────────────────────────── */}
        {activeTab === 'cortisol' && (
          <div className="space-y-4">
            <div
              className="p-5 rounded-2xl"
              style={{ background: 'rgba(134,239,172,0.07)', border: '1px solid rgba(134,239,172,0.18)' }}
            >
              <h3 className="font-syne font-bold text-lg mb-1" style={{ color: '#86EFAC' }}>
                The Low-Cortisol Protocol
              </h3>
              <p className="text-sm font-inter" style={{ color: 'rgba(226,232,240,0.6)' }}>
                Your goal: long attention span, low inflammation, calm dominance. These 8 practices compound over 90 days.
              </p>
            </div>

            {LOW_CORTISOL_TIPS.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-4 p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                whileHover={{ background: 'rgba(134,239,172,0.05)', borderColor: 'rgba(134,239,172,0.15)' }}
              >
                <span className="text-2xl">{tip.icon}</span>
                <p className="text-sm font-inter leading-relaxed" style={{ color: 'rgba(226,232,240,0.7)' }}>
                  {tip.tip}
                </p>
              </motion.div>
            ))}

            <div
              className="p-5 rounded-2xl"
              style={{ background: 'rgba(192,132,252,0.07)', border: '1px solid rgba(192,132,252,0.18)' }}
            >
              <p className="text-xs tracking-widest font-inter font-semibold mb-2" style={{ color: 'rgba(192,132,252,0.7)' }}>
                YOUR DAILY GOALS
              </p>
              {[
                '🧠 Attention span &gt; 90 min deep work blocks',
                '😴 7–9h consistent sleep schedule',
                '📵 No phone 1h after waking, 1h before sleep',
                '🌿 20 min of nature or walking daily',
                '📖 30 min reading (books, not feeds)',
                '🙏 Gratitude practice morning or evening',
                '💪 Move your body every single day',
                '🧊 Weekly cold exposure',
              ].map((goal, i) => (
                <p key={i} className="text-sm font-inter py-1.5 border-b last:border-0"
                  style={{ color: 'rgba(226,232,240,0.65)', borderColor: 'rgba(255,255,255,0.05)' }}
                  dangerouslySetInnerHTML={{ __html: goal }}
                />
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
