'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message { role: 'user' | 'assistant'; content: string }

export function ClaudeChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    const history: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(history);
    setStreaming(true);
    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages([...history, assistantMsg]);

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
              if (delta) {
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === 'assistant')
                    updated[updated.length - 1] = { ...last, content: last.content + delta };
                  return updated;
                });
              }
            } catch { /* chunk */ }
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant' && last.content === '')
          updated[updated.length - 1] = { ...last, content: '⚠️ Errore di connessione al backend.' };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  async function triggerWeeklyReview() {
    setWeeklyLoading(true);
    try {
      await fetch('/api/proxy/claude/weekly-review', { method: 'POST' });
      setMessages(prev => [...prev, { role: 'assistant', content: '✅ Weekly review generata e salvata nel Journal!' }]);
    } catch { /* ignore */ }
    finally { setWeeklyLoading(false); }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-12 space-y-2"
          >
            <motion.p
              className="text-5xl"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              🌙
            </motion.p>
            <p className="font-semibold" style={{ color: 'rgba(226,232,240,0.7)' }}>
              Ciao! Sono il tuo consigliere AI.
            </p>
            <p className="text-sm" style={{ color: 'rgba(226,232,240,0.35)' }}>
              Chiedimi di obiettivi, abitudini, brand o finanze.
            </p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap', m.role === 'user' ? 'ml-auto' : 'mr-auto')}
              style={m.role === 'user' ? {
                background: 'linear-gradient(135deg, rgba(107,33,168,0.6), rgba(59,13,122,0.6))',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(147,51,234,0.3)',
                color: '#E2E8F0',
              } : {
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#E2E8F0',
              }}
            >
              {m.content}
              {streaming && i === messages.length - 1 && m.role === 'assistant' && m.content === '' && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ color: '#9333EA' }}
                >
                  ▋
                </motion.span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Weekly review */}
      <div className="flex justify-end">
        <motion.button
          onClick={triggerWeeklyReview}
          disabled={weeklyLoading || streaming}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.25)',
            color: 'rgba(201,168,76,0.8)',
          }}
          whileHover={{ scale: 1.04, borderColor: 'rgba(201,168,76,0.5)' }}
          whileTap={{ scale: 0.96 }}
        >
          <RefreshCw size={11} className={weeklyLoading ? 'animate-spin' : ''} />
          {weeklyLoading ? 'Generando...' : 'Weekly Review'}
        </motion.button>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Scrivi un messaggio..."
          disabled={streaming}
          className="flex-1 rounded-2xl px-4 py-3 text-sm focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#E2E8F0',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(147,51,234,0.5)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(147,51,234,0.15)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        <motion.button
          onClick={sendMessage}
          disabled={streaming || !input.trim()}
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: !streaming && input.trim()
              ? 'linear-gradient(135deg, #6B21A8, #9333EA)'
              : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(147,51,234,0.3)',
            color: !streaming && input.trim() ? '#fff' : 'rgba(226,232,240,0.3)',
            boxShadow: !streaming && input.trim() ? '0 0 16px rgba(147,51,234,0.4)' : 'none',
          }}
          whileTap={{ scale: 0.9 }}
          whileHover={!streaming && input.trim() ? { scale: 1.05, boxShadow: '0 0 24px rgba(147,51,234,0.5)' } : {}}
        >
          <Send size={16} />
        </motion.button>
      </div>
    </div>
  );
}
