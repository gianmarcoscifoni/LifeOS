'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { KanbanBoard } from '@/components/content/KanbanBoard';
import { PageVoiceEntry } from '@/components/voice/PageVoiceEntry';

interface ContentItem {
  id: string;
  title: string;
  status: 'idea' | 'drafting' | 'ready' | 'scheduled' | 'published' | 'archived';
  platform?: string;
  pillar?: string;
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);

  useEffect(() => {
    fetch('/api/proxy/content/queue')
      .then(r => r.ok ? r.json() : [])
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="p-6 space-y-5 max-w-full">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1
          className="text-3xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #C084FC 0%, #E2E8F0 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Content Studio
        </h1>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-xl"
          style={{
            background: 'rgba(147,51,234,0.15)',
            border: '1px solid rgba(147,51,234,0.25)',
            color: '#C084FC',
          }}
        >
          {items.length} items
        </span>
      </motion.div>

      <PageVoiceEntry domain="content" />

      <p className="text-xs" style={{ color: 'rgba(226,232,240,0.35)' }}>
        Drag cards between columns to update status
      </p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <KanbanBoard initialItems={items} />
      </motion.div>
    </div>
  );
}
