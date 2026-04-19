'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, RefreshCw, Sparkles, Loader2, Check } from 'lucide-react';
import {
  MORNING_AFFIRMATIONS,
  EVENING_REFLECTIONS,
  LOW_CORTISOL_TIPS,
} from '@/lib/gratitude';
import { useVoiceAudio } from '@/hooks/useVoiceAudio';
import { useXpFloaterStore, DOMAIN_COLORS } from '@/lib/store';
import type { TranscriptAnalysisDto, CommitResultDto } from '@/lib/api';

// ── Constants ─────────────────────────────────────────────────────────────

const COLOR   = '#FCD34D';
const MAX_DAY = 3;

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Types ─────────────────────────────────────────────────────────────────

interface GratitudeEntry {
  id: string;
  content: string;
  mood: string | null;
  createdAt: string;
  entryDate: string;
}

type RecordPhase = 'idle' | 'recording' | 'thinking' | 'done';

// ── Single voice recorder card ────────────────────────────────────────────

function VoiceRecorder({
  slotIndex,
  onSaved,
}: {
  slotIndex: number;
  onSaved: (entry: GratitudeEntry) => void;
}) {
  const { triggerRewards } = useXpFloaterStore();
  const [phase, setPhase]       = useState<RecordPhase>('idle');
  const [liveText, setLiveText] = useState('');
  const [xpEarned, setXpEarned] = useState(0);
  const transcriptRef           = useRef('');

  const handleTranscriptReady = useCallback(async (text: string) => {
    if (!text.trim()) { setPhase('idle'); return; }
    transcriptRef.current = text;
    setLiveText('');
    setPhase('thinking');

    try {
      // 1. Analyze for mood + XP
      const [aRes, jRes] = await Promise.all([
        fetch('/api/proxy/claude/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: `[gratitude] ${text}` }),
        }),
        // 2. Save directly to journal DB
        fetch('/api/proxy/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: text,
            source: 'voice',
            tags: ['gratitude', 'voice'],
            entryDate: todayStr(),
          }),
        }),
      ]);

      let mood: string | null = null;
      let xp = 25; // base gratitude XP

      if (aRes.ok) {
        const analysis: TranscriptAnalysisDto = await aRes.json();
        mood = analysis.mood ?? null;
        // Grant XP via brand endpoint
        fetch('/api/proxy/brand/xp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'Gratitude voice entry', note: text }),
        })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            const gained = data?.xpGained ?? xp;
            setXpEarned(gained);
            triggerRewards([{
              id: `grat-${Date.now()}`,
              icon: '🙏',
              label: `+${gained} XP`,
              color: COLOR,
              x: 30 + Math.random() * 40,
            }]);
          })
          .catch(() => {});
      }

      let savedEntry: GratitudeEntry = {
        id: Date.now().toString(),
        content: text,
        mood,
        createdAt: new Date().toISOString(),
        entryDate: todayStr(),
      };

      if (jRes.ok) {
        const data = await jRes.json();
        savedEntry = {
          id: data.id ?? savedEntry.id,
          content: data.content ?? text,
          mood: data.mood ?? mood,
          createdAt: data.createdAt ?? savedEntry.createdAt,
          entryDate: data.entryDate ?? todayStr(),
        };
      }

      setPhase('done');
      onSaved(savedEntry);
    } catch {
      setPhase('idle');
    }
  }, [triggerRewards, onSaved]);

  const { bars, isListening, startListening, stopListening } = useVoiceAudio({
    onInterim: setLiveText,
    onTranscriptReady: handleTranscriptReady,
  });

  function toggle() {
    if (phase !== 'idle' && phase !== 'recording') return;
    if (isListening) {
      stopListening();
    } else {
      setPhase('recording');
      startListening();
    }
  }

  const prompts = [
    "What made you smile today?",
    "Who or what are you thankful for?",
    "What's one thing going right in your life?",
  ];

  if (phase === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{ background: `${COLOR}10`, border: `1px solid ${COLOR}30` }}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${COLOR}20`, border: `1px solid ${COLOR}50` }}>
          <Check size={14} style={{ color: COLOR }} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-inter font-semibold" style={{ color: COLOR }}>
            Saved {xpEarned > 0 ? `· +${xpEarned} XP` : ''}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden"
      style={{
        background: phase === 'recording' ? `${COLOR}0D` : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${phase === 'recording' ? COLOR + '50' : 'rgba(255,255,255,0.08)'}`,
        transition: 'border-color 0.3s, background 0.3s',
      }}
    >
      <button
        onClick={toggle}
        disabled={phase === 'thinking'}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        {/* Mic / stop / spinner */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: phase === 'recording' ? `${COLOR}20` : 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${phase === 'recording' ? COLOR + '60' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          {phase === 'thinking' ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={18} style={{ color: COLOR }} />
            </motion.div>
          ) : phase === 'recording' ? (
            <motion.span
              className="block w-3.5 h-3.5 rounded-sm"
              style={{ background: COLOR }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
            />
          ) : (
            <Mic size={17} style={{ color: `${COLOR}80` }} strokeWidth={1.8} />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {phase === 'recording' && liveText ? (
            <p className="text-sm font-inter leading-snug" style={{ color: '#E2E8F0' }}>
              {liveText}
            </p>
          ) : phase === 'recording' ? (
            <p className="text-sm font-inter" style={{ color: `${COLOR}70` }}>Listening…</p>
          ) : phase === 'thinking' ? (
            <p className="text-sm font-inter" style={{ color: `${COLOR}70` }}>Saving to your journal…</p>
          ) : (
            <>
              <p className="text-xs font-inter font-semibold mb-0.5" style={{ color: `${COLOR}70` }}>
                Gratitude {slotIndex + 1}
              </p>
              <p className="text-sm font-inter" style={{ color: 'rgba(226,232,240,0.45)' }}>
                {prompts[slotIndex] ?? "What are you grateful for?"}
              </p>
            </>
          )}
        </div>
      </button>

      {/* Waveform */}
      <AnimatePresence>
        {phase === 'recording' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 28, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-end gap-0.5 px-5 pb-3 overflow-hidden"
          >
            {bars.slice(0, 40).map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-full"
                style={{ background: COLOR, opacity: 0.4 + (h / 60) * 0.6 }}
                animate={{ height: Math.max(2, (h / 60) * 24) }}
                transition={{ duration: 0.05 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Past entry card ───────────────────────────────────────────────────────

function EntryCard({ entry }: { entry: GratitudeEntry }) {
  const date = new Date(entry.entryDate + 'T00:00:00');
  return (
    <div
      className="px-4 py-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-inter tracking-widest uppercase" style={{ color: 'rgba(226,232,240,0.3)' }}>
          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        {entry.mood && (
          <span className="text-[10px] font-inter" style={{ color: `${COLOR}60` }}>{entry.mood}</span>
        )}
      </div>
      <p className="text-sm font-inter leading-relaxed" style={{ color: 'rgba(226,232,240,0.6)' }}>
        ✦ {entry.content}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function GratitudePage() {
  const hour       = new Date().getHours();
  const isEvening  = hour >= 17;

  const [affirmation, setAffirmation] = useState('');
  const [tipIndex, setTipIndex]       = useState(0);
  const [activeTab, setActiveTab]     = useState<'cortisol' | 'affirmations'>('affirmations');

  // Today's audio entries (max 3) — loaded from DB
  const [todayEntries, setTodayEntries]  = useState<GratitudeEntry[]>([]);
  const [pastEntries, setPastEntries]    = useState<GratitudeEntry[]>([]);
  const [loading, setLoading]            = useState(true);

  const refreshAffirmation = useCallback(() => {
    setAffirmation(pickRandom(isEvening ? EVENING_REFLECTIONS : MORNING_AFFIRMATIONS));
  }, [isEvening]);

  // Load journal entries tagged "gratitude" from backend
  useEffect(() => {
    refreshAffirmation();
    const t = setInterval(() => setTipIndex(i => (i + 1) % LOW_CORTISOL_TIPS.length), 8000);

    fetch('/api/proxy/journal?limit=100')
      .then(r => r.ok ? r.json() : [])
      .then((entries: GratitudeEntry[]) => {
        const grat = entries.filter((e: GratitudeEntry & { tags?: string[] }) =>
          (e as GratitudeEntry & { tags?: string[] }).tags?.includes('gratitude')
        );
        const today = todayStr();
        setTodayEntries(grat.filter(e => e.entryDate === today).slice(0, MAX_DAY));
        setPastEntries(grat.filter(e => e.entryDate !== today).slice(0, 20));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => clearInterval(t);
  }, [refreshAffirmation]);

  function handleSaved(entry: GratitudeEntry) {
    setTodayEntries(prev => [...prev, entry].slice(0, MAX_DAY));
  }

  const slotsLeft  = MAX_DAY - todayEntries.length;
  const complete   = slotsLeft === 0;

  // Group past entries by date
  const pastByDate = pastEntries.reduce<Record<string, GratitudeEntry[]>>((acc, e) => {
    (acc[e.entryDate] ??= []).push(e);
    return acc;
  }, {});
  const pastDates = Object.keys(pastByDate).sort((a, b) => b.localeCompare(a)).slice(0, 7);

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between">
          <div>
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
              {isEvening ? 'Evening reflection' : 'Morning practice'} ·{' '}
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Daily count badge */}
          <motion.div
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl mt-1"
            style={{
              background: complete ? `${COLOR}18` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${complete ? COLOR + '50' : 'rgba(255,255,255,0.08)'}`,
            }}
            animate={complete ? { scale: [1, 1.06, 1] } : {}}
            transition={{ duration: 0.5 }}
          >
            <span className="text-base leading-none">{complete ? '🙏' : '🎙️'}</span>
            <span
              className="text-sm font-syne font-black"
              style={{ color: complete ? COLOR : 'rgba(226,232,240,0.5)' }}
            >
              {todayEntries.length} / {MAX_DAY}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Cortisol tip rotator */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tipIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{ background: 'rgba(134,239,172,0.06)', border: '1px solid rgba(134,239,172,0.15)' }}
        >
          <span className="text-lg">{LOW_CORTISOL_TIPS[tipIndex].icon}</span>
          <p className="text-xs font-inter" style={{ color: 'rgba(226,232,240,0.55)' }}>
            {LOW_CORTISOL_TIPS[tipIndex].tip}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* ── Today's voice entries ── */}
      <div className="space-y-3">
        <p className="text-xs font-inter font-semibold tracking-widest uppercase"
          style={{ color: 'rgba(226,232,240,0.3)' }}>
          Today&apos;s Gratitude
        </p>

        {loading ? (
          <div className="flex justify-center py-6">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={20} style={{ color: `${COLOR}50` }} />
            </motion.div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Slots already recorded today */}
            {todayEntries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="px-4 py-3.5 rounded-2xl"
                style={{ background: `${COLOR}0A`, border: `1px solid ${COLOR}25` }}
              >
                <p className="text-xs font-inter font-semibold mb-1" style={{ color: `${COLOR}70` }}>
                  Gratitude {i + 1}
                </p>
                <p className="text-sm font-inter leading-relaxed" style={{ color: '#E2E8F0' }}>
                  {entry.content}
                </p>
              </motion.div>
            ))}

            {/* Open recorder slots */}
            {!complete && Array.from({ length: slotsLeft }).map((_, i) => (
              <VoiceRecorder
                key={`slot-${todayEntries.length + i}`}
                slotIndex={todayEntries.length + i}
                onSaved={handleSaved}
              />
            ))}

            {/* All done state */}
            {complete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2 py-6 rounded-2xl"
                style={{ background: `${COLOR}08`, border: `1px solid ${COLOR}25` }}
              >
                <span className="text-3xl">🌟</span>
                <p className="font-syne font-black text-sm" style={{ color: COLOR }}>
                  Gratitude practice complete
                </p>
                <p className="text-xs font-inter" style={{ color: 'rgba(226,232,240,0.35)' }}>
                  Come back tomorrow for 3 more
                </p>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* ── Affirmation card ── */}
      <div
        className="relative p-5 rounded-2xl cursor-pointer group"
        style={{ background: 'rgba(252,211,77,0.06)', border: '1px solid rgba(252,211,77,0.16)' }}
        onClick={refreshAffirmation}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-syne font-bold italic leading-relaxed" style={{ color: '#FCD34D' }}>
            &ldquo;{affirmation}&rdquo;
          </p>
          <RefreshCw
            size={13}
            className="shrink-0 mt-1 opacity-35 group-hover:opacity-70 transition-opacity"
            style={{ color: '#FCD34D' }}
          />
        </div>
      </div>

      {/* ── Tabs: Affirmations | Low Cortisol ── */}
      <div>
        <div
          className="flex gap-1 p-1 rounded-2xl mb-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {([
            { id: 'affirmations' as const, label: 'Affirmations', icon: '💛' },
            { id: 'cortisol'     as const, label: 'Low Cortisol', icon: '🌿' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-inter font-semibold rounded-xl"
              style={{ color: activeTab === tab.id ? '#E2E8F0' : 'rgba(226,232,240,0.4)' }}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="gratTab"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'rgba(252,211,77,0.08)', border: '1px solid rgba(252,211,77,0.18)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                />
              )}
              <span className="relative z-10">{tab.icon} {tab.label}</span>
            </button>
          ))}
        </div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          {activeTab === 'affirmations' && (
            <div className="space-y-2">
              <p className="text-xs font-inter" style={{ color: 'rgba(226,232,240,0.35)' }}>
                Read aloud. Feel it. Let it land.
              </p>
              {[...MORNING_AFFIRMATIONS, ...EVENING_REFLECTIONS].map((phrase, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-start gap-3 p-3.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <Sparkles size={13} className="mt-0.5 shrink-0"
                    style={{ color: i < MORNING_AFFIRMATIONS.length ? '#FCD34D' : '#C084FC' }} />
                  <p className="text-sm font-inter leading-relaxed" style={{ color: 'rgba(226,232,240,0.7)' }}>
                    {phrase}
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'cortisol' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl" style={{ background: 'rgba(134,239,172,0.06)', border: '1px solid rgba(134,239,172,0.16)' }}>
                <h3 className="font-syne font-bold text-base mb-1" style={{ color: '#86EFAC' }}>
                  The Low-Cortisol Protocol
                </h3>
                <p className="text-xs font-inter" style={{ color: 'rgba(226,232,240,0.5)' }}>
                  Long attention, low inflammation, calm dominance. 90-day compound.
                </p>
              </div>
              {LOW_CORTISOL_TIPS.map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3 p-3.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="text-xl leading-none">{tip.icon}</span>
                  <p className="text-sm font-inter leading-relaxed" style={{ color: 'rgba(226,232,240,0.65)' }}>
                    {tip.tip}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Past entries (by day) ── */}
      {pastDates.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-inter font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(226,232,240,0.28)' }}>
            Past Entries
          </p>
          {pastDates.map(date => (
            <div key={date} className="space-y-2">
              <p className="text-[10px] font-inter tracking-widest uppercase"
                style={{ color: 'rgba(226,232,240,0.25)' }}>
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
              {pastByDate[date].map(entry => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
