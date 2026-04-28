'use client';
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Plus, X } from 'lucide-react';

type Status = 'idea' | 'drafting' | 'ready' | 'scheduled' | 'published' | 'archived';

interface ContentItem {
  id: string;
  title: string;
  status: Status;
  platform?: string;
  pillar?: string;
}

interface Platform { id: string; name: string }

interface KanbanBoardProps {
  initialItems: ContentItem[];
}

const COLUMNS: { key: Status; label: string; accent: string; bg: string }[] = [
  { key: 'idea',      label: '💡 Idea',      accent: 'rgba(192,132,252,0.5)', bg: 'rgba(147,51,234,0.06)' },
  { key: 'drafting',  label: '✍️ Drafting',  accent: 'rgba(96,165,250,0.5)',  bg: 'rgba(59,130,246,0.06)' },
  { key: 'ready',     label: '✅ Ready',      accent: 'rgba(52,211,153,0.5)',  bg: 'rgba(16,185,129,0.06)' },
  { key: 'scheduled', label: '📅 Scheduled', accent: 'rgba(251,191,36,0.5)',  bg: 'rgba(245,158,11,0.06)' },
  { key: 'published', label: '🚀 Published', accent: 'rgba(201,168,76,0.5)',  bg: 'rgba(201,168,76,0.06)' },
  { key: 'archived',  label: '📦 Archived',  accent: 'rgba(255,255,255,0.15)',bg: 'rgba(255,255,255,0.03)' },
];

function KanbanItem({ item }: { item: ContentItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '0.875rem',
        padding: '10px 12px',
      }}
      className="flex items-start gap-2 cursor-default"
      whileHover={{
        scale: 1.02,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 12px rgba(147,51,234,0.12)',
        transition: { type: 'spring', stiffness: 400, damping: 20 },
      }}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 touch-none cursor-grab"
        style={{ color: 'rgba(226,232,240,0.25)' }}
        aria-label="Drag"
      >
        <GripVertical size={13} />
      </button>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-xs font-semibold leading-tight truncate" style={{ color: '#E2E8F0' }}>
          {item.title}
        </p>
        <div className="flex flex-wrap gap-1">
          {item.platform && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(147,51,234,0.15)', color: '#C084FC', border: '1px solid rgba(147,51,234,0.2)' }}
            >
              {item.platform}
            </span>
          )}
          {item.pillar && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full max-w-[90px] truncate"
              style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}
            >
              {item.pillar}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function KanbanBoard({ initialItems }: KanbanBoardProps) {
  const [items, setItems] = useState<ContentItem[]>(initialItems);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [addingTo, setAddingTo] = useState<Status | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPlatformId, setNewPlatformId] = useState('');
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    fetch('/api/proxy/content/platforms')
      .then(r => r.ok ? r.json() : [])
      .then((list: { id: string; name: string }[]) => {
        setPlatforms(list);
        if (list[0]) setNewPlatformId(list[0].id);
      })
      .catch(() => {});
  }, []);

  // Sync when parent data loads
  useEffect(() => { if (initialItems.length > 0) setItems(initialItems); }, [initialItems]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const dragged = items.find(i => i.id === active.id);
    if (!dragged) return;
    const targetCol = COLUMNS.find(c => c.key === over.id);
    const newStatus = targetCol
      ? targetCol.key
      : (items.find(i => i.id === over.id)?.status ?? dragged.status);
    if (newStatus === dragged.status) return;
    setItems(prev => prev.map(i => i.id === dragged.id ? { ...i, status: newStatus } : i));
    fetch(`/api/proxy/content/queue/${dragged.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => {});
  }

  async function addItem() {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/proxy/content/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          platform_id: newPlatformId || undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems(prev => [...prev, {
          id: created.id,
          title: created.title,
          status: 'idea' as Status,
          platform: created.platform_name ?? created.platformName,
        }]);
        setAddingTo(null);
        setNewTitle('');
      }
    } finally { setSaving(false); }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60vh]">
        {COLUMNS.map(col => {
          const colItems = items.filter(i => i.status === col.key);
          const isAdding = addingTo === col.key;
          return (
            <div
              key={col.key}
              className="flex-shrink-0 w-56 flex flex-col rounded-2xl p-3"
              style={{
                background: col.bg,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: `1px solid ${col.accent}`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold" style={{ color: '#E2E8F0' }}>{col.label}</h3>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(226,232,240,0.5)' }}
                  >
                    {colItems.length}
                  </span>
                  {col.key === 'idea' && (
                    <button
                      onClick={() => { setAddingTo(isAdding ? null : col.key); setNewTitle(''); }}
                      className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
                      style={{
                        background: isAdding ? 'rgba(147,51,234,0.3)' : 'rgba(255,255,255,0.06)',
                        color: isAdding ? '#C084FC' : 'rgba(226,232,240,0.4)',
                      }}
                    >
                      {isAdding ? <X size={10} /> : <Plus size={10} />}
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isAdding && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-2 space-y-2 overflow-hidden"
                  >
                    <input
                      autoFocus
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addItem(); if (e.key === 'Escape') setAddingTo(null); }}
                      placeholder="Title…"
                      className="w-full bg-transparent outline-none text-xs"
                      style={{
                        color: '#E2E8F0',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '0.625rem',
                        padding: '7px 10px',
                        background: 'rgba(255,255,255,0.05)',
                      }}
                    />
                    {platforms.length > 0 && (
                      <select
                        value={newPlatformId}
                        onChange={e => setNewPlatformId(e.target.value)}
                        className="w-full text-xs outline-none"
                        style={{
                          color: '#E2E8F0',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.10)',
                          borderRadius: '0.625rem',
                          padding: '6px 10px',
                        }}
                      >
                        {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                    <button
                      onClick={() => addItem()}
                      disabled={saving || !newTitle.trim()}
                      className="w-full py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      style={{
                        background: 'rgba(147,51,234,0.2)',
                        border: '1px solid rgba(147,51,234,0.35)',
                        color: '#C084FC',
                        opacity: saving || !newTitle.trim() ? 0.5 : 1,
                      }}
                    >
                      {saving ? '…' : 'Add'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <SortableContext items={colItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2 flex-1 min-h-[40px]">
                  {colItems.map(item => <KanbanItem key={item.id} item={item} />)}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
