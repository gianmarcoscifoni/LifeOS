import type { TranscriptAnalysisDto } from './api';

export interface VoiceSessionRecord {
  id: string;
  date: string;         // YYYY-MM-DD
  timestamp: string;    // ISO full datetime
  transcript: string;
  analysis: TranscriptAnalysisDto;
  coachingMessage: string;
}

export interface AreaStreak {
  area: string;
  currentStreak: number;
  lastMentionedDate: string; // YYYY-MM-DD
}

export const VOICE_SESSIONS_KEY = 'lifeos_voice_sessions';
export const AREA_STREAKS_KEY   = 'lifeos_area_streaks';

export function loadVoiceSessions(): VoiceSessionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(VOICE_SESSIONS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveVoiceSession(record: VoiceSessionRecord): void {
  const sessions = loadVoiceSessions();
  const updated = [record, ...sessions].slice(0, 90); // keep 90 days max
  localStorage.setItem(VOICE_SESSIONS_KEY, JSON.stringify(updated));
}

export function loadAreaStreaks(): AreaStreak[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(AREA_STREAKS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function updateAreaStreaks(analysis: TranscriptAnalysisDto): AreaStreak[] {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

  const areasToday = new Set(analysis.topics.map(t => t.area));
  const streaks = loadAreaStreaks();

  // Update existing streaks
  const updatedAreas = new Set<string>();
  const updated = streaks.map(s => {
    if (!areasToday.has(s.area)) return s;
    updatedAreas.add(s.area);

    if (s.lastMentionedDate === today) return s; // already updated today
    const newStreak = s.lastMentionedDate === yesterday ? s.currentStreak + 1 : 1;
    return { ...s, currentStreak: newStreak, lastMentionedDate: today };
  });

  // Add newly encountered areas
  for (const area of areasToday) {
    if (!updatedAreas.has(area)) {
      updated.push({ area, currentStreak: 1, lastMentionedDate: today });
    }
  }

  localStorage.setItem(AREA_STREAKS_KEY, JSON.stringify(updated));
  return updated;
}
