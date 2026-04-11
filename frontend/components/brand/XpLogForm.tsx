'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { LevelUpEffect } from './LevelUpEffect';

const XP_ACTIONS = [
  { label: 'Publish LinkedIn post (+50 XP)',      value: 'Publish LinkedIn post' },
  { label: 'Publish Instagram post (+30 XP)',     value: 'Publish Instagram post' },
  { label: 'Publish Medium article (+80 XP)',     value: 'Publish Medium article' },
  { label: 'Publish GitHub project (+60 XP)',     value: 'Publish GitHub project' },
  { label: 'Complete online course (+100 XP)',    value: 'Complete online course' },
  { label: 'Attend networking event (+40 XP)',    value: 'Attend networking event' },
  { label: 'Complete habit streak (7d) (+70 XP)', value: 'Complete habit streak (7d)' },
  { label: 'Journal entry (+20 XP)',              value: 'Journal entry' },
  { label: 'Reach financial milestone (+90 XP)', value: 'Reach financial milestone' },
  { label: 'Complete career goal (+120 XP)',      value: 'Complete career goal' },
];

export function XpLogForm() {
  const [action, setAction] = useState(XP_ACTIONS[0].value);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ xpGained: number; leveledUp: boolean; newLevel?: number } | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/proxy/brand/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      });
      if (!res.ok) throw new Error('API error');
      setResult(await res.json());
      setNote('');
    } catch {
      setError('Failed to log XP — check backend connection');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '0.875rem',
    color: '#E2E8F0',
    padding: '10px 14px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
  };

  return (
    <div className="space-y-4 max-w-md">
      {result?.leveledUp && result.newLevel && (
        <LevelUpEffect newLevel={result.newLevel} onDismiss={() => setResult(null)} />
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(192,132,252,0.8)' }}>
            ACTION
          </label>
          <select
            value={action}
            onChange={e => setAction(e.target.value)}
            style={{ ...inputStyle, appearance: 'none' }}
          >
            {XP_ACTIONS.map(a => (
              <option key={a.value} value={a.value} style={{ background: '#110830' }}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: 'rgba(192,132,252,0.8)' }}>
            NOTE (optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="E.g. Published about AI trends..."
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(147,51,234,0.5)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          />
        </div>

        <motion.button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold"
          style={{
            background: loading ? 'rgba(147,51,234,0.2)' : 'linear-gradient(135deg, #6B21A8, #9333EA)',
            border: '1px solid rgba(147,51,234,0.4)',
            color: '#fff',
            boxShadow: loading ? 'none' : '0 0 20px rgba(147,51,234,0.4)',
          }}
          whileHover={!loading ? { scale: 1.02, boxShadow: '0 0 28px rgba(147,51,234,0.5)' } : {}}
          whileTap={!loading ? { scale: 0.97 } : {}}
        >
          <Zap size={15} />
          {loading ? 'Logging...' : 'Log XP'}
        </motion.button>
      </form>

      {result && !result.leveledUp && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{
            background: 'rgba(52,211,153,0.1)',
            border: '1px solid rgba(52,211,153,0.25)',
          }}
        >
          <Zap size={14} style={{ color: '#34D399' }} />
          <span className="text-sm font-bold" style={{ color: '#34D399' }}>
            +{result.xpGained} XP gained!
          </span>
        </motion.div>
      )}

      {error && (
        <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
      )}
    </div>
  );
}
