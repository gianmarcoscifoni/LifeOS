'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

// ── Web Speech API types ───────────────────────────────────────────────────

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

const WAVEFORM_BARS = 48;
/** After a final result, if silence lasts this long → auto-send */
const AUTO_SEND_PAUSE_MS = 5000;

export interface UseVoiceAudioOptions {
  onTranscriptReady: (text: string) => void;
  onInterim: (text: string) => void;
  onError?: (error: string) => void;
}

export interface UseVoiceAudioReturn {
  bars: number[];
  supported: boolean;
  recogError: string | null;
  startListening: () => void;
  stopListening: () => void;
  stopAll: () => void;
  speak: (text: string, onEnd?: () => void) => void;
  cancelSpeech: () => void;
  /** True while a recording session is active */
  isListening: boolean;
  /** 0–1 countdown to auto-send after silence (0 = not counting) */
  silenceProgress: number;
  /** 0–1 current microphone amplitude (even during speaking phase when ambient monitor is on) */
  audioLevel: number;
  /** Start microphone analyser without speech recognition (for VAD during TTS) */
  startAmbientMonitor: () => void;
  /** Stop ambient analyser (only when not actively recording) */
  stopAmbientMonitor: () => void;
}

export function useVoiceAudio({
  onTranscriptReady,
  onInterim,
  onError,
}: UseVoiceAudioOptions): UseVoiceAudioReturn {
  const [bars, setBars]             = useState<number[]>(Array(WAVEFORM_BARS).fill(2));
  const [supported, setSupported]   = useState(true);
  const [recogError, setRecogError] = useState<string | null>(null);
  const [isListening, setIsListening]   = useState(false);
  const [silenceProgress, setSilenceProgress] = useState(0);

  const recogRef    = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef    = useRef<SpeechSynthesis | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const animRef     = useRef<number>(0);

  const accRef     = useRef('');
  const activeRef  = useRef(false);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceStartRef    = useRef<number>(0);
  const barsRef = useRef<number[]>(Array(WAVEFORM_BARS).fill(2));

  const onReadyRef   = useRef(onTranscriptReady);
  const onInterimRef = useRef(onInterim);
  const onErrorRef   = useRef(onError);
  useEffect(() => { onReadyRef.current   = onTranscriptReady; }, [onTranscriptReady]);
  useEffect(() => { onInterimRef.current = onInterim; },        [onInterim]);
  useEffect(() => { onErrorRef.current   = onError; },          [onError]);

  function clearSilenceTimer() {
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
    if (silenceIntervalRef.current) { clearInterval(silenceIntervalRef.current); silenceIntervalRef.current = null; }
    setSilenceProgress(0);
  }

  function armSilenceTimer() {
    clearSilenceTimer();
    if (!activeRef.current) return;
    silenceStartRef.current = Date.now();
    silenceRef.current = setTimeout(doFlush, AUTO_SEND_PAUSE_MS);
    silenceIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - silenceStartRef.current;
      setSilenceProgress(Math.min(1, elapsed / AUTO_SEND_PAUSE_MS));
      if (elapsed >= AUTO_SEND_PAUSE_MS) {
        clearInterval(silenceIntervalRef.current!);
        silenceIntervalRef.current = null;
      }
    }, 80);
  }

  function doFlush() {
    clearSilenceTimer();
    activeRef.current = false;
    recogRef.current?.stop();
  }

  function stopAnalysis() {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    analyserRef.current = null;
    streamRef.current   = null;
    audioCtxRef.current = null;
    barsRef.current = Array(WAVEFORM_BARS).fill(2);
    setBars(Array(WAVEFORM_BARS).fill(2));
  }

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const r = new SR();
    r.lang           = 'en-US';
    r.interimResults = true;
    r.continuous     = true;

    r.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          accRef.current += (accRef.current ? ' ' : '') + res[0].transcript.trim();
          armSilenceTimer();
        } else {
          interim += res[0].transcript;
        }
      }
      const live = accRef.current + (interim ? (accRef.current ? ' ' : '') + interim : '');
      onInterimRef.current(live);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r as any).onerror = (e: { error: string }) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      console.warn('[SpeechRecognition] error:', e.error);
      setRecogError(e.error);
      onErrorRef.current?.(e.error);
      activeRef.current = false;
      setIsListening(false);
      stopAnalysis();
    };

    r.onend = () => {
      if (activeRef.current) {
        try { r.start(); } catch { /* already starting */ }
        return;
      }
      stopAnalysis();
      setIsListening(false);
      clearSilenceTimer();
      const full = accRef.current.trim();
      accRef.current = '';
      if (full.length > 0) onReadyRef.current(full);
    };

    recogRef.current = r;
    synthRef.current = window.speechSynthesis;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startAnalysis() {
    if (analyserRef.current) return; // already running
    try {
      let deviceId: string | undefined;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics    = devices.filter(d => d.kind === 'audioinput');
        const builtin = mics.find(d =>
          /built.?in|internal|microfono integrato|macbook|integrated/i.test(d.label)
        );
        deviceId = builtin?.deviceId;
      } catch { /* enumerateDevices not available */ }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      streamRef.current = stream;
      const ctx      = new AudioContext();
      audioCtxRef.current = ctx;
      const src      = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      src.connect(analyser);
      analyserRef.current = analyser;
      animateBars();
    } catch { /* mic blocked */ }
  }

  function animateBars() {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const next = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
      const val = data[Math.floor((i / WAVEFORM_BARS) * data.length)] ?? 0;
      return Math.max(2, (val / 255) * 60);
    });
    barsRef.current = next;
    setBars(next);
    animRef.current = requestAnimationFrame(animateBars);
  }

  const startListening = useCallback(() => {
    if (!recogRef.current) return;
    clearSilenceTimer();
    accRef.current    = '';
    activeRef.current = true;
    setRecogError(null);
    setIsListening(true);
    try { recogRef.current.start(); } catch { /* already running */ }
    startAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopListening = useCallback(() => {
    doFlush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAll = useCallback(() => {
    clearSilenceTimer();
    activeRef.current = false;
    accRef.current    = '';
    setIsListening(false);
    recogRef.current?.abort();
    synthRef.current?.cancel();
    stopAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAmbientMonitor = useCallback(() => {
    startAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAmbientMonitor = useCallback(() => {
    if (!activeRef.current) stopAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const FEMALE_VOICES = ['Samantha', 'Ava', 'Allison', 'Victoria', 'Karen', 'Moira', 'Fiona', 'Tessa', 'Zoe', 'Susan'];

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utt  = new SpeechSynthesisUtterance(text);
    utt.lang   = 'en-US';
    utt.rate   = 1.0;
    utt.pitch  = 1.05;
    const voices    = synthRef.current.getVoices();
    const enVoices  = voices.filter(v => v.lang.startsWith('en'));
    const femaleVoice = FEMALE_VOICES.reduce<SpeechSynthesisVoice | null>(
      (found, name) => found ?? (enVoices.find(v => v.name.includes(name)) ?? null),
      null,
    );
    const selected = femaleVoice ?? enVoices.find(v => v.default) ?? enVoices[0];
    if (selected) utt.voice = selected;
    utt.onend = () => onEnd?.();
    synthRef.current.speak(utt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelSpeech = useCallback(() => { synthRef.current?.cancel(); }, []);

  // Compute audioLevel from current bars (0-1)
  const audioLevel = barsRef.current.reduce((s, b) => s + b, 0) / WAVEFORM_BARS / 60;

  return {
    bars, supported, recogError, isListening, silenceProgress, audioLevel,
    startListening, stopListening, stopAll, speak, cancelSpeech,
    startAmbientMonitor, stopAmbientMonitor,
  };
}
