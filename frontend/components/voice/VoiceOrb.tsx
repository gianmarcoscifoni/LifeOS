'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Volume2, X } from 'lucide-react';

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

// Web Speech API types (not in all TS lib configs)
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
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }
}

interface Message { role: 'user' | 'assistant'; text: string }

const WAVEFORM_BARS = 24;

export function VoiceOrb() {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [bars, setBars] = useState<number[]>(Array(WAVEFORM_BARS).fill(2));
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const recognition = new SR();
    recognition.lang = 'it-IT';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const result = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      setTranscript(result);
    };

    recognition.onend = () => {
      stopAudioAnalysis();
      if (transcript.trim()) {
        handleSend(transcript.trim());
      } else {
        setState('idle');
      }
    };

    recognitionRef.current = recognition;
    synthRef.current = window.speechSynthesis;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global keyboard shortcut: Space to toggle listening
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
      analyser.fftSize = 64;
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
    setState('listening');
    recognitionRef.current.start();
    startAudioAnalysis();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    stopAudioAnalysis();
  }

  function stopAll() {
    recognitionRef.current?.abort();
    synthRef.current?.cancel();
    stopAudioAnalysis();
    setState('idle');
    setTranscript('');
  }

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'it-IT';
    utt.rate = 0.95;
    utt.pitch = 1.0;

    // Pick an Italian voice if available
    const voices = synthRef.current.getVoices();
    const itVoice = voices.find(v => v.lang.startsWith('it')) ?? voices.find(v => v.lang.startsWith('en'));
    if (itVoice) utt.voice = itVoice;

    utt.onstart = () => setState('speaking');
    utt.onend   = () => setState('idle');
    synthRef.current.speak(utt);
  }, []);

  async function handleSend(text: string) {
    setState('thinking');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setTranscript('');

    try {
      const res = await fetch('/api/proxy/claude/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: [] }),
      });

      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullReply = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed?.delta?.text ?? parsed?.text ?? '';
              if (delta) fullReply += delta;
            } catch { /* chunk */ }
          }
        }
      }

      const reply = fullReply || 'Scusa, non ho ricevuto risposta dal backend.';
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      speak(reply);

    } catch {
      const err = 'Errore di connessione al backend.';
      setMessages(prev => [...prev, { role: 'assistant', text: err }]);
      speak(err);
    }
  }

  const stateColor = {
    idle: '#9333EA',
    listening: '#C9A84C',
    thinking: '#C084FC',
    speaking: '#86EFAC',
  }[state];

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
        onClick={() => { setOpen(true); }}
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
                  {/* Outer pulse rings */}
                  {state !== 'idle' && [1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full"
                      style={{ border: `1px solid ${stateColor}` }}
                      animate={{ scale: [1, 1 + i * 0.35], opacity: [0.6, 0] }}
                      transition={{ duration: 1.8, delay: i * 0.4, repeat: Infinity, ease: 'easeOut' }}
                    />
                  ))}

                  {/* Main orb button */}
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

                {/* State label */}
                <p className="text-xs font-inter font-semibold tracking-widest uppercase" style={{ color: stateColor }}>
                  {stateLabel}
                </p>

                {/* Waveform — live bars when listening/speaking */}
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

                {/* Live transcript */}
                {transcript && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm font-inter text-center px-6 max-w-xs"
                    style={{ color: 'rgba(226,232,240,0.7)' }}
                  >
                    {transcript}
                  </motion.p>
                )}
              </div>

              {/* Messages */}
              {messages.length > 0 && (
                <div
                  className="mx-4 mb-5 rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="max-h-52 overflow-y-auto p-4 space-y-3">
                    {messages.slice(-6).map((m, i) => (
                      <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className="max-w-[85%] px-3 py-2 rounded-xl text-xs font-inter leading-relaxed"
                          style={m.role === 'user' ? {
                            background: 'rgba(147,51,234,0.25)',
                            border: '1px solid rgba(147,51,234,0.3)',
                            color: '#E2E8F0',
                          } : {
                            background: 'rgba(134,239,172,0.1)',
                            border: '1px solid rgba(134,239,172,0.2)',
                            color: '#86EFAC',
                          }}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
