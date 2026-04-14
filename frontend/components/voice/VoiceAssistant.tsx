'use client';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Volume2 } from 'lucide-react';
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
import { TranscriptReveal } from './TranscriptReveal';
import { LevelUpBanner } from './LevelUpBanner';
import { useState } from 'react';

// ── Strip markdown for TTS ─────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '').replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1').replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1').replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '').replace(/^>\s+/gm, '').replace(/---+/g, '').trim();
}

// ── Voice message renderer ─────────────────────────────────────────────────

function VoiceMsg({ content }: { content: string }) {
  return (
    <ReactMarkdown components={{
      p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
      strong: ({ children }) => <strong className="font-bold" style={{ color: '#C084FC' }}>{children}</strong>,
      li: ({ children }) => (
        <li className="flex items-start gap-1.5 text-xs">
          <span style={{ color: '#9333EA', marginTop: 1, flexShrink: 0 }}>▸</span>
          <span>{children}</span>
        </li>
      ),
      ul: ({ children }) => <ul className="mt-1 mb-1.5 space-y-0.5">{children}</ul>,
    }}>{content}</ReactMarkdown>
  );
}

// ── Ambient particles ──────────────────────────────────────────────────────

const AMBIENT_COUNT = 22;

function AmbientParticles({ color }: { color: string }) {
  const particles = useMemo(() =>
    Array.from({ length: AMBIENT_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 4,
      drift: (Math.random() - 0.5) * 30,
    }))
  , []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: color,
          }}
          animate={{
            y: [0, -60, 0],
            x: [0, p.drift, 0],
            opacity: [0.1, 0.45, 0.1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ── Burst particles ────────────────────────────────────────────────────────

function BurstParticles({ color, onDone }: { color: string; onDone: () => void }) {
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => {
      const angle = (i / 40) * Math.PI * 2;
      const dist = 80 + Math.random() * 60;
      return { id: i, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
    })
  , []);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{ scale: [0, 1.5, 0], x: p.x, y: p.y, opacity: [1, 1, 0] }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          onAnimationComplete={p.id === 0 ? onDone : undefined}
        />
      ))}
    </div>
  );
}

// ── Radial waveform ────────────────────────────────────────────────────────

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
            transform: `translateX(-50%) rotate(${(i / bars.length) * 360}deg) translateY(-56px)`,
            background: color,
            borderRadius: 2,
            opacity: 0.25 + (h / 60) * 0.75,
          }}
          animate={{ height: active ? h : 3 }}
          transition={{ duration: 0.04 }}
        />
      ))}
    </div>
  );
}

// ── Confirm item row ───────────────────────────────────────────────────────

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

// ── Message history type ───────────────────────────────────────────────────

interface HistMsg { role: 'user' | 'assistant'; content: string }

// ── Phase color map ────────────────────────────────────────────────────────

const PHASE_COLORS = {
  idle:       '#9333EA',
  listening:  '#C9A84C',
  thinking:   '#C084FC',
  speaking:   '#86EFAC',
  proactive:  '#67E8F9',
  confirming: '#F0C96E',
};

const PHASE_LABELS = {
  idle:       'Tieni SPACE o tocca',
  listening:  'In ascolto… rilascia SPACE',
  thinking:   'Sto elaborando…',
  speaking:   'Sto parlando…',
  proactive:  'In ascolto…',
  confirming: 'Confermo?',
};

// ── Main component ─────────────────────────────────────────────────────────

export function VoiceAssistant() {
  const router = useRouter();
  const {
    isOpen, phase, activeDomain, turns, activeScript, liveTranscript, particleBurst,
    pendingNavigation, closeVoice, setPhase, setActiveDomain, addTurn, clearTurns,
    setLiveTranscript, setActiveScript, triggerParticleBurst, clearParticleBurst,
    setPendingNavigation,
  } = useVoiceAssistantStore();

  const { habits }      = useHabitStore();
  const { triggerRewards } = useXpFloaterStore();

  const [analysis,        setAnalysis]        = useState<TranscriptAnalysisDto | null>(null);
  const [revealTranscript, setRevealTranscript] = useState('');
  const [showReveal,      setShowReveal]       = useState(false);
  const [commitResult,    setCommitResult]     = useState<CommitResultDto | null>(null);
  const [showLevelUp,     setShowLevelUp]      = useState(false);
  const [showConfirm,     setShowConfirm]      = useState(false);
  const [confirmItems,    setConfirmItems]     = useState<ConfirmItem[]>([]);
  const [navToast,        setNavToast]         = useState<{ label: string; icon: string } | null>(null);

  const historyRef  = useRef<HistMsg[]>([]);
  const handleSendRef = useRef<(text: string) => void>(() => {});

  // ── Build dialogue context ───────────────────────────────────────────

  const buildCtx = useCallback((): DialogueContext => ({
    hour:       new Date().getHours(),
    dayOfWeek:  new Date().getDay(),
    userName:   'Gianmarco',
    habitNames: habits.filter(h => h.active).map(h => h.name),
  }), [habits]);

  // ── Voice audio hook ─────────────────────────────────────────────────

  const { bars, supported, recogError, isListening, startListening, stopListening, stopAll, speak } = useVoiceAudio({
    onInterim: setLiveTranscript,
    onTranscriptReady: useCallback((text: string) => {
      handleSendRef.current(text);
    }, []),
  });

  // ── Speak then auto-listen ───────────────────────────────────────────

  const speakThenListen = useCallback((text: string) => {
    setPhase('speaking');
    speak(stripMarkdown(text), () => {
      setPhase('listening');
      startListening();
    });
  }, [speak, setPhase, startListening]);

  // ── Proactive greeting on open ───────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    clearTurns();
    setLiveTranscript('');

    const ctx = buildCtx();
    const script = shouldTriggerProactive(ctx);
    if (script) {
      const greeting = script.greeting(ctx.userName, ctx);
      const steps = getScriptSteps(script.id, ctx);
      setPhase('proactive');
      setActiveScript({
        id: script.id,
        stepIndex: 0,
        totalSteps: steps.length,
        currentQuestion: greeting,
        domain: script.domain,
        collectedData: {},
      });
      addTurn({ role: 'system', text: greeting, domain: script.domain });
      speakThenListen(greeting);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Navigation from pending ──────────────────────────────────────────

  useEffect(() => {
    if (!pendingNavigation) return;
    const path = pendingNavigation;
    setPendingNavigation(null);
    const timer = setTimeout(() => {
      router.push(path);
      closeVoice();
    }, 1200);
    return () => clearTimeout(timer);
  }, [pendingNavigation, router, closeVoice, setPendingNavigation]);

  // ── Keyboard: SPACE + ESC ────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isListening) { setPhase('listening'); startListening(); }
        else { stopListening(); }
      }
      if (e.code === 'Escape') { stopAll(); closeVoice(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isListening, setPhase, startListening, stopListening, stopAll, closeVoice]);

  // ── Commit script ────────────────────────────────────────────────────

  const commitScript = useCallback(async () => {
    if (!activeScript) return;
    setShowConfirm(false);
    setPhase('thinking');
    const ctx = buildCtx();
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
          id: `${Date.now()}-${i}`,
          icon: r.icon,
          label: `+${r.xp} XP`,
          color: DOMAIN_COLORS[r.area] ?? '#9333EA',
          x: 20 + Math.random() * 60,
        }));
        if (rewards.length) triggerRewards(rewards);
        if (result.leveled_up) { setCommitResult(result); setShowLevelUp(true); }
        speakThenListen('Perfetto, tutto registrato! Posso fare altro per te?');
        setActiveScript(null);
      }
    } catch { /* ignore */ }
  }, [activeScript, buildCtx, setPhase, triggerRewards, speakThenListen, setActiveScript]);

  // ── Main send handler ────────────────────────────────────────────────

  const handleSend = useCallback(async (text: string) => {
    setLiveTranscript('');
    setPhase('thinking');
    addTurn({ role: 'user', text });

    const command = parseVoiceCommand(text);

    // ── Navigation ───────────────────────────────────────────────────

    if (command.type === 'navigate' && command.confidence >= 0.6) {
      const route = command.payload.route!;
      const domain = command.payload.domain!;
      const routeLabels: Record<string, { label: string; icon: string }> = {
        '/habits': { label: 'Habits', icon: '🌱' },
        '/finance': { label: 'Finance', icon: '💰' },
        '/career': { label: 'Career', icon: '🚀' },
        '/journal': { label: 'Journal', icon: '📓' },
        '/brand': { label: 'Brand RPG', icon: '⚡' },
        '/gratitude': { label: 'Gratitude', icon: '🙏' },
        '/content': { label: 'Content', icon: '📱' },
        '/levels': { label: 'Levels', icon: '⭐' },
        '/claude': { label: 'Claude', icon: '🤖' },
        '/': { label: 'Dashboard', icon: '🏠' },
      };
      setNavToast(routeLabels[route] ?? { label: route, icon: '→' });
      setActiveDomain(domain);
      triggerParticleBurst({ count: 40, color: DOMAIN_COLORS[domain] ?? '#9333EA' });
      setPendingNavigation(route);
      stopAll();
      return;
    }

    // ── Proactive script triggers ─────────────────────────────────────

    if (command.type === 'start_morning_check' || command.type === 'start_todo_creation' || command.type === 'start_weekly_checkin') {
      const scriptId = command.type === 'start_morning_check' ? 'morning_habits'
        : command.type === 'start_todo_creation' ? 'todo_creation'
        : 'weekly_checkin';
      const script = getScript(scriptId);
      if (script) {
        const ctx = buildCtx();
        const steps = getScriptSteps(scriptId, ctx);
        const greeting = script.greeting(ctx.userName, ctx);
        setActiveScript({ id: scriptId, stepIndex: 0, totalSteps: steps.length, currentQuestion: greeting, domain: script.domain, collectedData: {} });
        addTurn({ role: 'system', text: greeting, domain: script.domain });
        speakThenListen(greeting);
        return;
      }
    }

    // ── Active script: advance turn ──────────────────────────────────

    if (activeScript) {
      const ctx = buildCtx();

      // Confirmation phase
      if (showConfirm) {
        if (command.type === 'confirmed') { await commitScript(); return; }
        if (command.type === 'rejected') {
          setShowConfirm(false);
          const step = getScriptSteps(activeScript.id, ctx)[activeScript.stepIndex];
          const q = step?.buildQuestion(activeScript.collectedData, ctx) ?? 'Riproviamo. Cosa vuoi fare?';
          addTurn({ role: 'system', text: q, domain: activeScript.domain });
          speakThenListen(q);
          return;
        }
      }

      const result = advanceScript(activeScript.id, activeScript.stepIndex, text, activeScript.collectedData, ctx);
      const updated = { ...activeScript, stepIndex: result.nextStepIndex === 'confirm' || result.nextStepIndex === 'done' ? activeScript.stepIndex : result.nextStepIndex as number, collectedData: result.updatedCollected };
      setActiveScript(updated);

      if (result.nextStepIndex === 'confirm') {
        const script = getScript(activeScript.id);
        const items = script?.buildConfirmation(result.updatedCollected, ctx) ?? [];
        setConfirmItems(items);
        setShowConfirm(true);
        setPhase('confirming');
        const summary = items.map(i => `${i.icon} ${i.label}: ${i.value}`).join(', ');
        const q = `Ho capito: ${summary}. Confermo?`;
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

    // ── Fallthrough: Claude conversation ─────────────────────────────

    const historySnapshot = historyRef.current;

    try {
      const res = await fetch('/api/proxy/claude/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: historySnapshot }),
      });

      if (!res.ok || !res.body) throw new Error();

      let fullReply = '';
      for await (const delta of readSseStream(res.body)) {
        fullReply += delta;
      }

      const reply = fullReply || 'Scusa, non ho ricevuto risposta.';
      historyRef.current = [...historySnapshot, { role: 'user', content: text }, { role: 'assistant', content: reply }];
      addTurn({ role: 'system', text: reply });
      setPhase('speaking');
      speak(stripMarkdown(reply), () => setPhase('idle'));

      // Domain detection from analysis
      if (text.length > 20) {
        fetch('/api/proxy/claude/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: text }),
        })
          .then(r => r.json())
          .then((a: TranscriptAnalysisDto) => {
            if (a.topics.length > 0) {
              const domain = a.topics[0].area;
              setActiveDomain(domain);
              triggerParticleBurst({ count: 20, color: DOMAIN_COLORS[domain] ?? '#9333EA' });
            }
            setAnalysis(a);
            setRevealTranscript(text);
            setShowReveal(true);
            saveVoiceSession({
              id: Date.now().toString(),
              date: new Date().toISOString().split('T')[0],
              timestamp: new Date().toISOString(),
              transcript: text,
              analysis: a,
              coachingMessage: a.coaching_message,
            });
            updateAreaStreaks(a);
          })
          .catch(() => {});
      }
    } catch {
      const err = 'Errore di connessione al backend.';
      addTurn({ role: 'system', text: err });
      speak(err, () => setPhase('idle'));
    }
  }, [
    addTurn, setLiveTranscript, setPhase, setActiveDomain, setActiveScript,
    activeScript, buildCtx, speak, speakThenListen, stopAll, showConfirm,
    commitScript, triggerParticleBurst, setPendingNavigation,
  ]);

  useEffect(() => { handleSendRef.current = handleSend; }, [handleSend]);

  // ── Derived ──────────────────────────────────────────────────────────

  const stateColor = PHASE_COLORS[phase] ?? '#9333EA';
  const domainColor = activeDomain ? (DOMAIN_COLORS[activeDomain] ?? '#9333EA') : stateColor;
  const isActivePhase = phase === 'listening' || phase === 'speaking' || phase === 'proactive';

  if (!supported) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
            style={{ background: 'rgba(5,2,16,0.94)', backdropFilter: 'blur(28px)' }}
            onClick={e => { if (e.target === e.currentTarget) { stopAll(); closeVoice(); } }}
          >
            {/* Layer 1: Domain ambient orb */}
            {activeDomain && (
              <motion.div
                className="absolute pointer-events-none"
                style={{
                  width: 600, height: 600,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${domainColor}30 0%, transparent 70%)`,
                  filter: 'blur(80px)',
                }}
                animate={{ opacity: [0.12, 0.22, 0.12] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            {/* Layer 2: Ambient particles */}
            <AmbientParticles color={domainColor} />

            {/* Layer 2b: Burst particles */}
            {particleBurst && (
              <BurstParticles
                color={particleBurst.color}
                onDone={clearParticleBurst}
              />
            )}

            {/* Close button */}
            <button
              onClick={() => { stopAll(); closeVoice(); }}
              className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center z-10"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(226,232,240,0.6)' }}
            >
              <X size={16} />
            </button>

            {/* Layer 3–4: Blob orb + radial waveform */}
            <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
              {/* Ripple rings */}
              {isActivePhase && [1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{ inset: 0, border: `1px solid ${stateColor}` }}
                  animate={{ scale: [1, 1 + i * 0.4], opacity: [0.5, 0] }}
                  transition={{ duration: 2, delay: i * 0.5, repeat: Infinity, ease: 'easeOut' }}
                />
              ))}

              {/* Radial waveform */}
              <RadialWaveform bars={bars} color={stateColor} active={isActivePhase} />

              {/* Morphing blob */}
              <motion.button
                onClick={() => {
                  if (!isListening) { setPhase('listening'); startListening(); }
                  else { stopListening(); }
                }}
                className="relative z-10 flex items-center justify-center"
                style={{
                  width: 120, height: 120,
                  background: `radial-gradient(circle at 35% 35%, ${stateColor}80, ${stateColor}30)`,
                  border: `2px solid ${stateColor}`,
                  boxShadow: `0 0 60px ${stateColor}50, inset 0 0 30px ${stateColor}15`,
                  animation: 'blobMorph 8s ease-in-out infinite',
                }}
                animate={phase === 'thinking' ? { rotate: 360 } : {}}
                transition={phase === 'thinking' ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.92 }}
              >
                {(phase === 'idle' || phase === 'listening') && <Mic size={40} color={stateColor} />}
                {phase === 'thinking' && (
                  <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>
                    <Volume2 size={36} color={stateColor} />
                  </motion.div>
                )}
                {(phase === 'speaking' || phase === 'proactive') && <Volume2 size={40} color={stateColor} />}
                {phase === 'confirming' && <span style={{ fontSize: 36 }}>⚡</span>}
              </motion.button>
            </div>

            {/* Phase label */}
            <p className="mt-4 text-xs font-inter font-semibold tracking-widest uppercase" style={{ color: stateColor }}>
              {PHASE_LABELS[phase]}
            </p>

            {/* Error banner */}
            {recogError && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-3 px-4 py-2 rounded-xl text-xs font-inter text-center"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}
              >
                Errore mic: <strong>{recogError}</strong>
                {recogError === 'not-allowed' && ' — controlla permessi browser'}
                {recogError === 'network' && ' — richiede connessione internet'}
              </motion.div>
            )}

            {/* Layer 6: Live transcript */}
            <AnimatePresence>
              {(isListening || phase === 'proactive' || liveTranscript) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-5 w-full max-w-sm px-4 space-y-2"
                >
                  <div
                    className="w-full rounded-2xl px-4 py-3 min-h-[52px] max-h-32 overflow-y-auto"
                    style={{
                      background: 'rgba(201,168,76,0.07)',
                      border: '1px solid rgba(201,168,76,0.28)',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(201,168,76,0.2) transparent',
                    }}
                  >
                    {liveTranscript ? (
                      <p className="text-sm font-inter leading-relaxed" style={{ color: '#E2E8F0' }}>
                        {liveTranscript}
                        <span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle rounded-full"
                          style={{ background: '#C9A84C', animation: 'pulse 1s ease-in-out infinite' }} />
                      </p>
                    ) : (
                      <p className="text-xs font-inter" style={{ color: 'rgba(201,168,76,0.4)' }}>
                        Inizia a parlare… invierò automaticamente dopo la pausa
                      </p>
                    )}
                  </div>

                  {/* Manual send button — appears when there's text */}
                  {liveTranscript && isListening && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={stopListening}
                      className="w-full py-2.5 rounded-2xl text-sm font-inter font-bold flex items-center justify-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.1))',
                        border: '1px solid rgba(201,168,76,0.4)',
                        color: '#F0C96E',
                      }}
                    >
                      ↑ Invia ora
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Layer 5: Dialogue turns */}
            {turns.length > 0 && (
              <div
                className="mt-4 w-full max-w-sm px-4 max-h-52 overflow-y-auto space-y-2"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(147,51,234,0.2) transparent' }}
              >
                {turns.slice(-6).map((turn: DialogueTurn, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-[88%] px-3 py-2.5 rounded-xl text-xs font-inter"
                      style={turn.role === 'user' ? {
                        background: 'linear-gradient(135deg, rgba(107,33,168,0.5), rgba(59,13,122,0.5))',
                        border: '1px solid rgba(147,51,234,0.3)', color: '#E2E8F0',
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${turn.domain ? DOMAIN_COLORS[turn.domain] + '30' : 'rgba(255,255,255,0.07)'}`,
                        color: '#E2E8F0',
                      }}
                    >
                      {turn.role === 'user' ? (
                        <p className="leading-relaxed">{turn.text}</p>
                      ) : (
                        <VoiceMsg content={turn.text} />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Layer 7: Navigation toast */}
            <AnimatePresence>
              {navToast && (
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute top-16 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-inter font-semibold"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: `1px solid ${domainColor}50`,
                    color: domainColor,
                    backdropFilter: 'blur(12px)',
                  }}
                  onAnimationComplete={() => setTimeout(() => setNavToast(null), 900)}
                >
                  <span>{navToast.icon}</span>
                  <span>Navigando su {navToast.label}</span>
                  <span style={{ opacity: 0.6 }}>↗</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Layer 8: Confirmation bottom-sheet */}
            <AnimatePresence>
              {showConfirm && confirmItems.length > 0 && (
                <motion.div
                  initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                  className="absolute bottom-0 w-full max-w-sm rounded-t-3xl px-6 pt-5 pb-8"
                  style={{ background: 'rgba(17,8,48,0.97)', border: '1px solid rgba(147,51,234,0.25)' }}
                  onClick={e => e.stopPropagation()}
                >
                  <p className="font-syne font-black text-base mb-3" style={{ color: '#E2E8F0' }}>Ho capito:</p>
                  <div className="divide-y divide-white/5">
                    {confirmItems.map((item, i) => <ConfirmRow key={i} item={item} />)}
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={commitScript}
                      className="flex-1 py-2.5 rounded-2xl text-sm font-inter font-bold flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #3B0D7A, #9333EA)', color: '#fff' }}
                    >
                      ⚡ Conferma
                    </button>
                    <button
                      onClick={() => {
                        setShowConfirm(false);
                        const ctx = buildCtx();
                        if (activeScript) {
                          const step = getScriptSteps(activeScript.id, ctx)[activeScript.stepIndex];
                          const q = step?.buildQuestion(activeScript.collectedData, ctx) ?? 'Riproviamo.';
                          speakThenListen(q);
                        }
                      }}
                      className="px-4 py-2.5 rounded-2xl text-sm font-inter font-semibold"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      ↩ Correggi
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom hint */}
            {!showConfirm && (
              <p className="absolute bottom-6 text-[10px] font-inter tracking-widest uppercase"
                style={{ color: 'rgba(226,232,240,0.2)' }}>
                SPACE · ascolta — ESC · chiudi
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TranscriptReveal overlay */}
      <AnimatePresence>
        {showReveal && analysis && (
          <TranscriptReveal
            transcript={revealTranscript}
            analysis={analysis}
            onClose={() => setShowReveal(false)}
            onCommit={(result) => {
              const rewards = result.rewards_granted.map((r, i) => ({
                id: `${Date.now()}-${i}`,
                icon: r.icon, label: `+${r.xp} XP`,
                color: DOMAIN_COLORS[r.area] ?? '#9333EA',
                x: 20 + Math.random() * 60,
              }));
              if (rewards.length) triggerRewards(rewards);
              if (result.leveled_up) { setCommitResult(result); setShowLevelUp(true); }
            }}
          />
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
