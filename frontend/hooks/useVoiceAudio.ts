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
}

export function useVoiceAudio({
  onTranscriptReady,
  onInterim,
  onError,
}: UseVoiceAudioOptions): UseVoiceAudioReturn {
  const [bars, setBars] = useState<number[]>(Array(WAVEFORM_BARS).fill(2));
  const [supported, setSupported] = useState(true);
  const [recogError, setRecogError] = useState<string | null>(null);

  const recognitionRef   = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef         = useRef<SpeechSynthesis | null>(null);
  const animFrameRef     = useRef<number>(0);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const accumulatedRef   = useRef('');
  const shouldRestartRef = useRef(false);

  // Stable refs to callbacks so recognition handler is never stale
  const onTranscriptReadyRef = useRef(onTranscriptReady);
  const onInterimRef         = useRef(onInterim);
  useEffect(() => { onTranscriptReadyRef.current = onTranscriptReady; }, [onTranscriptReady]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);

  // ── Setup SpeechRecognition once ───────────────────────────────────────

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
      onInterimRef.current(live);
    };

    (recognition as unknown as { onerror: (e: { error: string }) => void }).onerror = (e: { error: string }) => {
      if (e.error === 'no-speech') return; // normal timeout, onend will restart
      setRecogError(e.error);
      onError?.(e.error);
      shouldRestartRef.current = false;
      stopAudioAnalysis();
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try { recognition.start(); } catch { /* already starting */ }
        return;
      }
      stopAudioAnalysis();
      const full = accumulatedRef.current.trim();
      accumulatedRef.current = '';
      if (full.length > 0) {
        onTranscriptReadyRef.current(full);
      }
    };

    recognitionRef.current = recognition;
    synthRef.current = window.speechSynthesis;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Audio analysis for waveform ────────────────────────────────────────

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
    streamRef.current = null;
    setBars(Array(WAVEFORM_BARS).fill(2));
  }

  // ── Public controls ────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setRecogError(null);
    accumulatedRef.current = '';
    shouldRestartRef.current = true;
    recognitionRef.current.start();
    startAudioAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    stopAudioAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAll = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.abort();
    synthRef.current?.cancel();
    stopAudioAnalysis();
    accumulatedRef.current = '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'it-IT';
    utt.rate = 0.95;
    utt.pitch = 1.0;
    const voices = synthRef.current.getVoices();
    const itVoice = voices.find(v => v.lang.startsWith('it')) ?? voices.find(v => v.lang.startsWith('en'));
    if (itVoice) utt.voice = itVoice;
    utt.onend = () => onEnd?.();
    synthRef.current.speak(utt);
  }, []);

  const cancelSpeech = useCallback(() => {
    synthRef.current?.cancel();
  }, []);

  return { bars, supported, recogError, startListening, stopListening, stopAll, speak, cancelSpeech };
}
