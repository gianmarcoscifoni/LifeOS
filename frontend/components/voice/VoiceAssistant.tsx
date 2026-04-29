'use client';
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import {
  useVoiceAssistantStore, useHabitStore, useXpFloaterStore,
  DOMAIN_COLORS, type DialogueTurn, type ConfirmItem,
} from '@/lib/store';
import { useVoiceAudio } from '@/hooks/useVoiceAudio';
import { parseVoiceCommand } from '@/lib/voiceCommandParser';
import {
  getScript, getScriptSteps, advanceScript, shouldTriggerProactive,
  buildCommitPayload, type DialogueContext,
} from '@/lib/voiceDialogue';
import { readSseStream } from '@/lib/sseStream';
import { saveVoiceSession, updateAreaStreaks } from '@/lib/voiceSession';
import type { TranscriptAnalysisDto, CommitResultDto } from '@/lib/api';
import { LevelUpBanner } from './LevelUpBanner';

// ── Strip markdown for TTS ────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '').replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1').replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1').replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '').replace(/^>\s+/gm, '').replace(/---+/g, '').trim();
}

// ── Markdown renderer ─────────────────────────────────────────────────────

function VoiceMsg({ content }: { content: string }) {
  return (
    <ReactMarkdown components={{
      p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
      strong: ({ children }) => <strong className="font-bold" style={{ color: '#C084FC' }}>{children}</strong>,
      li: ({ children }) => (
        <li className="flex items-start gap-1.5">
          <span style={{ color: '#9333EA', marginTop: 1, flexShrink: 0 }}>▸</span>
          <span>{children}</span>
        </li>
      ),
      ul: ({ children }) => <ul className="mt-1 mb-1.5 space-y-0.5">{children}</ul>,
    }}>{content}</ReactMarkdown>
  );
}

// ── Ambient particles ─────────────────────────────────────────────────────

function AmbientParticles({ color }: { color: string }) {
  const [particles, setParticles] = useState<Array<{
    id: number; x: number; y: number; size: number; delay: number; duration: number; drift: number;
  }>>([]);
  useEffect(() => {
    setParticles(Array.from({ length: 14 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: 1.5 + Math.random() * 2, delay: Math.random() * 5,
      duration: 4 + Math.random() * 4, drift: (Math.random() - 0.5) * 24,
    })));
  }, []);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div key={p.id} className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: color }}
          animate={{ y: [0, p.drift], opacity: [0.06, 0.22, 0.06] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ── Burst particles ───────────────────────────────────────────────────────

function BurstParticles({ color, onDone }: { color: string; onDone: () => void }) {
  const [particles] = useState(() =>
    Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * Math.PI * 2;
      const dist  = 70 + Math.random() * 50;
      return { id: i, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
    })
  );
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {particles.map(p => (
        <motion.div key={p.id} className="absolute w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: [0, 1.5, 0], opacity: [1, 1, 0] }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          onAnimationComplete={p.id === 0 ? onDone : undefined}
        />
      ))}
    </div>
  );
}

// ── Typing dots ───────────────────────────────────────────────────────────

function TypingDots({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: color }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 0.9, delay: i * 0.18, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

// ── Mic SVG ───────────────────────────────────────────────────────────────

function MicSVG({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="8" y="1" width="8" height="13" rx="4" fill={color} fillOpacity={0.9} />
      <path d="M5 10v3a7 7 0 0 0 14 0v-3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="20" x2="12" y2="23" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9" y1="23" x2="15" y2="23" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ── Central orb with radial waveform + countdown ring ─────────────────────

const ORB_SIZE  = 110;
const RING_R    = 68;
const RING_CIRC = 2 * Math.PI * RING_R;
const SVG_W     = ORB_SIZE + 60; // leave room for ring + waveform bars
const SVG_CX    = SVG_W / 2;

function CentralOrb({
  phase, stateColor, bars, isListening, silenceProgress, isActive, onToggle,
}: {
  phase: string; stateColor: string; bars: number[]; isListening: boolean;
  silenceProgress: number; isActive: boolean; onToggle: () => void;
}) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: SVG_W, height: SVG_W }}>
      {/* Radial waveform bars — outside the orb */}
      {isActive && bars.map((h, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 2.5,
            borderRadius: 2,
            background: stateColor,
            bottom: '50%',
            left: '50%',
            transformOrigin: 'bottom center',
            transform: `translateX(-50%) rotate(${(i / bars.length) * 360}deg) translateY(-${ORB_SIZE / 2 + 2}px)`,
            opacity: 0.15 + (h / 60) * 0.85,
          }}
          animate={{ height: isActive ? Math.max(3, h * 0.6) : 3 }}
          transition={{ duration: 0.05 }}
        />
      ))}

      {/* Countdown SVG ring */}
      <svg
        width={SVG_W} height={SVG_W}
        className="absolute inset-0 pointer-events-none"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track ring */}
        <circle cx={SVG_CX} cy={SVG_CX} r={RING_R}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={2} />
        {/* Progress arc */}
        {silenceProgress > 0.02 && (
          <motion.circle
            cx={SVG_CX} cy={SVG_CX} r={RING_R}
            fill="none" stroke="#C9A84C" strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={RING_CIRC * (1 - silenceProgress)}
            initial={false}
            animate={{ strokeDashoffset: RING_CIRC * (1 - silenceProgress) }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        )}
      </svg>

      {/* Ripple rings */}
      {isActive && [0, 1].map(idx => (
        <motion.div key={idx} className="absolute rounded-full pointer-events-none"
          style={{ width: ORB_SIZE, height: ORB_SIZE, border: `1px solid ${stateColor}` }}
          animate={{ scale: [1, 1.55 + idx * 0.35], opacity: [0.45, 0] }}
          transition={{ duration: 1.8, delay: idx * 0.65, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}

      {/* Orb button */}
      <motion.button
        onClick={onToggle}
        style={{
          width: ORB_SIZE, height: ORB_SIZE,
          borderRadius: '50%',
          position: 'relative', zIndex: 1,
          background: `radial-gradient(circle at 38% 32%, ${stateColor}28 0%, rgba(8,3,20,0.92) 70%)`,
          border: `1.5px solid ${stateColor}55`,
          boxShadow: `0 0 ${isActive ? 60 : 30}px ${stateColor}${isActive ? '50' : '25'}, inset 0 0 24px ${stateColor}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        animate={isActive ? {
          boxShadow: [
            `0 0 40px ${stateColor}40, inset 0 0 20px ${stateColor}10`,
            `0 0 80px ${stateColor}70, inset 0 0 36px ${stateColor}20`,
            `0 0 40px ${stateColor}40, inset 0 0 20px ${stateColor}10`,
          ],
        } : {}}
        transition={{ duration: 1.6, repeat: Infinity }}
        whileTap={{ scale: 0.91 }}
        title={isListening ? 'Stop' : 'Start speaking'}
      >
        {phase === 'thinking' ? (
          <TypingDots color={stateColor} />
        ) : isListening ? (
          <motion.div className="flex flex-col items-center gap-1">
            {/* Animated stop icon with breathing mic outline */}
            <motion.div
              style={{
                width: 18, height: 18, borderRadius: 4,
                background: '#EF4444',
                boxShadow: '0 0 20px rgba(239,68,68,0.8)',
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 0.65, repeat: Infinity }}
            />
          </motion.div>
        ) : phase === 'speaking' ? (
          /* Sound wave icon when Claude speaks */
          <motion.div className="flex items-end gap-[3px]" style={{ height: 28 }}>
            {[4, 10, 16, 10, 6, 14, 8].map((h, i) => (
              <motion.div key={i} className="rounded-full" style={{ width: 3, background: stateColor }}
                animate={{ height: [h, h * 1.8, h] }}
                transition={{ duration: 0.7 + i * 0.08, repeat: Infinity, delay: i * 0.07, ease: 'easeInOut' }}
              />
            ))}
          </motion.div>
        ) : (
          <MicSVG color={stateColor} size={36} />
        )}
      </motion.button>

      {/* Silence countdown label */}
      <AnimatePresence>
        {silenceProgress > 0.05 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute font-inter font-bold text-[11px]"
            style={{
              bottom: '14%',
              color: '#C9A84C',
              textShadow: '0 0 12px rgba(201,168,76,0.6)',
              letterSpacing: '0.06em',
            }}
          >
            sending in {Math.ceil((1 - silenceProgress) * 5)}s
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Confirm item row ──────────────────────────────────────────────────────

function ConfirmRow({ item }: { item: ConfirmItem }) {
  const colors = { ok: '#86EFAC', warn: '#FCD34D', skip: 'rgba(226,232,240,0.3)' };
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-base">{item.icon}</span>
      <span className="flex-1 text-sm font-inter" style={{ color: '#E2E8F0' }}>{item.label}</span>
      <span className="text-xs font-inter" style={{ color: colors[item.status] }}>{item.value}</span>
    </div>
  );
}

// ── Compact input bar ─────────────────────────────────────────────────────

function InputBar({
  isListening, liveTranscript, disabled, stateColor, onMicToggle, onSend,
}: {
  isListening: boolean; liveTranscript: string; disabled: boolean;
  stateColor: string; onMicToggle: () => void; onSend: (text: string) => void;
}) {
  const [value, setValue] = useState('');

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    setValue('');
    onSend(text);
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${isListening ? stateColor + '35' : 'rgba(255,255,255,0.08)'}`,
        transition: 'border-color 0.3s',
      }}
    >
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        placeholder={
          isListening && liveTranscript
            ? liveTranscript.slice(0, 44) + (liveTranscript.length > 44 ? '…' : '')
            : isListening
            ? 'Listening…'
            : 'Or type a message…'
        }
        disabled={disabled}
        className="flex-1 bg-transparent outline-none text-xs font-inter py-1.5 min-w-0"
        style={{ color: isListening && liveTranscript ? 'rgba(226,232,240,0.5)' : '#E2E8F0', caretColor: stateColor }}
      />
      <AnimatePresence>
        {value.trim() && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            onClick={submit}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, #3B0D7A, ${stateColor})` }}
            whileTap={{ scale: 0.91 }}
          >
            <Send size={13} color="#fff" strokeWidth={2} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── History type ──────────────────────────────────────────────────────────

interface HistMsg { role: 'user' | 'assistant'; content: string }

// ── Phase maps ────────────────────────────────────────────────────────────

const PHASE_COLORS = {
  idle:       '#9333EA',
  listening:  '#C9A84C',
  thinking:   '#C084FC',
  speaking:   '#86EFAC',
  proactive:  '#67E8F9',
  confirming: '#F0C96E',
};

const PHASE_LABELS = {
  idle:       'Ready',
  listening:  'Listening…',
  thinking:   'Thinking…',
  speaking:   'Speaking…',
  proactive:  'Listening…',
  confirming: 'Confirm?',
};

// ── Main component ────────────────────────────────────────────────────────

export function VoiceAssistant() {
  const router = useRouter();
  const {
    isOpen, phase, activeDomain, turns, activeScript, liveTranscript, particleBurst,
    pendingNavigation, closeVoice, setPhase, setActiveDomain, addTurn, clearTurns,
    setLiveTranscript, setActiveScript, triggerParticleBurst, clearParticleBurst,
    setPendingNavigation, interactionCount, incrementInteractionCount,
  } = useVoiceAssistantStore();

  const { habits }         = useHabitStore();
  const { triggerRewards } = useXpFloaterStore();

  const [commitResult, setCommitResult] = useState<CommitResultDto | null>(null);
  const [showLevelUp,  setShowLevelUp]  = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [confirmItems, setConfirmItems] = useState<ConfirmItem[]>([]);
  const [navToast,     setNavToast]     = useState<{ label: string; icon: string } | null>(null);
  const [xpMilestone,  setXpMilestone]  = useState(false);

  const historyRef     = useRef<HistMsg[]>([]);
  const handleSendRef  = useRef<(text: string) => void>(() => {});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef   = useRef(interactionCount);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, liveTranscript]);

  // ── Build dialogue context ─────────────────────────────────────────────

  const buildCtx = useCallback((): DialogueContext => ({
    hour:       new Date().getHours(),
    dayOfWeek:  new Date().getDay(),
    userName:   'Gianmarco',
    habitNames: habits.filter(h => h.active).map(h => h.name),
  }), [habits]);

  // ── Voice audio hook ───────────────────────────────────────────────────

  const {
    bars, supported, recogError, isListening, silenceProgress, audioLevel,
    startListening, stopListening, stopAll, speak, cancelSpeech,
    startAmbientMonitor, stopAmbientMonitor,
  } = useVoiceAudio({
    onInterim: setLiveTranscript,
    onTranscriptReady: useCallback((text: string) => {
      handleSendRef.current(text);
    }, []),
  });

  // ── Speak → auto listen ────────────────────────────────────────────────

  const speakThenListen = useCallback((text: string) => {
    setPhase('speaking');
    speak(stripMarkdown(text), () => {
      setPhase('listening');
      startListening();
    });
  }, [speak, setPhase, startListening]);

  // ── VAD: ambient mic monitor during speaking, interrupt if user talks ──

  useEffect(() => {
    if (phase === 'speaking') {
      startAmbientMonitor();
    } else {
      stopAmbientMonitor();
    }
  }, [phase, startAmbientMonitor, stopAmbientMonitor]);

  useEffect(() => {
    if (phase !== 'speaking') return;
    if (audioLevel > 0.22) {
      cancelSpeech();
      stopAmbientMonitor();
      setPhase('listening');
      startListening();
    }
  }, [phase, audioLevel, cancelSpeech, stopAmbientMonitor, setPhase, startListening]);

  // ── XP milestone every 10 interactions ────────────────────────────────

  useEffect(() => {
    if (interactionCount > 0 && interactionCount % 10 === 0 && interactionCount !== prevCountRef.current) {
      prevCountRef.current = interactionCount;
      setXpMilestone(true);
      triggerRewards([{
        id: `interaction-${interactionCount}`,
        icon: '💬',
        label: `+50 XP`,
        color: '#9333EA',
        x: 50,
        domain: 'general',
        isTaskDone: false,
        xpBase: 50,
        action: `${interactionCount} voice interactions`,
      }]);
      fetch('/api/proxy/xp/quick-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: `voice_interactions_${interactionCount}`, domain: 'general', xp_base: 50 }),
      }).catch(() => {});
      setTimeout(() => setXpMilestone(false), 2000);
    }
  }, [interactionCount, triggerRewards]);

  // ── Proactive on open ──────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    clearTurns();
    setLiveTranscript('');
    historyRef.current = [];

    const ctx    = buildCtx();
    const script = shouldTriggerProactive(ctx);
    if (script) {
      const greeting = script.greeting(ctx.userName, ctx);
      const steps    = getScriptSteps(script.id, ctx);
      setPhase('proactive');
      setActiveScript({
        id: script.id, stepIndex: 0, totalSteps: steps.length,
        currentQuestion: greeting, domain: script.domain, collectedData: {},
      });
      addTurn({ role: 'system', text: greeting, domain: script.domain });
      speakThenListen(greeting);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Pending navigation ─────────────────────────────────────────────────

  useEffect(() => {
    if (!pendingNavigation) return;
    const path = pendingNavigation;
    setPendingNavigation(null);
    const t = setTimeout(() => { router.push(path); closeVoice(); }, 1200);
    return () => clearTimeout(t);
  }, [pendingNavigation, router, closeVoice, setPendingNavigation]);

  // ── Keyboard: SPACE + ESC ──────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isListening) { setPhase('listening'); startListening(); }
        else stopListening();
      }
      if (e.code === 'Escape') { stopAll(); closeVoice(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isListening, setPhase, startListening, stopListening, stopAll, closeVoice]);

  // ── Commit guided script ───────────────────────────────────────────────

  const commitScript = useCallback(async () => {
    if (!activeScript) return;
    setShowConfirm(false);
    setPhase('thinking');
    const ctx     = buildCtx();
    const payload = buildCommitPayload(activeScript.id, activeScript.collectedData, ctx);

    try {
      const res = await fetch('/api/proxy/claude/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: payload.transcript, goal_titles: payload.goal_titles,
          create_journal_entry: payload.create_journal_entry, mood: payload.mood,
          expenses: [], content_ideas: [], habit_mentions: payload.habit_mentions, xp_rewards: [],
        }),
      });
      if (res.ok) {
        const result: CommitResultDto = await res.json();
        const rewards = result.rewards_granted.map((r, i) => ({
          id: `${Date.now()}-${i}`, icon: r.icon, label: `+${r.xp} XP`,
          color: DOMAIN_COLORS[r.area] ?? '#9333EA', x: 20 + Math.random() * 60,
        }));
        if (rewards.length) triggerRewards(rewards);
        if (result.leveled_up) { setCommitResult(result); setShowLevelUp(true); }
        speakThenListen('All done, everything logged. Anything else?');
        setActiveScript(null);
      }
    } catch { /* ignore */ }
  }, [activeScript, buildCtx, setPhase, triggerRewards, speakThenListen, setActiveScript]);

  // ── Auto-commit silently ───────────────────────────────────────────────

  const autoCommit = useCallback(async (transcript: string) => {
    try {
      const res = await fetch('/api/proxy/claude/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript, goal_titles: [], create_journal_entry: false, mood: null,
          expenses: [], content_ideas: [], habit_mentions: [], xp_rewards: [],
        }),
      });
      if (res.ok) {
        const result: CommitResultDto = await res.json();
        const rewards = result.rewards_granted.map((r, i) => ({
          id: `${Date.now()}-${i}`, icon: r.icon, label: `+${r.xp} XP`,
          color: DOMAIN_COLORS[r.area] ?? '#9333EA', x: 20 + Math.random() * 60,
        }));
        if (rewards.length) triggerRewards(rewards);
        if (result.leveled_up) { setCommitResult(result); setShowLevelUp(true); }
      }
    } catch { /* silent */ }
  }, [triggerRewards]);

  // ── Main send handler ──────────────────────────────────────────────────

  const handleSend = useCallback(async (text: string) => {
    setLiveTranscript('');
    setPhase('thinking');
    addTurn({ role: 'user', text });
    incrementInteractionCount();

    const command = parseVoiceCommand(text);

    if (command.type === 'navigate' && command.confidence >= 0.6) {
      const route  = command.payload.route!;
      const domain = command.payload.domain!;
      const ROUTE_META: Record<string, { label: string; icon: string }> = {
        '/habits': { label: 'Habits', icon: '🌱' }, '/finance': { label: 'Finance', icon: '💰' },
        '/career': { label: 'Career', icon: '🚀' }, '/journal': { label: 'Journal', icon: '📓' },
        '/brand':  { label: 'Brand RPG', icon: '⚡' }, '/gratitude': { label: 'Gratitude', icon: '🙏' },
        '/content':{ label: 'Content', icon: '📱' }, '/levels': { label: 'Levels', icon: '⭐' },
        '/claude': { label: 'Claude', icon: '🤖' }, '/': { label: 'Dashboard', icon: '🏠' },
      };
      setNavToast(ROUTE_META[route] ?? { label: route, icon: '→' });
      setActiveDomain(domain);
      triggerParticleBurst({ count: 40, color: DOMAIN_COLORS[domain] ?? '#9333EA' });
      setPendingNavigation(route);
      stopAll();
      return;
    }

    if (
      command.type === 'start_morning_check' ||
      command.type === 'start_todo_creation' ||
      command.type === 'start_weekly_checkin'
    ) {
      const scriptId = command.type === 'start_morning_check' ? 'morning_habits'
        : command.type === 'start_todo_creation' ? 'todo_creation' : 'weekly_checkin';
      const script = getScript(scriptId);
      if (script) {
        const ctx     = buildCtx();
        const steps   = getScriptSteps(scriptId, ctx);
        const greeting = script.greeting(ctx.userName, ctx);
        setActiveScript({
          id: scriptId, stepIndex: 0, totalSteps: steps.length,
          currentQuestion: greeting, domain: script.domain, collectedData: {},
        });
        addTurn({ role: 'system', text: greeting, domain: script.domain });
        speakThenListen(greeting);
        return;
      }
    }

    if (activeScript) {
      const ctx = buildCtx();
      if (showConfirm) {
        if (command.type === 'confirmed') { await commitScript(); return; }
        if (command.type === 'rejected') {
          setShowConfirm(false);
          const step = getScriptSteps(activeScript.id, ctx)[activeScript.stepIndex];
          const q = step?.buildQuestion(activeScript.collectedData, ctx) ?? "Let's try again.";
          addTurn({ role: 'system', text: q, domain: activeScript.domain });
          speakThenListen(q);
          return;
        }
      }

      const result = advanceScript(activeScript.id, activeScript.stepIndex, text, activeScript.collectedData, ctx);
      const updated = {
        ...activeScript,
        stepIndex: (result.nextStepIndex === 'confirm' || result.nextStepIndex === 'done')
          ? activeScript.stepIndex : result.nextStepIndex as number,
        collectedData: result.updatedCollected,
      };
      setActiveScript(updated);

      if (result.nextStepIndex === 'confirm') {
        const script = getScript(activeScript.id);
        const items  = script?.buildConfirmation(result.updatedCollected, ctx) ?? [];
        setConfirmItems(items);
        setShowConfirm(true);
        setPhase('confirming');
        const summary = items.map(i => `${i.icon} ${i.label}: ${i.value}`).join(', ');
        addTurn({ role: 'confirmation', text: `Got it: ${summary}. Confirm?`, items, domain: activeScript.domain });
        speakThenListen(`Got it: ${summary}. Shall I confirm?`);
        return;
      }
      if (result.nextQuestion) {
        addTurn({ role: 'system', text: result.nextQuestion, domain: activeScript.domain });
        speakThenListen(result.nextQuestion);
        return;
      }
      return;
    }

    // Free Claude conversation
    const historySnapshot = historyRef.current;
    try {
      const res = await fetch('/api/proxy/claude/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: historySnapshot }),
      });
      if (!res.ok || !res.body) throw new Error();

      let fullReply = '';
      for await (const delta of readSseStream(res.body)) { fullReply += delta; }

      const reply = fullReply || "Sorry, no response. Please try again.";
      historyRef.current = [...historySnapshot, { role: 'user', content: text }, { role: 'assistant', content: reply }];
      addTurn({ role: 'system', text: reply });
      setPhase('speaking');
      speak(stripMarkdown(reply), () => setPhase('idle'));

      if (text.length > 20) {
        fetch('/api/proxy/claude/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: text }),
        })
          .then(r => r.json())
          .then(async (a: TranscriptAnalysisDto) => {
            if (a.topics.length > 0) {
              const domain = a.topics[0].area;
              setActiveDomain(domain);
              triggerParticleBurst({ count: 20, color: DOMAIN_COLORS[domain] ?? '#9333EA' });
              await autoCommit(text);
            }
            saveVoiceSession({
              id: Date.now().toString(),
              date: new Date().toISOString().split('T')[0],
              timestamp: new Date().toISOString(),
              transcript: text, analysis: a,
              coachingMessage: a.coaching_message,
            });
            updateAreaStreaks(a);
          })
          .catch(() => {});
      }
    } catch {
      const err = 'Connection error. Please try again.';
      addTurn({ role: 'system', text: err });
      speak(err, () => setPhase('idle'));
    }
  }, [
    addTurn, setLiveTranscript, setPhase, setActiveDomain, setActiveScript,
    activeScript, buildCtx, speak, speakThenListen, stopAll, showConfirm,
    commitScript, triggerParticleBurst, setPendingNavigation, autoCommit,
    incrementInteractionCount,
  ]);

  useEffect(() => { handleSendRef.current = handleSend; }, [handleSend]);

  // ── Derived ────────────────────────────────────────────────────────────

  const stateColor  = PHASE_COLORS[phase] ?? '#9333EA';
  const domainColor = activeDomain ? (DOMAIN_COLORS[activeDomain] ?? '#9333EA') : stateColor;
  const isActivePhase = phase === 'listening' || phase === 'speaking' || phase === 'proactive';

  // Interaction counter XP milestone color flash
  const counterColor = useMemo(() => xpMilestone ? '#F0C96E' : '#C9A84C', [xpMilestone]);

  if (!supported) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="va-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-[49]"
              style={{ background: 'rgba(4,1,12,0.65)', backdropFilter: 'blur(10px)' }}
              onClick={() => { stopAll(); closeVoice(); }}
            />

            {/* Centered floating panel */}
            <motion.div
              key="va-panel"
              initial={{ scale: 0.88, opacity: 0, y: -16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: -16 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              className="fixed z-50 flex flex-col overflow-hidden"
              style={{
                top: '7vh',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'min(440px, calc(100vw - 20px))',
                maxHeight: '84vh',
                background: 'rgba(7,2,18,0.98)',
                borderRadius: 28,
                border: `1px solid ${stateColor}20`,
                boxShadow: `0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px ${stateColor}12, inset 0 1px 0 rgba(255,255,255,0.04)`,
                backdropFilter: 'blur(32px)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Domain ambient glow */}
              <motion.div className="absolute inset-0 pointer-events-none rounded-[28px]"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${domainColor}14 0%, transparent 55%)` }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 4, repeat: Infinity }}
              />

              <AmbientParticles color={domainColor} />

              {particleBurst && (
                <BurstParticles color={particleBurst.color} onDone={clearParticleBurst} />
              )}

              {/* ── Header ── */}
              <div className="relative z-10 flex items-center gap-2 px-4 pt-4 pb-2 flex-shrink-0">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <motion.span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: stateColor }}
                    animate={{ opacity: isActivePhase ? [1, 0.2, 1] : 1 }}
                    transition={{ duration: 0.9, repeat: isActivePhase ? Infinity : 0 }} />
                  <span className="text-[10px] font-inter font-semibold tracking-widest uppercase truncate"
                    style={{ color: stateColor, opacity: 0.85 }}>
                    {PHASE_LABELS[phase]}
                  </span>
                  {activeDomain && (
                    <span className="text-[10px] font-inter px-1.5 py-0.5 rounded-md flex-shrink-0"
                      style={{ background: `${domainColor}18`, color: domainColor, border: `1px solid ${domainColor}30` }}>
                      {activeDomain}
                    </span>
                  )}
                </div>

                {/* Interaction counter */}
                <motion.span
                  className="text-[10px] font-inter font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                  style={{ background: `rgba(201,168,76,0.09)`, color: counterColor, border: `1px solid rgba(201,168,76,0.2)` }}
                  animate={xpMilestone ? { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] } : {}}
                  transition={{ duration: 0.5, repeat: xpMilestone ? 3 : 0 }}
                >
                  {interactionCount} ⚡
                </motion.span>

                <button
                  onClick={() => { stopAll(); closeVoice(); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.4)' }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* ── Nav toast ── */}
              <AnimatePresence>
                {navToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="mx-4 mb-1 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-inter font-semibold self-start z-20"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${domainColor}40`,
                      color: domainColor,
                    }}
                    onAnimationComplete={() => setTimeout(() => setNavToast(null), 900)}
                  >
                    <span>{navToast.icon}</span>
                    <span>Going to {navToast.label} ↗</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Error ── */}
              {recogError && (
                <div className="mx-4 mb-1 px-3 py-1.5 rounded-lg text-[11px] font-inter text-center flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#FCA5A5' }}>
                  Mic: <strong>{recogError}</strong>
                  {recogError === 'not-allowed' && ' — check permissions'}
                </div>
              )}

              {/* ── Central orb section ── */}
              <div className="flex flex-col items-center pb-2 flex-shrink-0 relative z-10">
                <CentralOrb
                  phase={phase}
                  stateColor={stateColor}
                  bars={bars}
                  isListening={isListening}
                  silenceProgress={silenceProgress}
                  isActive={isActivePhase}
                  onToggle={() => {
                    if (!isListening) { setPhase('listening'); startListening(); }
                    else stopListening();
                  }}
                />
                <p className="text-[10px] font-inter mt-1" style={{ color: 'rgba(226,232,240,0.22)', letterSpacing: '0.08em' }}>
                  {isListening ? 'TAP TO SEND  •  SPACE' : 'TAP TO SPEAK  •  SPACE'}
                </p>
              </div>

              {/* ── Chat messages ── */}
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0 relative z-10"
                style={{ scrollbarWidth: 'none' }}>
                {turns.length === 0 && !liveTranscript && (
                  <div className="flex flex-col items-center justify-center py-4 gap-1.5 opacity-40">
                    <span className="text-xs font-inter" style={{ color: 'rgba(226,232,240,0.5)' }}>
                      Your conversation will appear here
                    </span>
                  </div>
                )}

                {turns.map((turn: DialogueTurn, i: number) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[86%] px-3 py-2 rounded-2xl text-xs font-inter leading-relaxed"
                      style={turn.role === 'user' ? {
                        background: 'linear-gradient(135deg, rgba(107,33,168,0.5), rgba(59,13,122,0.5))',
                        border: '1px solid rgba(147,51,234,0.28)',
                        color: '#E2E8F0',
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${turn.domain ? DOMAIN_COLORS[turn.domain] + '28' : 'rgba(255,255,255,0.07)'}`,
                        color: '#E2E8F0',
                      }}
                    >
                      {turn.role === 'user' ? <p>{turn.text}</p> : <VoiceMsg content={turn.text} />}
                    </div>
                  </motion.div>
                ))}

                {liveTranscript && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                    <div className="max-w-[86%] px-3 py-2 rounded-2xl text-xs font-inter"
                      style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', color: 'rgba(226,232,240,0.8)' }}>
                      {liveTranscript}
                      <motion.span className="inline-block w-0.5 h-3 ml-0.5 align-middle rounded-full"
                        style={{ background: '#C9A84C' }}
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.85, repeat: Infinity }} />
                    </div>
                  </motion.div>
                )}

                {phase === 'thinking' && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                    <div className="rounded-2xl px-4 py-2.5"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <TypingDots color={stateColor} />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Confirm sheet ── */}
              <AnimatePresence>
                {showConfirm && confirmItems.length > 0 && (
                  <motion.div
                    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="flex-shrink-0 px-5 pt-4 pb-3 relative z-20"
                    style={{ background: 'rgba(12,5,30,0.98)', borderTop: '1px solid rgba(147,51,234,0.18)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <p className="font-syne font-black text-sm mb-2.5" style={{ color: '#E2E8F0' }}>Here's what I got:</p>
                    <div className="divide-y divide-white/5 mb-3">
                      {confirmItems.map((item, i) => <ConfirmRow key={i} item={item} />)}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={commitScript}
                        className="flex-1 py-2 rounded-xl text-sm font-inter font-bold flex items-center justify-center gap-1.5"
                        style={{ background: 'linear-gradient(135deg, #3B0D7A, #9333EA)', color: '#fff' }}>
                        ⚡ Confirm
                      </button>
                      <button
                        onClick={() => {
                          setShowConfirm(false);
                          const ctx = buildCtx();
                          if (activeScript) {
                            const step = getScriptSteps(activeScript.id, ctx)[activeScript.stepIndex];
                            speakThenListen(step?.buildQuestion(activeScript.collectedData, ctx) ?? "Let's try again.");
                          }
                        }}
                        className="px-4 py-2 rounded-xl text-sm font-inter font-semibold"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.65)', border: '1px solid rgba(255,255,255,0.09)' }}>
                        ↩ Edit
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Input bar ── */}
              {!showConfirm && (
                <div className="flex-shrink-0 px-4 pb-5 pt-2 relative z-10">
                  <InputBar
                    isListening={isListening}
                    liveTranscript={liveTranscript}
                    disabled={phase === 'thinking' || phase === 'speaking'}
                    stateColor={stateColor}
                    onMicToggle={() => {
                      if (!isListening) { setPhase('listening'); startListening(); }
                      else stopListening();
                    }}
                    onSend={(text) => handleSendRef.current(text)}
                  />
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLevelUp && commitResult && (
          <LevelUpBanner
            level={commitResult.new_level}
            tier={commitResult.new_tier}
            title={commitResult.new_title}
            onDismiss={() => setShowLevelUp(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
