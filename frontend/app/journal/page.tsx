'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MoodChart } from '@/components/journal/MoodChart';
import { PageVoiceEntry } from '@/components/voice/PageVoiceEntry';

interface JournalEntry {
  id: string;
  title?: string;
  content: string;
  mood?: number;
  tags: string[];
  source: string;
  createdAt: string;
}

interface MoodPoint { date: string; mood: number }

const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '😊', 5: '😄' };
const MOOD_COLOR: Record<number, string> = {
  1: '#EF4444', 2: '#F97316', 3: '#EAB308', 4: '#22C55E', 5: '#10B981',
};

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 110, damping: 16 } },
};

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [moodTrend, setMoodTrend] = useState<MoodPoint[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/proxy/journal').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/proxy/journal/mood-trend').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([e, m]) => { setEntries(e); setMoodTrend(m); });
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-black tracking-tight"
        style={{
          background: 'linear-gradient(135deg, #A78BFA 0%, #E2E8F0 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Journal
      </motion.h1>

      <PageVoiceEntry domain="journal" />

      {moodTrend.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-5"
          style={{ borderRadius: '1.25rem' }}
        >
          <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(192,132,252,0.8)' }}>
            MOOD TREND
          </p>
          <MoodChart data={moodTrend} />
        </motion.div>
      )}

      {entries.length === 0 ? (
        <div className="glass text-center py-14" style={{ borderRadius: '1.25rem', borderStyle: 'dashed' }}>
          <p className="text-3xl mb-2">📖</p>
          <p className="text-sm" style={{ color: 'rgba(226,232,240,0.4)' }}>No entries yet</p>
        </div>
      ) : (
        <motion.div className="space-y-3" variants={container} initial="hidden" animate="visible">
          {entries.map(entry => (
            <motion.div
              key={entry.id}
              variants={item}
              className="glass p-5 space-y-3"
              style={{ borderRadius: '1.25rem' }}
              whileHover={{ scale: 1.01, transition: { type: 'spring', stiffness: 400 } }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  {entry.title && (
                    <p className="font-bold" style={{ color: '#E2E8F0' }}>{entry.title}</p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(226,232,240,0.35)' }}>
                    {new Date(entry.createdAt).toLocaleDateString('it-IT', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {entry.mood && (
                    <div
                      className="flex items-center gap-1.5 px-2 py-1 rounded-xl"
                      style={{
                        background: `${MOOD_COLOR[entry.mood]}15`,
                        border: `1px solid ${MOOD_COLOR[entry.mood]}30`,
                      }}
                    >
                      <span className="text-base">{MOOD_EMOJI[entry.mood]}</span>
                      <span className="text-xs font-bold" style={{ color: MOOD_COLOR[entry.mood] }}>
                        {entry.mood}/5
                      </span>
                    </div>
                  )}
                  {entry.source === 'claude_review' && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(147,51,234,0.15)',
                        color: '#C084FC',
                        border: '1px solid rgba(147,51,234,0.25)',
                      }}
                    >
                      AI Review
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm line-clamp-3" style={{ color: 'rgba(226,232,240,0.6)' }}>
                {entry.content}
              </p>

              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map(t => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(226,232,240,0.5)',
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
