'use client';
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Check, Loader2 } from 'lucide-react';
import { useVoiceAudio } from '@/hooks/useVoiceAudio';
import { useXpFloaterStore, DOMAIN_COLORS } from '@/lib/store';
import type { TranscriptAnalysisDto, CommitResultDto } from '@/lib/api';

// ── Domain config ─────────────────────────────────────────────────────────

export type VoiceDomain =
  | 'gratitude'
  | 'habits'
  | 'finance'
  | 'career'
  | 'journal'
  | 'brand'
  | 'content';

const DOMAIN_CONFIG: Record<VoiceDomain, {
  color: string;
  prompt: string;
  icon: string;
  commitHints: Partial<{
    create_journal_entry: boolean;
  }>;
}> = {
  gratitude: {
    color: '#FCD34D',
    icon: '🙏',
    prompt: "What are you grateful for today?",
    commitHints: { create_journal_entry: true },
  },
  habits: {
    color: '#86EFAC',
    icon: '🌱',
    prompt: "Tell me about your habits today.",
    commitHints: {},
  },
  finance: {
    color: '#C9A84C',
    icon: '💰',
    prompt: "Any expenses or financial notes?",
    commitHints: {},
  },
  career: {
    color: '#9333EA',
    icon: '🚀',
    prompt: "What did you work on today? Any goals or wins?",
    commitHints: { create_journal_entry: false },
  },
  journal: {
    color: '#C084FC',
    icon: '📓',
    prompt: "Tell me about your day — anything on your mind.",
    commitHints: { create_journal_entry: true },
  },
  brand: {
    color: '#67E8F9',
    icon: '⚡',
    prompt: "Any content published, networking done, or brand moves?",
    commitHints: {},
  },
  content: {
    color: '#F0C96E',
    icon: '📱',
    prompt: "Any content ideas or posts to log?",
    commitHints: {},
  },
};

// ── Types ────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'recording' | 'thinking' | 'done' | 'error';

interface Result {
  xpEarned: number;
  summary: string;
  coaching: string;
}

// ── Component ────────────────────────────────────────────────────────────

export function PageVoiceEntry({
  domain,
  onCommit,
}: {
  domain: VoiceDomain;
  onCommit?: (result: CommitResultDto) => void;
}) {
  const cfg = DOMAIN_CONFIG[domain];
  const { triggerRewards } = useXpFloaterStore();

  const [phase, setPhase]               = useState<Phase>('idle');
  const [liveText, setLiveText]         = useState('');
  const [result, setResult]             = useState<Result | null>(null);
  const [errorMsg, setErrorMsg]         = useState('');
  const transcriptRef                   = useRef('');

  const handleTranscriptReady = useCallback(async (text: string) => {
    if (!text.trim()) return;
    transcriptRef.current = text;
    setPhase('thinking');
    setLiveText('');

    try {
      // 1. Analyze
      const aRes = await fetch('/api/proxy/claude/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: `[${domain}] ${text}` }),
      });
      if (!aRes.ok) throw new Error('analyze failed');
      const analysis: TranscriptAnalysisDto = await aRes.json();

      // 2. Commit
      const cRes = await fetch('/api/proxy/claude/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          goal_titles: analysis.goals?.map(g => g.title) ?? [],
          create_journal_entry: cfg.commitHints.create_journal_entry ?? false,
          mood: analysis.mood ?? null,
          expenses: analysis.expenses ?? [],
          content_ideas: analysis.content_ideas ?? [],
          habit_mentions: analysis.habit_mentions ?? [],
          xp_rewards: analysis.xp_rewards ?? [],
        }),
      });
      if (!cRes.ok) throw new Error('commit failed');
      const commitResult: CommitResultDto = await cRes.json();

      // 3. Fire XP floater
      const rewards = commitResult.rewards_granted.map((r, i) => ({
        id: `pve-${Date.now()}-${i}`,
        icon: r.icon,
        label: `+${r.xp} XP`,
        color: DOMAIN_COLORS[r.area] ?? cfg.color,
        x: 25 + Math.random() * 50,
      }));
      if (rewards.length) triggerRewards(rewards);

      setResult({
        xpEarned: commitResult.total_xp_earned,
        summary: analysis.topics.map(t => t.text).join(', ') || text.slice(0, 80),
        coaching: analysis.coaching_message ?? '',
      });
      setPhase('done');
      onCommit?.(commitResult);
    } catch {
      setErrorMsg('Could not save. Try again.');
      setPhase('error');
    }
  }, [domain, cfg, triggerRewards, onCommit]);

  const { bars, isListening, startListening, stopListening, recogError } = useVoiceAudio({
    onInterim: setLiveText,
    onTranscriptReady: handleTranscriptReady,
  });

  function toggleMic() {
    if (phase === 'recording') {
      stopListening();
    } else if (phase === 'idle' || phase === 'error') {
      setErrorMsg('');
      setPhase('recording');
      startListening();
    }
  }

  function reset() {
    setPhase('idle');
    setResult(null);
    setLiveText('');
    transcriptRef.current = '';
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: `${cfg.color}08`,
        border: `1px solid ${cfg.color}22`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.icon}</span>
          <span
            className="text-xs font-inter font-semibold tracking-widest uppercase"
            style={{ color: `${cfg.color}90` }}
          >
            Voice Entry
          </span>
        </div>
        {phase === 'done' && (
          <motion.button
            onClick={reset}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-inter"
            style={{ color: 'rgba(226,232,240,0.35)' }}
          >
            + New entry
          </motion.button>
        )}
      </div>

      {/* Body */}
      <AnimatePresence mode="wait">

        {/* ── IDLE ── */}
        {(phase === 'idle' || phase === 'error') && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3"
          >
            <MicButton
              color={cfg.color}
              active={false}
              disabled={false}
              onClick={toggleMic}
            />
            <p className="text-sm font-inter" style={{ color: 'rgba(226,232,240,0.5)' }}>
              {errorMsg || cfg.prompt}
            </p>
          </motion.div>
        )}

        {/* ── RECORDING ── */}
        {phase === 'recording' && (
          <motion.div
            key="recording"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-3">
              <MicButton
                color={cfg.color}
                active={true}
                disabled={false}
                onClick={toggleMic}
              />
              <div className="flex-1 min-w-0">
                {liveText ? (
                  <p className="text-sm font-inter leading-snug truncate" style={{ color: '#E2E8F0' }}>
                    {liveText}
                  </p>
                ) : (
                  <p className="text-sm font-inter" style={{ color: `${cfg.color}70` }}>
                    Listening…
                  </p>
                )}
              </div>
            </div>

            {/* Mini waveform */}
            <div className="flex items-end gap-0.5 h-6 px-1">
              {bars.slice(0, 32).map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-full"
                  style={{ background: cfg.color, opacity: 0.5 + (h / 60) * 0.5 }}
                  animate={{ height: Math.max(2, (h / 60) * 24) }}
                  transition={{ duration: 0.05 }}
                />
              ))}
            </div>

            <motion.button
              onClick={toggleMic}
              className="w-full py-2 rounded-xl text-xs font-inter font-semibold"
              style={{
                background: liveText ? `${cfg.color}15` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${liveText ? cfg.color + '50' : 'rgba(255,255,255,0.08)'}`,
                color: liveText ? cfg.color : 'rgba(226,232,240,0.35)',
              }}
              whileTap={{ scale: 0.97 }}
            >
              {liveText ? '↑ Save entry' : 'Tap to stop'}
            </motion.button>
          </motion.div>
        )}

        {/* ── THINKING ── */}
        {phase === 'thinking' && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 py-1"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 size={18} style={{ color: cfg.color }} />
            </motion.div>
            <p className="text-sm font-inter" style={{ color: `${cfg.color}80` }}>
              Analyzing and saving…
            </p>
          </motion.div>
        )}

        {/* ── DONE ── */}
        {phase === 'done' && result && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}50` }}
              >
                <Check size={12} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-inter truncate" style={{ color: 'rgba(226,232,240,0.65)' }}>
                  {result.summary}
                </p>
              </div>
              {result.xpEarned > 0 && (
                <span
                  className="text-xs font-syne font-black flex-shrink-0"
                  style={{ color: cfg.color }}
                >
                  +{result.xpEarned} XP
                </span>
              )}
            </div>
            {result.coaching && (
              <p
                className="text-xs font-inter italic leading-relaxed"
                style={{ color: 'rgba(226,232,240,0.4)' }}
              >
                {result.coaching}
              </p>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {recogError && recogError !== 'no-speech' && (
        <p className="text-xs font-inter" style={{ color: '#FCA5A5' }}>
          Mic error: {recogError}
        </p>
      )}
    </div>
  );
}

// ── Mic button ────────────────────────────────────────────────────────────

function MicButton({ color, active, disabled, onClick }: {
  color: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        background: active ? `${color}20` : 'rgba(255,255,255,0.05)',
        border: `1.5px solid ${active ? color + '60' : 'rgba(255,255,255,0.1)'}`,
      }}
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.91 }}
    >
      {active ? (
        <motion.span
          className="block w-3 h-3 rounded-sm"
          style={{ background: color }}
          animate={{ opacity: [1, 0.3, 1], scale: [1, 1.15, 1] }}
          transition={{ duration: 0.7, repeat: Infinity }}
        />
      ) : (
        <Mic size={16} style={{ color: `${color}90` }} strokeWidth={1.8} />
      )}
    </motion.button>
  );
}
