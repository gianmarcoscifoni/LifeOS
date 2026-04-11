const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
const API_KEY  = process.env.NEXT_PUBLIC_API_KEY  ?? '';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
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
