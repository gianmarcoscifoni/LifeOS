'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Zap } from 'lucide-react';
import type { TranscriptAnalysisDto, CommitResultDto } from '@/lib/api';

interface TranscriptRevealProps {
  transcript: string;
  analysis: TranscriptAnalysisDto;
  onClose: () => void;
  onCommit: (result: CommitResultDto) => void;
}

const AREA_COLOR: Record<string, string> = {
  career:        '#9333EA',
  habits:        '#86EFAC',
  finance:       '#C9A84C',
  health:        '#F0C96E',
  brand:         '#C084FC',
  relationships: '#67E8F9',
};

function areaColor(area: string) {
  return AREA_COLOR[area] ?? '#94A3B8';
}

export function TranscriptReveal({ transcript, analysis, onClose, onCommit }: TranscriptRevealProps) {
  const words = transcript.split(/\s+/).filter(Boolean);
  const keywordSet = new Set(analysis.keywords.map(k => k.toLowerCase()));

  const [typedCoaching, setTypedCoaching]   = useState('');
  const [committing, setCommitting]         = useState(false);
  const [committed, setCommitted]           = useState(false);
  const [commitError, setCommitError]       = useState('');

  // Timing anchors (ms)
  const wordsDuration  = Math.min(words.length * 80, 2000);
  const topicsDuration = analysis.topics.length * 120;
  const goalsDuration  = analysis.goals.length * 120;
  const coachingDelay  = wordsDuration + topicsDuration + goalsDuration + 400;

  const totalPreviewXp = (analysis.xp_rewards ?? []).reduce((s, r) => s + r.xp, 0) + 25;

  useEffect(() => {
    const timer = setTimeout(() => {
      let i = 0;
      const msg = analysis.coaching_message ?? '';
      const iv = setInterval(() => {
        i++;
        setTypedCoaching(msg.slice(0, i));
        if (i >= msg.length) clearInterval(iv);
      }, 28);
      return () => clearInterval(iv);
    }, coachingDelay);
    return () => clearTimeout(timer);
  }, [analysis.coaching_message, coachingDelay]);

  async function handleCommit() {
    setCommitting(true);
    setCommitError('');
    try {
      const res = await fetch('/api/proxy/claude/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          goal_titles: (analysis.goals ?? []).map(g => g.title),
          create_journal_entry: true,
          mood: analysis.mood ?? 'neutral',
          expenses: analysis.expenses ?? [],
          content_ideas: analysis.content_ideas ?? [],
          habit_mentions: analysis.habit_mentions ?? [],
          xp_rewards: analysis.xp_rewards ?? [],
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const result: CommitResultDto = await res.json();
      setCommitted(true);
      onCommit(result);
    } catch (e) {
      setCommitError('Errore di commit. Riprova.');
    } finally {
      setCommitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] overflow-y-auto p-6 flex flex-col"
      style={{ background: 'rgba(5,2,16,0.97)', backdropFilter: 'blur(24px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="max-w-lg w-full mx-auto space-y-8 py-6">

        {/* Close */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(226,232,240,0.5)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Animated transcript words */}
        <div className="flex flex-wrap gap-x-2 gap-y-1.5 leading-relaxed">
          {words.map((word, i) => {
            const isKeyword = keywordSet.has(word.toLowerCase().replace(/[.,!?;:]/g, ''));
            return (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.08, 1.6), duration: 0.25 }}
                className="text-base font-inter"
                style={{
                  color: isKeyword ? '#C9A84C' : 'rgba(226,232,240,0.75)',
                  filter: isKeyword ? 'drop-shadow(0 0 6px rgba(201,168,76,0.6))' : undefined,
                  fontWeight: isKeyword ? 600 : 400,
                }}
              >
                {word}
              </motion.span>
            );
          })}
        </div>

        {/* Topic cards */}
        {analysis.topics.length > 0 && (
          <div className="space-y-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: wordsDuration / 1000 }}
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'rgba(226,232,240,0.3)' }}
            >
              Aree rilevate
            </motion.p>
            <div className="flex flex-wrap gap-2">
              {analysis.topics.map((topic, i) => {
                const color = areaColor(topic.area);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: wordsDuration / 1000 + i * 0.12,
                      type: 'spring', stiffness: 200, damping: 18,
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: `${color}12`, border: `1px solid ${color}30` }}
                  >
                    <span className="text-lg leading-none">{topic.icon}</span>
                    <div>
                      <p className="text-xs font-semibold" style={{ color }}>{topic.text}</p>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: `${color}80` }}>
                        {topic.area}
                      </p>
                    </div>
                    <div
                      className="ml-1 h-1 rounded-full"
                      style={{ width: `${Math.round(topic.confidence * 32)}px`, background: `${color}50` }}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Goal cards */}
        {analysis.goals.length > 0 && (
          <div className="space-y-2">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: (wordsDuration + topicsDuration) / 1000 }}
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: 'rgba(226,232,240,0.3)' }}
            >
              Obiettivi rilevati
            </motion.p>
            <div className="space-y-2">
              {analysis.goals.map((goal, i) => {
                const color = areaColor(goal.area);
                const priorityOpacity = goal.priority === 'high' ? 1 : goal.priority === 'medium' ? 0.7 : 0.5;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: (wordsDuration + topicsDuration) / 1000 + i * 0.12,
                      type: 'spring', stiffness: 180, damping: 20,
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: `${color}08`, border: `1px solid ${color}20` }}
                  >
                    <Target size={14} style={{ color, opacity: priorityOpacity }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'rgba(226,232,240,0.85)' }}>
                        {goal.title}
                      </p>
                      {goal.due_hint && goal.due_hint !== 'null' && (
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(226,232,240,0.35)' }}>
                          {goal.due_hint}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0"
                      style={{ background: `${color}15`, color, opacity: priorityOpacity }}
                    >
                      {goal.priority}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Coaching message — typewriter */}
        <AnimatePresence>
          {typedCoaching && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 py-4 rounded-2xl"
              style={{ background: 'rgba(147,51,234,0.08)', border: '1px solid rgba(147,51,234,0.2)' }}
            >
              <p className="text-xs font-semibold tracking-widest uppercase mb-2"
                style={{ color: 'rgba(192,132,252,0.6)' }}>
                Voice Coach
              </p>
              <p className="text-sm font-inter leading-relaxed" style={{ color: 'rgba(226,232,240,0.8)' }}>
                {typedCoaching}
                <span className="animate-pulse" style={{ color: '#9333EA' }}>|</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* XP Preview */}
        <AnimatePresence>
          {(analysis.xp_rewards?.length > 0 || true) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: coachingDelay / 1000 + 0.5 }}
              className="px-4 py-4 rounded-2xl space-y-2"
              style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Zap size={14} style={{ color: '#C9A84C' }} />
                  <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(201,168,76,0.7)' }}>
                    XP Incoming
                  </span>
                </div>
                <span className="font-syne font-black text-lg" style={{ color: '#C9A84C', textShadow: '0 0 16px rgba(201,168,76,0.5)' }}>
                  +{totalPreviewXp}
                </span>
              </div>
              {(analysis.xp_rewards ?? []).map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-inter"
                  style={{ color: 'rgba(226,232,240,0.55)' }}>
                  <span>{r.icon} {r.action}</span>
                  <span style={{ color: '#C9A84C' }}>+{r.xp}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs font-inter"
                style={{ color: 'rgba(226,232,240,0.55)' }}>
                <span>🎙️ Voice Check-in</span>
                <span style={{ color: '#C9A84C' }}>+25</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COMMIT button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: coachingDelay / 1000 + 0.8 }}
        >
          {commitError && (
            <p className="text-xs text-center mb-2" style={{ color: '#F87171' }}>{commitError}</p>
          )}
          <motion.button
            onClick={committed ? undefined : handleCommit}
            disabled={committing || committed}
            className="w-full py-4 rounded-2xl font-syne font-black text-base tracking-widest uppercase"
            style={{
              background: committed
                ? 'linear-gradient(135deg, #166534, #16A34A)'
                : 'linear-gradient(135deg, #3B0D7A, #9333EA, #C9A84C)',
              boxShadow: committed
                ? '0 0 30px rgba(22,163,74,0.4)'
                : '0 0 40px rgba(147,51,234,0.5)',
              color: '#fff',
              cursor: committed ? 'default' : 'pointer',
            }}
            whileHover={!committed ? { scale: 1.02, boxShadow: '0 0 60px rgba(147,51,234,0.8)' } : {}}
            whileTap={!committed ? { scale: 0.97 } : {}}
            animate={committing ? { opacity: [1, 0.6, 1] } : {}}
            transition={committing ? { duration: 0.6, repeat: Infinity } : { duration: 0.15 }}
          >
            {committed
              ? '✓ Committed to Reality'
              : committing
              ? 'Committing…'
              : '⚡ Commit to Reality'}
          </motion.button>

          {!committed && (
            <p className="text-xs text-center mt-2" style={{ color: 'rgba(226,232,240,0.25)' }}>
              Salva goals, journal, habit log e XP nel database
            </p>
          )}
        </motion.div>

        <div className="h-6" />
      </div>
    </motion.div>
  );
}
