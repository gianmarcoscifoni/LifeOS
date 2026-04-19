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
const AUTO_SEND_PAUSE_MS = 2000;

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
}

export function useVoiceAudio({
  onTranscriptReady,
  onInterim,
  onError,
}: UseVoiceAudioOptions): UseVoiceAudioReturn {
  const [bars, setBars]         = useState<number[]>(Array(WAVEFORM_BARS).fill(2));
  const [supported, setSupported] = useState(true);
  const [recogError, setRecogError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Refs — never trigger re-renders
  const recogRef    = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef    = useRef<SpeechSynthesis | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const animRef     = useRef<number>(0);

  /** Accumulated final transcript text for the current session */
  const accRef      = useRef('');
  /** True while the user intends to keep recording */
  const activeRef   = useRef(false);
  /** Timer handle for auto-send after silence */
  const silenceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable callback refs — updated every render, safe to call from stale closures
  const onReadyRef   = useRef(onTranscriptReady);
  const onInterimRef = useRef(onInterim);
  const onErrorRef   = useRef(onError);
  useEffect(() => { onReadyRef.current   = onTranscriptReady; }, [onTranscriptReady]);
  useEffect(() => { onInterimRef.current = onInterim; },        [onInterim]);
  useEffect(() => { onErrorRef.current   = onError; },          [onError]);

  // ── Helper: flush accumulated text and end the session ──────────────────

  function doFlush() {
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
    activeRef.current = false;        // tell onend to send, not restart
    recogRef.current?.stop();         // → fires onend
  }

  // ── Helper: stop the audio-analysis stream + animation ──────────────────

  function stopAnalysis() {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    analyserRef.current = null;
    streamRef.current   = null;
    audioCtxRef.current = null;
    setBars(Array(WAVEFORM_BARS).fill(2));
  }

  // ── Setup SpeechRecognition once on mount ────────────────────────────────

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const r = new SR();
    r.lang            = 'en-US';
    r.interimResults  = true;
    r.continuous      = true;

    r.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          accRef.current += (accRef.current ? ' ' : '') + res[0].transcript.trim();
          // Re-arm silence timer after every final chunk
          if (silenceRef.current) clearTimeout(silenceRef.current);
          if (activeRef.current) {
            silenceRef.current = setTimeout(doFlush, AUTO_SEND_PAUSE_MS);
          }
        } else {
          interim += res[0].transcript;
        }
      }

      // Live display: finals + current interim
      const live = accRef.current
        + (interim ? (accRef.current ? ' ' : '') + interim : '');
      onInterimRef.current(live);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r as any).onerror = (e: { error: string }) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return; // normal lifecycle
      console.warn('[SpeechRecognition] error:', e.error);
      setRecogError(e.error);
      onErrorRef.current?.(e.error);
      activeRef.current = false;
      setIsListening(false);
      stopAnalysis();
    };

    r.onend = () => {
      if (activeRef.current) {
        // Still recording — restart to keep continuous session alive
        try { r.start(); } catch { /* already starting */ }
        return;
      }
      // Session ended intentionally — emit accumulated text
      stopAnalysis();
      setIsListening(false);
      const full = accRef.current.trim();
      accRef.current = '';
      if (full.length > 0) onReadyRef.current(full);
    };

    recogRef.current = r;
    synthRef.current = window.speechSynthesis;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Audio analysis for waveform bars ─────────────────────────────────────

  async function startAnalysis() {
    try {
      // Prefer built-in/internal mic over USB/Bluetooth
      let deviceId: string | undefined;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        const builtin = mics.find(d =>
          /built.?in|internal|microfono integrato|macbook|integrated/i.test(d.label)
        );
        deviceId = builtin?.deviceId;
      } catch { /* enumerateDevices not available */ }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src      = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      src.connect(analyser);
      analyserRef.current = analyser;
      animateBars();
    } catch { /* mic blocked — recognition still works via its own stream */ }
  }

  function animateBars() {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    setBars(Array.from({ length: WAVEFORM_BARS }, (_, i) => {
      const val = data[Math.floor((i / WAVEFORM_BARS) * data.length)] ?? 0;
      return Math.max(2, (val / 255) * 60);
    }));
    animRef.current = requestAnimationFrame(animateBars);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!recogRef.current) return;
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
    accRef.current    = '';
    activeRef.current = true;
    setRecogError(null);
    setIsListening(true);
    try { recogRef.current.start(); } catch { /* already running */ }
    startAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Manual stop — sends whatever was accumulated */
  const stopListening = useCallback(() => {
    doFlush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Hard cancel — nothing is sent */
  const stopAll = useCallback(() => {
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
    activeRef.current = false;
    accRef.current    = '';
    setIsListening(false);
    recogRef.current?.abort();
    synthRef.current?.cancel();
    stopAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preferred female English voices in priority order (Apple + Google)
  const FEMALE_VOICES = ['Samantha', 'Ava', 'Allison', 'Victoria', 'Karen', 'Moira', 'Fiona', 'Tessa', 'Zoe', 'Susan'];

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utt  = new SpeechSynthesisUtterance(text);
    utt.lang   = 'en-US';
    utt.rate   = 1.0;
    utt.pitch  = 1.05;

    const voices   = synthRef.current.getVoices();
    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    // Pick the first preferred female voice available
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

  return {
    bars, supported, recogError, isListening,
    startListening, stopListening, stopAll, speak, cancelSpeech,
  };
}
