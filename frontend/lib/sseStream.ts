/**
 * Parse an SSE stream and yield text deltas.
 * Handles both plain-text chunks (backend wraps each Claude delta in `data: <text>\n\n`)
 * and JSON-wrapped deltas. Multi-line chunks are preserved because we split on `\n\n`
 * (full SSE events) rather than `\n` (individual lines).
 */
export async function* readSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Split on double-newline = SSE event boundary
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';               // last (possibly incomplete) event

    for (const event of events) {
      // An SSE event can have multiple `field: value` lines
      for (const line of event.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);            // preserve internal whitespace/newlines
        if (data.trim() === '[DONE]') continue;

        let delta = '';
        try {
          const parsed = JSON.parse(data);
          delta = parsed?.delta?.text ?? parsed?.text ?? '';
        } catch {
          delta = data;                        // plain text chunk from backend
        }
        if (delta) yield delta;
      }
    }
  }
}
