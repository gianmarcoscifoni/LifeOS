// Transcript analysis types (mirrors backend TranscriptAnalysisDto)
export interface TopicDto {
  text: string;
  area: string;
  icon: string;
  confidence: number;
}

export interface GoalSuggestionDto {
  title: string;
  area: string;
  priority: string;
  due_hint: string | null;
}

export interface TranscriptAnalysisDto {
  keywords: string[];
  topics: TopicDto[];
  goals: GoalSuggestionDto[];
  mood: string;
  gratitude: string[];
  coaching_message: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
const API_KEY  = process.env.NEXT_PUBLIC_API_KEY  ?? '';

// Import lazily to avoid circular deps — store is client-only
function getLoadingStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useUiStore } = require('./store') as typeof import('./store');
  return useUiStore.getState();
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { startLoading, stopLoading } = getLoadingStore();
  startLoading();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'X-Api-Key': API_KEY } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API ${res.status}: ${text || res.statusText}`);
    }
    return res.json() as Promise<T>;
  } finally {
    stopLoading();
  }
}

export function apiStream(path: string, body: unknown, onChunk: (chunk: string) => void): () => void {
  const controller = new AbortController();
  (async () => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'X-Api-Key': API_KEY } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice('data: '.length);
        if (data === '[DONE]') return;
        onChunk(data);
      }
    }
  })().catch(() => {});
  return () => controller.abort();
}
