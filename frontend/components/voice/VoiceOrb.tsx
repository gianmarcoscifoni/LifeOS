'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Volume2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { TranscriptAnalysisDto, CommitResultDto } from '@/lib/api';
import { readSseStream } from '@/lib/sseStream';
import { saveVoiceSession, updateAreaStreaks } from '@/lib/voiceSession';
import { saveDailyGoal } from '@/lib/goalSession';
import { useXpFloaterStore } from '@/lib/store';
import { TranscriptReveal } from './TranscriptReveal';
import { LevelUpBanner } from './LevelUpBanner';

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
  interface SpeechRecognitionInstance extends EventTarget {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
  }
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
}

interface Message { role: 'user' | 'assistant'; content: string }

// Strip markdown for TTS so it doesn't read asterisks/hashes
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/---+/g, '')
    .trim();
}

function VoiceMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-bold" style={{ color: '#C084FC' }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em style={{ color: 'rgba(226,232,240,0.65)', fontStyle: 'italic' }}>{children}</em>
        ),
        ul: ({ children }) => <ul className="mt-1 mb-1.5 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="mt-1 mb-1.5 space-y-0.5">{children}</ol>,
        li: ({ children }) => (
          <li className="flex items-start gap-1.5 text-xs">
            <span style={{ color: '#9333EA', marginTop: 1, flexShrink: 0 }}>▸</span>
            <span>{children}</span>
          </li>
        ),
        h1: ({ children }) => (
          <p className="font-syne font-black text-sm mb-1 mt-1" style={{ color: '#C084FC' }}>{children}</p>
        ),
        h2: ({ children }) => (
          <p className="font-syne font-bold text-xs mb-1 mt-1 uppercase tracking-wider" style={{ color: 'rgba(192,132,252,0.8)' }}>{children}</p>
        ),
        h3: ({ children }) => (
          <p className="font-bold text-xs mb-0.5 mt-1" style={{ color: 'rgba(192,132,252,0.7)' }}>{children}</p>
        ),
        code: ({ children }) => (
          <code className="px-1 py-0.5 rounded text-[10px] font-mono"
            style={{ background: 'rgba(147,51,234,0.2)', color: '#C084FC' }}>
            {children}
          </code>
        ),
        hr: () => (
          <hr className="my-2" style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)' }} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

const WAVEFORM_BARS = 24;

const AREA_COLOR: Record<string, string> = {
  career: '#9333EA', habits: '#86EFAC', finance: '#C9A84C',
  health: '#F0C96E', brand: '#C084FC', relationships: '#67E8F9',
};

export function VoiceOrb() {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [bars, setBars] = useState<number[]>(Array(WAVEFORM_BARS).fill(2));
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [recogError, setRecogError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TranscriptAnalysisDto | null>(null);
  const [revealTranscript, setRevealTranscript] = useState('');
  const [showReveal, setShowReveal] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResultDto | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const { triggerRewards } = useXpFloaterStore();

  const recognitionRef      = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef            = useRef<SpeechSynthesis | null>(null);
  const animFrameRef        = useRef<number>(0);
  const analyserRef         = useRef<AnalyserNode | null>(null);
  const audioCtxRef         = useRef<AudioContext | null>(null);
  const streamRef           = useRef<MediaStream | null>(null);
  const transcriptRef       = useRef('');
  const accumulatedRef      = useRef(''); // finalized sentences during session
  const historyRef          = useRef<Message[]>([]);
  const handleSendRef       = useRef<(text: string) => void>(() => {});
  const shouldRestartRef    = useRef(false);

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { historyRef.current = messages; }, [messages]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const recognition = new SR();
    recognition.lang = navigator.language || 'it-IT';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          accumulatedRef.current += (accumulatedRef.current ? ' ' : '') + r[0].transcript.trim();
        } else {
          interim += r[0].transcript;
        }
      }
      const live = accumulatedRef.current + (interim ? (accumulatedRef.current ? ' ' : '') + interim : '');
      setTranscript(live);
      transcriptRef.current = live;
    };

    (recognition as unknown as { onerror: (e: { error: string }) => void }).onerror = (e: { error: string }) => {
      console.error('[SpeechRecognition] error:', e.error);
      // no-speech is a normal timeout — recognition restarts via onend, don't kill it
      if (e.error === 'no-speech') return;
      // fatal errors only
      setRecogError(e.error);
      shouldRestartRef.current = false;
      stopAudioAnalysis();
      setState('idle');
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try { recognition.start(); } catch { /* already running */ }
        return;
      }
      stopAudioAnalysis();
      const full = accumulatedRef.current.trim();
      accumulatedRef.current = '';
      if (full.length > 0) {
        handleSendRef.current(full);
      } else {
        setState('idle');
        setTranscript('');
        transcriptRef.current = '';
      }
    };

    recognitionRef.current = recognition;
    synthRef.current = window.speechSynthesis;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (state === 'idle') startListening();
        else if (state === 'listening') stopListening();
      }
      if (e.code === 'Escape') { stopAll(); setOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, state]);

  async function startAudioAnalysis() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;
      animateBars();
    } catch { /* mic denied */ }
  }

  function animateBars() {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const newBars = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
      const val = data[Math.floor((i / WAVEFORM_BARS) * data.length)] ?? 0;
      return Math.max(2, (val / 255) * 60);
    });
    setBars(newBars);
    animFrameRef.current = requestAnimationFrame(animateBars);
  }

  function stopAudioAnalysis() {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    analyserRef.current = null;
    setBars(Array(WAVEFORM_BARS).fill(2));
  }

  function startListening() {
    if (!recognitionRef.current || state !== 'idle') return;
    setTranscript('');
    setRecogError(null);
    transcriptRef.current = '';
    accumulatedRef.current = '';
    shouldRestartRef.current = true;
    setState('listening');
    recognitionRef.current.start();
    startAudioAnalysis();
  }

  function stopListening() {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    stopAudioAnalysis();
  }

  function stopAll() {
    shouldRestartRef.current = false;
    recognitionRef.current?.abort();
    synthRef.current?.cancel();
    stopAudioAnalysis();
    accumulatedRef.current = '';
    setState('idle');
    setTranscript('');
    transcriptRef.current = '';
  }

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'it-IT';
    utt.rate = 0.95;
    utt.pitch = 1.0;
    const voices = synthRef.current.getVoices();
    const itVoice = voices.find(v => v.lang.startsWith('it')) ?? voices.find(v => v.lang.startsWith('en'));
    if (itVoice) utt.voice = itVoice;
    utt.onstart = () => setState('speaking');
    utt.onend   = () => setState('idle');
    synthRef.current.speak(utt);
  }, []);

  const handleCommitResult = useCallback((result: CommitResultDto) => {
    // Save daily goals to localStorage for career page
    const today = new Date().toISOString().split('T')[0];
    result.goals_created.forEach(g => {
      saveDailyGoal({
        id: g.id,
        title: g.title,
        area: g.area,
        priority: 'medium',
        date: today,
        completedAt: null,
        sessionId: Date.now().toString(),
        dbGoalId: g.id,
      });
    });

    // Trigger XP floaters
    const rewards = result.rewards_granted.map((r, i) => ({
      id: `${Date.now()}-${i}`,
      icon: r.icon,
      label: `+${r.xp} XP`,
      color: AREA_COLOR[r.area] ?? '#9333EA',
      x: 20 + Math.random() * 60,
    }));
    if (rewards.length > 0) triggerRewards(rewards);

    // Level up banner
    if (result.leveled_up) {
      setCommitResult(result);
      setShowLevelUp(true);
    }
  }, [triggerRewards]);

  const handleSend = useCallback(async (text: string) => {
    setState('thinking');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setTranscript('');
    transcriptRef.current = '';

    const historySnapshot = historyRef.current;

    try {
      // Analyze the full transcript
      if (text.length > 20) {
        const analysisRes = await fetch('/api/proxy/claude/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: text }),
        });
        if (analysisRes.ok) {
          const a: TranscriptAnalysisDto = await analysisRes.json();
          setAnalysis(a);
          setRevealTranscript(text);
          saveVoiceSession({
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            transcript: text,
            analysis: a,
            coachingMessage: a.coaching_message,
          });
          updateAreaStreaks(a);
          setShowReveal(true);
        }
      }

      // Get Claude's coaching reply
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

      const reply = fullReply || 'Scusa, non ho ricevuto risposta dal backend.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      speak(stripMarkdown(reply));
    } catch {
      const err = 'Errore di connessione al backend.';
      setMessages(prev => [...prev, { role: 'assistant', content: err }]);
      speak(err);
      setState('idle');
    }
  }, [speak]);

  useEffect(() => { handleSendRef.current = handleSend; }, [handleSend]);

  const stateColor = useMemo(() => ({
    idle: '#9333EA', listening: '#C9A84C', thinking: '#C084FC', speaking: '#86EFAC',
  }[state]), [state]);

  const stateLabel = {
    idle: 'Hold SPACE or tap',
    listening: 'Listening… release SPACE',
    thinking: 'Thinking…',
    speaking: 'Speaking…',
  }[state];

  if (!supported) return null;

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 lg:bottom-6 lg:right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #3B0D7A, #9333EA)',
          boxShadow: '0 0 24px rgba(147,51,234,0.5), 0 4px 20px rgba(0,0,0,0.4)',
          border: '1px solid rgba(147,51,234,0.5)',
        }}
        whileHover={{ scale: 1.1, boxShadow: '0 0 36px rgba(147,51,234,0.7)' }}
        whileTap={{ scale: 0.92 }}
        animate={state === 'listening' ? {
          boxShadow: [
            '0 0 24px rgba(201,168,76,0.5)',
            '0 0 48px rgba(201,168,76,0.8)',
            '0 0 24px rgba(201,168,76,0.5)',
          ],
        } : {}}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        <Mic size={22} color="#fff" />
      </motion.button>

      {/* Voice modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-4"
            style={{ background: 'rgba(5,2,16,0.85)', backdropFilter: 'blur(16px)' }}
            onClick={e => { if (e.target === e.currentTarget) { stopAll(); setOpen(false); } }}
          >
            <motion.div
              initial={{ y: 60, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 60, scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="w-full max-w-md rounded-3xl overflow-hidden"
              style={{
                background: 'rgba(17,8,48,0.95)',
                border: '1px solid rgba(147,51,234,0.25)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-2">
                <div>
                  <h2 className="font-syne font-extrabold text-lg" style={{ color: '#E2E8F0' }}>
                    Voice Mode
                  </h2>
                  <p className="text-xs font-inter mt-0.5" style={{ color: 'rgba(226,232,240,0.4)' }}>
                    SPACE to talk · ESC to close
                  </p>
                </div>
                <button
                  onClick={() => { stopAll(); setOpen(false); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(226,232,240,0.6)' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Orb */}
              <div className="flex flex-col items-center py-8 gap-4">
                <div className="relative">
                  {state !== 'idle' && [1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full"
                      style={{ border: `1px solid ${stateColor}` }}
                      animate={{ scale: [1, 1 + i * 0.35], opacity: [0.6, 0] }}
                      transition={{ duration: 1.8, delay: i * 0.4, repeat: Infinity, ease: 'easeOut' }}
                    />
                  ))}
                  <motion.button
                    onClick={state === 'idle' ? startListening : (state === 'listening' ? stopListening : undefined)}
                    className="relative w-28 h-28 rounded-full flex items-center justify-center"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, ${stateColor}60, ${stateColor}20)`,
                      border: `2px solid ${stateColor}`,
                      boxShadow: `0 0 40px ${stateColor}50, inset 0 0 20px ${stateColor}10`,
                    }}
                    animate={state === 'thinking' ? { rotate: 360 } : {}}
                    transition={state === 'thinking' ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                  >
                    {state === 'idle'      && <Mic size={36} color={stateColor} />}
                    {state === 'listening' && <Mic size={36} color={stateColor} />}
                    {state === 'thinking'  && <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}><Volume2 size={32} color={stateColor} /></motion.div>}
                    {state === 'speaking'  && <Volume2 size={36} color={stateColor} />}
                  </motion.button>
                </div>

                <p className="text-xs font-inter font-semibold tracking-widest uppercase" style={{ color: stateColor }}>
                  {stateLabel}
                </p>

                <div className="flex items-center gap-[2px] h-14">
                  {bars.map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-1 rounded-full"
                      animate={{ height: state === 'listening' || state === 'speaking' ? h : 3 }}
                      transition={{ duration: 0.05 }}
                      style={{
                        background: state === 'listening'
                          ? `rgba(201,168,76,${0.3 + (h / 60) * 0.7})`
                          : state === 'speaking'
                          ? `rgba(134,239,172,${0.3 + (h / 60) * 0.7})`
                          : 'rgba(255,255,255,0.08)',
                        minHeight: 3,
                      }}
                    />
                  ))}
                </div>

                {recogError && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full px-4"
                  >
                    <div className="w-full rounded-xl px-3 py-2 text-xs font-inter text-center"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
                      Errore microfono: <strong>{recogError}</strong>
                      {recogError === 'not-allowed' && ' — controlla i permessi del browser'}
                      {recogError === 'network' && ' — richiede connessione (Google STT)'}
                      {recogError === 'no-speech' && ' — nessun audio rilevato'}
                    </div>
                  </motion.div>
                )}

                {(state === 'listening' || transcript) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full px-4"
                  >
                    <div
                      className="w-full rounded-2xl px-4 py-3 min-h-[60px] max-h-40 overflow-y-auto"
                      style={{
                        background: 'rgba(201,168,76,0.06)',
                        border: '1px solid rgba(201,168,76,0.25)',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(201,168,76,0.2) transparent',
                      }}
                    >
                      {transcript ? (
                        <p className="text-sm font-inter leading-relaxed" style={{ color: '#E2E8F0' }}>
                          {transcript}
                          <span
                            className="inline-block w-0.5 h-3.5 ml-0.5 align-middle rounded-full"
                            style={{ background: '#C9A84C', animation: 'pulse 1s ease-in-out infinite' }}
                          />
                        </p>
                      ) : (
                        <p className="text-xs font-inter" style={{ color: 'rgba(201,168,76,0.35)' }}>
                          Inizia a parlare…
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Messages */}
              {messages.length > 0 && (
                <div
                  className="mx-4 mb-5 rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="max-h-56 overflow-y-auto p-4 space-y-2.5"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(147,51,234,0.2) transparent' }}>
                    {messages.slice(-8).map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className="max-w-[88%] px-3 py-2.5 rounded-xl text-xs font-inter"
                          style={m.role === 'user' ? {
                            background: 'linear-gradient(135deg, rgba(107,33,168,0.5), rgba(59,13,122,0.5))',
                            border: '1px solid rgba(147,51,234,0.3)',
                            color: '#E2E8F0',
                          } : {
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            color: '#E2E8F0',
                          }}
                        >
                          {m.role === 'assistant'
                            ? <VoiceMessage content={m.content} />
                            : <p className="leading-relaxed">{m.content}</p>
                          }
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript reveal overlay */}
      <AnimatePresence>
        {showReveal && analysis && (
          <TranscriptReveal
            transcript={revealTranscript}
            analysis={analysis}
            onClose={() => setShowReveal(false)}
            onCommit={handleCommitResult}
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
