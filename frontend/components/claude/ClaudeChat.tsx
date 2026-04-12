'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RefreshCw, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message { role: 'user' | 'assistant'; content: string }

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => (
          <strong style={{ color: '#C084FC', fontWeight: 700 }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em style={{ color: 'rgba(226,232,240,0.7)', fontStyle: 'italic' }}>{children}</em>
        ),
        ul: ({ children }) => <ul className="mt-1 mb-2 space-y-1 pl-1">{children}</ul>,
        ol: ({ children }) => <ol className="mt-1 mb-2 space-y-1 pl-1 list-decimal list-inside">{children}</ol>,
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-sm">
            <span style={{ color: '#9333EA', marginTop: 2 }}>▸</span>
            <span>{children}</span>
          </li>
        ),
        h1: ({ children }) => (
          <h1 className="text-lg font-black font-syne mb-2 mt-1" style={{ color: '#C084FC' }}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold font-syne mb-1.5 mt-1" style={{ color: '#C084FC' }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold mb-1 mt-1" style={{ color: 'rgba(192,132,252,0.8)' }}>{children}</h3>
        ),
        code: ({ children }) => (
          <code
            className="px-1.5 py-0.5 rounded text-xs font-mono"
            style={{ background: 'rgba(147,51,234,0.15)', color: '#C084FC' }}
          >
            {children}
          </code>
        ),
        blockquote: ({ children }) => (
          <blockquote
            className="pl-3 my-2 italic"
            style={{ borderLeft: '2px solid rgba(147,51,234,0.5)', color: 'rgba(226,232,240,0.6)' }}
          >
            {children}
          </blockquote>
        ),
        hr: () => (
          <hr className="my-3" style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)' }} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#9333EA' }}
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export function ClaudeChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showTyping]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    const history: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(history);
    setStreaming(true);
    setShowTyping(true);

    try {
      const res = await fetch('/api/proxy/claude/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      if (!res.ok || !res.body) throw new Error('Stream error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let started = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          let delta = '';
          try {
            const parsed = JSON.parse(data);
            delta = parsed?.delta?.text ?? parsed?.text ?? '';
          } catch {
            delta = data;
          }

          if (delta) {
            if (!started) {
              setShowTyping(false);
              started = true;
              setMessages(prev => [...prev, { role: 'assistant', content: delta }]);
            } else {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant')
                  updated[updated.length - 1] = { ...last, content: last.content + delta };
                return updated;
              });
            }
          }
        }
      }
    } catch {
      setShowTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Errore di connessione al backend.',
      }]);
    } finally {
      setStreaming(false);
      setShowTyping(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function triggerWeeklyReview() {
    setWeeklyLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: '📊 Genera la mia weekly review' }]);
    setShowTyping(true);
    try {
      const res = await fetch('/api/proxy/claude/weekly-review', { method: 'POST' });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const text = data.review ?? data.Review ?? '(nessun contenuto)';
      setShowTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `## 📅 Weekly Review\n\n${text}\n\n---\n✅ Salvata nel Journal.`,
      }]);
    } catch {
      setShowTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Errore nella generazione della weekly review. Riprova.',
      }]);
    } finally {
      setWeeklyLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2 scrollbar-thin"
        style={{ scrollbarColor: 'rgba(147,51,234,0.2) transparent' }}>

        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-10 space-y-3"
          >
            <motion.div
              className="text-5xl mx-auto"
              animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              🌙
            </motion.div>
            <p className="font-syne font-black text-lg"
              style={{
                background: 'linear-gradient(135deg, #C084FC, #E2E8F0)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
              Il tuo consigliere AI 🤌
            </p>
            <p className="text-sm" style={{ color: 'rgba(226,232,240,0.35)' }}>
              Chiedimi di obiettivi, abitudini, brand o finanze.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {[
                '🎯 Definisci i miei obiettivi',
                '💪 Imposta le prime habit',
                '💰 Analisi finanziaria',
                '🧠 Quale skill tree prima?',
              ].map(suggestion => (
                <motion.button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium"
                  style={{
                    background: 'rgba(147,51,234,0.08)',
                    border: '1px solid rgba(147,51,234,0.2)',
                    color: 'rgba(192,132,252,0.8)',
                  }}
                  whileHover={{ scale: 1.04, borderColor: 'rgba(147,51,234,0.5)' }}
                  whileTap={{ scale: 0.96 }}
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
              style={m.role === 'user' ? {
                background: 'linear-gradient(135deg, rgba(107,33,168,0.7), rgba(59,13,122,0.7))',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(147,51,234,0.35)',
                color: '#E2E8F0',
                boxShadow: '0 4px 20px rgba(147,51,234,0.15)',
              } : {
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#E2E8F0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              }}
            >
              {m.role === 'assistant'
                ? <MarkdownMessage content={m.content} />
                : <p className="leading-relaxed">{m.content}</p>
              }
              {/* Streaming cursor on last assistant message */}
              {streaming && i === messages.length - 1 && m.role === 'assistant' && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  style={{ color: '#9333EA', marginLeft: 1 }}
                >
                  ▋
                </motion.span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing dots while waiting for first chunk */}
        <AnimatePresence>
          {showTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="mr-auto rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <TypingDots />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Weekly review button */}
      <div className="flex justify-end">
        <motion.button
          onClick={triggerWeeklyReview}
          disabled={weeklyLoading || streaming}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.22)',
            color: 'rgba(201,168,76,0.75)',
          }}
          whileHover={{ scale: 1.04, borderColor: 'rgba(201,168,76,0.5)' }}
          whileTap={{ scale: 0.96 }}
        >
          <RefreshCw size={11} className={weeklyLoading ? 'animate-spin' : ''} />
          {weeklyLoading ? 'Generando…' : 'Weekly Review'}
        </motion.button>
      </div>

      {/* Input row */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Scrivi un messaggio…"
            disabled={streaming}
            className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#E2E8F0',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'rgba(147,51,234,0.5)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(147,51,234,0.12)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
        <motion.button
          onClick={sendMessage}
          disabled={streaming || !input.trim()}
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: !streaming && input.trim()
              ? 'linear-gradient(135deg, #6B21A8, #9333EA)'
              : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(147,51,234,0.3)',
            color: !streaming && input.trim() ? '#fff' : 'rgba(226,232,240,0.25)',
            boxShadow: !streaming && input.trim() ? '0 0 20px rgba(147,51,234,0.4)' : 'none',
          }}
          whileTap={!streaming && input.trim() ? { scale: 0.88 } : {}}
          whileHover={!streaming && input.trim() ? { scale: 1.06, boxShadow: '0 0 28px rgba(147,51,234,0.6)' } : {}}
        >
          {streaming
            ? <Sparkles size={14} className="animate-pulse" />
            : <Send size={14} />
          }
        </motion.button>
      </div>
    </div>
  );
}
