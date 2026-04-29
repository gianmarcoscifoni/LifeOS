'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Send } from 'lucide-react';
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

// ── Strip markdown for TTS ────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '').replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1').replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1').replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '').replace(/^>\s+/gm, '').replace(/---+/g, '').trim();
}

// ── Markdown renderer ─────────────────────────────────────────────────

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

// ── Ambient particles ─────────────────────────────────────────────────

const AMBIENT_COUNT = 18;

function AmbientParticles({ color }: { color: string }) {
  const [particles, setParticles] = useState<Array<{
    id: number; x: number; y: number; size: number; delay: number; duration: number; drift: number;
  }>>([]);

  useEffect(() => {
    setParticles(Array.from({ length: AMBIENT_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 4,
      drift: (Math.random() - 0.5) * 30,
    })));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: color }}
          animate={{ y: [0, p.drift], opacity: [0.08, 0.28, 0.08] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ── Burst particles ───────────────────────────────────────────────────

function BurstParticles({ color, onDone }: { color: string; onDone: () => void }) {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => {
      const angle = (i / 40) * Math.PI * 2;
      const dist  = 80 + Math.random() * 60;
      return { id: i, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
    })
  );
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: [0, 1.5, 0], opacity: [1, 1, 0] }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          onAnimationComplete={p.id === 0 ? onDone : undefined}
        />
      ))}
    </div>
  );
}

// ── Radial waveform ───────────────────────────────────────────────────

function RadialWaveform({ bars, color, active }: { bars: number[]; color: string; active: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 2,
            bottom: '50%',
            left: '50%',
            transformOrigin: 'bottom center',
            transform: `translateX(-50%) rotate(${(i / bars.length) * 360}deg) translateY(-52px)`,
            background: color,
            borderRadius: 2,
            opacity: 0.2 + (h / 60) * 0.8,
          }}
          animate={{ height: active ? h : 3 }}
          transition={{ duration: 0.04 }}
        />
      ))}
    </div>
  );
}

// ── Typing dots ───────────────────────────────────────────────────────

function TypingDots({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1, delay: i * 0.18, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

// ── Apple-style mic SVG ───────────────────────────────────────────────

function MicSVG({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="8" y="1" width="8" height="13" rx="4" fill={color} fillOpacity={0.88} />
      <path d="M5 10v3a7 7 0 0 0 14 0v-3" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <line x1="12" y1="20" x2="12" y2="23" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      <line x1="9" y1="23" x2="15" y2="23" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

// ── Confirm item row ──────────────────────────────────────────────────

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

// ── Compact Apple-style input bar ─────────────────────────────────────

function CompactInputBar({
  isListening, liveTranscript, disabled, onMicToggle, onSend,
}: {
  isListening: boolean;
  liveTranscript: string;
  disabled: boolean;
  onMicToggle: () => void;
  onSend: (text: string) => void;
}) {
  const [value, setValue] = useState('');

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    setValue('');
    onSend(text);
  }

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* Mic toggle */}
      <motion.button
        onClick={onMicToggle}
        disabled={disabled}
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: isListening ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${isListening ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
        }}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.91 }}
      >
        {isListening ? (
          <motion.span
            className="w-2.5 h-2.5 rounded-sm block"
            style={{ background: '#EF4444' }}
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 0.75, repeat: Infinity }}
          />
        ) : (
          <Mic size={15} color="rgba(226,232,240,0.6)" strokeWidth={1.8} />
        )}
      </motion.button>

      {/* Text input */}
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        placeholder={
          isListening && liveTranscript
            ? liveTranscript.slice(0, 42) + (liveTranscript.length > 42 ? '…' : '')
            : isListening
            ? 'Listening…'
            : 'Type a message…'
        }
        disabled={disabled}
        className="flex-1 bg-transparent outline-none text-sm font-inter py-1.5 min-w-0"
        style={{ color: '#E2E8F0', caretColor: '#9333EA' }}
      />

      {/* Send button — only when there is text */}
      <AnimatePresence>
        {value.trim() && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            onClick={submit}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3B0D7A, #9333EA)' }}
            whileTap={{ scale: 0.91 }}
          >
            <Send size={14} color="#fff" strokeWidth={2} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── History type ──────────────────────────────────────────────────────

interface HistMsg { role: 'user' | 'assistant'; content: string }

// ── Phase maps ────────────────────────────────────────────────────────

const PHASE_COLORS = {
  idle:       '#9333EA',
  listening:  '#C9A84C',
  thinking:   '#C084FC',
  speaking:   '#86EFAC',
  proactive:  '#67E8F9',
  confirming: '#F0C96E',
};

const PHASE_LABELS = {
  idle:       'Tap orb or press SPACE',
  listening:  'Listening…',
  thinking:   'Processing…',
  speaking:   'Speaking…',
  proactive:  'Listening…',
  confirming: 'Confirm?',
};

// ── Main component ────────────────────────────────────────────────────

export function VoiceAssistant() {
  const router = useRouter();
  const {
    isOpen, phase, activeDomain, turns, activeScript, liveTranscript, particleBurst,
    pendingNavigation, closeVoice, setPhase, setActiveDomain, addTurn, clearTurns,
    setLiveTranscript, setActiveScript, triggerParticleBurst, clearParticleBurst,
    setPendingNavigation,
  } = useVoiceAssistantStore();

  const { habits }         = useHabitStore();
  const { triggerRewards } = useXpFloaterStore();

  const [commitResult, setCommitResult] = useState<CommitResultDto | null>(null);
  const [showLevelUp,  setShowLevelUp]  = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [confirmItems, setConfirmItems] = useState<ConfirmItem[]>([]);
  const [navToast,     setNavToast]     = useState<{ label: string; icon: string } | null>(null);

  const historyRef     = useRef<HistMsg[]>([]);
  const handleSendRef  = useRef<(text: string) => void>(() => {});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Autoscroll on new turn or live transcript
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, liveTranscript]);

  // ── Build dialogue context ─────────────────────────────────────────

  const buildCtx = useCallback((): DialogueContext => ({
    hour:       new Date().getHours(),
    dayOfWeek:  new Date().getDay(),
    userName:   'Gianmarco',
    habitNames: habits.filter(h => h.active).map(h => h.name),
  }), [habits]);

  // ── Voice audio hook ───────────────────────────────────────────────

  const { bars, supported, recogError, isListening, startListening, stopListening, stopAll, speak } = useVoiceAudio({
    onInterim: setLiveTranscript,
    onTranscriptReady: useCallback((text: string) => {
      handleSendRef.current(text);
    }, []),
  });

  // ── Speak → auto listen ────────────────────────────────────────────

  const speakThenListen = useCallback((text: string) => {
    setPhase('speaking');
    speak(stripMarkdown(text), () => {
      setPhase('listening');
      startListening();
    });
  }, [speak, setPhase, startListening]);

  // ── Proactive on open ──────────────────────────────────────────────

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

  // ── Pending navigation ─────────────────────────────────────────────

  useEffect(() => {
    if (!pendingNavigation) return;
    const path = pendingNavigation;
    setPendingNavigation(null);
    const t = setTimeout(() => { router.push(path); closeVoice(); }, 1200);
    return () => clearTimeout(t);
  }, [pendingNavigation, router, closeVoice, setPendingNavigation]);

  // ── Keyboard: SPACE + ESC ──────────────────────────────────────────

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

  // ── Commit guided script ───────────────────────────────────────────

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
          transcript: payload.transcript,
          goal_titles: payload.goal_titles,
          create_journal_entry: payload.create_journal_entry,
          mood: payload.mood,
          expenses: [],
          content_ideas: [],
          habit_mentions: payload.habit_mentions,
          xp_rewards: [],
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
        speakThenListen('All done, everything logged. Anything else I can help with?');
        setActiveScript(null);
      }
    } catch { /* ignore */ }
  }, [activeScript, buildCtx, setPhase, triggerRewards, speakThenListen, setActiveScript]);

  // ── Auto-commit: fire & award XP silently after topic detection ────

  const autoCommit = useCallback(async (transcript: string) => {
    try {
      const res = await fetch('/api/proxy/claude/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          goal_titles: [],
          create_journal_entry: false,
          mood: null,
          expenses: [],
          content_ideas: [],
          habit_mentions: [],
          xp_rewards: [],
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

  // ── Main send handler ──────────────────────────────────────────────

  const handleSend = useCallback(async (text: string) => {
    setLiveTranscript('');
    setPhase('thinking');
    addTurn({ role: 'user', text });

    const command = parseVoiceCommand(text);

    // Navigation
    if (command.type === 'navigate' && command.confidence >= 0.6) {
      const route  = command.payload.route!;
      const domain = command.payload.domain!;
      const routeLabels: Record<string, { label: string; icon: string }> = {
        '/habits':    { label: 'Habits',     icon: '🌱' },
        '/finance':   { label: 'Finance',    icon: '💰' },
        '/career':    { label: 'Career',     icon: '🚀' },
        '/journal':   { label: 'Journal',    icon: '📓' },
        '/brand':     { label: 'Brand RPG',  icon: '⚡' },
        '/gratitude': { label: 'Gratitude',  icon: '🙏' },
        '/content':   { label: 'Content',    icon: '📱' },
        '/levels':    { label: 'Levels',     icon: '⭐' },
        '/claude':    { label: 'Claude',     icon: '🤖' },
        '/':          { label: 'Dashboard',  icon: '🏠' },
      };
      setNavToast(routeLabels[route] ?? { label: route, icon: '→' });
      setActiveDomain(domain);
      triggerParticleBurst({ count: 40, color: DOMAIN_COLORS[domain] ?? '#9333EA' });
      setPendingNavigation(route);
      stopAll();
      return;
    }

    // Proactive script triggers
    if (
      command.type === 'start_morning_check' ||
      command.type === 'start_todo_creation' ||
      command.type === 'start_weekly_checkin'
    ) {
      const scriptId = command.type === 'start_morning_check' ? 'morning_habits'
        : command.type === 'start_todo_creation' ? 'todo_creation'
        : 'weekly_checkin';
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

    // Active dialogue script
    if (activeScript) {
      const ctx = buildCtx();

      if (showConfirm) {
        if (command.type === 'confirmed') { await commitScript(); return; }
        if (command.type === 'rejected') {
          setShowConfirm(false);
          const step = getScriptSteps(activeScript.id, ctx)[activeScript.stepIndex];
          const q    = step?.buildQuestion(activeScript.collectedData, ctx) ?? "Let's try again. What would you like to do?";
          addTurn({ role: 'system', text: q, domain: activeScript.domain });
          speakThenListen(q);
          return;
        }
      }

      const result = advanceScript(activeScript.id, activeScript.stepIndex, text, activeScript.collectedData, ctx);
      const updated = {
        ...activeScript,
        stepIndex: (result.nextStepIndex === 'confirm' || result.nextStepIndex === 'done')
          ? activeScript.stepIndex
          : result.nextStepIndex as number,
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
        const q = `Got it: ${summary}. Shall I confirm?`;
        addTurn({ role: 'confirmation', text: q, items, domain: activeScript.domain });
        speakThenListen(q);
        return;
      }

      if (result.nextQuestion) {
        addTurn({ role: 'system', text: result.nextQuestion, domain: activeScript.domain });
        speakThenListen(result.nextQuestion);
        return;
      }
      return;
    }

    // Fallthrough: free Claude conversation
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

      const reply = fullReply || "Sorry, I didn't get a response. Please try again.";
      historyRef.current = [...historySnapshot, { role: 'user', content: text }, { role: 'assistant', content: reply }];
      addTurn({ role: 'system', text: reply });
      setPhase('speaking');
      speak(stripMarkdown(reply), () => setPhase('idle'));

      // Analyze + auto-commit if topics detected
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
  ]);

  useEffect(() => { handleSendRef.current = handleSend; }, [handleSend]);

  // ── Derived ────────────────────────────────────────────────────────

  const stateColor    = PHASE_COLORS[phase] ?? '#9333EA';
  const domainColor   = activeDomain ? (DOMAIN_COLORS[activeDomain] ?? '#9333EA') : stateColor;
  const isActivePhase = phase === 'listening' || phase === 'speaking' || phase === 'proactive';

  if (!supported) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Dim backdrop — does NOT cover everything, just darkens behind panel */}
            <motion.div
              key="va-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[49]"
              style={{ background: 'rgba(5,2,16,0.55)', backdropFilter: 'blur(6px)' }}
              onClick={() => { stopAll(); closeVoice(); }}
            />

            {/* Compact bottom panel — slides up */}
            <motion.div
              key="va-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden"
              style={{
                height: 'min(520px, 72vh)',
                background: 'rgba(8,3,20,0.97)',
                borderTop: `1px solid ${stateColor}30`,
                borderRadius: '24px 24px 0 0',
                boxShadow: `0 -8px 60px rgba(0,0,0,0.6), 0 -2px 0 ${stateColor}20`,
              }}
            >
              {/* Domain ambient glow inside panel */}
              <motion.div
                className="absolute inset-0 pointer-events-none rounded-[24px]"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${domainColor}12 0%, transparent 65%)` }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 4, repeat: Infinity }}
              />

              {particleBurst && (
                <BurstParticles color={particleBurst.color} onDone={clearParticleBurst} />
              )}

              {/* ── Header row ── */}
              <div className="relative z-10 flex items-center gap-3 px-4 pt-3 pb-2 flex-shrink-0">
                {/* Drag handle */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.12)' }} />

                {/* Orb (compact, inline) */}
                <motion.button
                  onClick={() => {
                    if (!isListening) { setPhase('listening'); startListening(); }
                    else stopListening();
                  }}
                  className="relative flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: isListening ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.07)',
                    border: `1.5px solid ${isListening ? 'rgba(239,68,68,0.5)' : stateColor + '50'}`,
                    boxShadow: `0 0 24px ${stateColor}30`,
                  }}
                  animate={isActivePhase ? {
                    boxShadow: [`0 0 16px ${stateColor}30`, `0 0 32px ${stateColor}60`, `0 0 16px ${stateColor}30`],
                  } : {}}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  whileTap={{ scale: 0.9 }}
                >
                  {/* Waveform rings around mini orb */}
                  {isActivePhase && (
                    <motion.div className="absolute inset-0 rounded-full"
                      style={{ border: `1px solid ${stateColor}40` }}
                      animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                  {phase === 'thinking' ? (
                    <TypingDots color={stateColor} />
                  ) : isListening ? (
                    <motion.span className="block w-3 h-3 rounded-sm"
                      style={{ background: '#EF4444' }}
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.7, repeat: Infinity }} />
                  ) : (
                    <MicSVG color={stateColor} size={20} />
                  )}
                </motion.button>

                {/* Status text + domain */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <motion.span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: stateColor }}
                      animate={{ opacity: isActivePhase ? [1, 0.2, 1] : 1 }}
                      transition={{ duration: 1, repeat: isActivePhase ? Infinity : 0 }} />
                    <span className="text-[11px] font-inter font-semibold tracking-widest uppercase"
                      style={{ color: stateColor, opacity: 0.85 }}>
                      {PHASE_LABELS[phase]}
                    </span>
                    {activeDomain && (
                      <span className="text-[10px] font-inter px-1.5 py-0.5 rounded-md"
                        style={{ background: `${domainColor}18`, color: domainColor, border: `1px solid ${domainColor}30` }}>
                        {activeDomain}
                      </span>
                    )}
                  </div>
                </div>

                {/* Close */}
                <button
                  onClick={() => { stopAll(); closeVoice(); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.4)' }}
                >
                  <X size={13} />
                </button>
              </div>

              {/* Nav toast */}
              <AnimatePresence>
                {navToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="mx-4 mb-1 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-inter font-semibold self-start z-20"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: `1px solid ${domainColor}45`,
                      color: domainColor,
                    }}
                    onAnimationComplete={() => setTimeout(() => setNavToast(null), 900)}
                  >
                    <span>{navToast.icon}</span>
                    <span>Going to {navToast.label} ↗</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              {recogError && (
                <div className="mx-4 mb-1 px-3 py-1.5 rounded-lg text-[11px] font-inter text-center flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#FCA5A5' }}>
                  Mic: <strong>{recogError}</strong>
                  {recogError === 'not-allowed' && ' — check permissions'}
                </div>
              )}

              {/* ── Chat messages ── */}
              <div
                className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0"
                style={{ scrollbarWidth: 'none' }}
              >
                {turns.map((turn: DialogueTurn, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-[85%] px-3 py-2 rounded-2xl text-xs font-inter leading-relaxed"
                      style={turn.role === 'user' ? {
                        background: 'linear-gradient(135deg, rgba(107,33,168,0.45), rgba(59,13,122,0.45))',
                        border: '1px solid rgba(147,51,234,0.25)',
                        color: '#E2E8F0',
                      } : {
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${turn.domain ? DOMAIN_COLORS[turn.domain] + '25' : 'rgba(255,255,255,0.07)'}`,
                        color: '#E2E8F0',
                      }}
                    >
                      {turn.role === 'user' ? <p>{turn.text}</p> : <VoiceMsg content={turn.text} />}
                    </div>
                  </motion.div>
                ))}

                {liveTranscript && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                    <div className="max-w-[85%] px-3 py-2 rounded-2xl text-xs font-inter"
                      style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.22)', color: '#E2E8F0' }}>
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

              {/* ── Confirm sheet (inside panel) ── */}
              <AnimatePresence>
                {showConfirm && confirmItems.length > 0 && (
                  <motion.div
                    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="flex-shrink-0 px-5 pt-4 pb-3"
                    style={{ background: 'rgba(14,6,36,0.98)', borderTop: '1px solid rgba(147,51,234,0.16)' }}
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
                <div className="flex-shrink-0 px-4 pb-5 pt-1.5">
                  <CompactInputBar
                    isListening={isListening}
                    liveTranscript={liveTranscript}
                    disabled={phase === 'thinking' || phase === 'speaking'}
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

      {/* Level up banner */}
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
