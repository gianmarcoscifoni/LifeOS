'use client';
import {
  DndContext, DragEndEvent, DragOverEvent, PointerSensor,
  useSensor, useSensors, closestCenter, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Plus, X } from 'lucide-react';

type Status = 'idea' | 'drafting' | 'ready' | 'scheduled' | 'published' | 'archived';

// ── Platform icons ────────────────────────────────────────────────────────

const PLATFORM_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  linkedin: {
    label: 'LinkedIn',
    color: '#0A66C2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
  },
  youtube: {
    label: 'YouTube',
    color: '#FF0000',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  github: {
    label: 'GitHub',
    color: '#E2E8F0',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ),
  },
  twitter: {
    label: 'Twitter',
    color: '#1DA1F2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  x: {
    label: 'X',
    color: '#E2E8F0',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  tiktok: {
    label: 'TikTok',
    color: '#69C9D0',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.78a4.85 4.85 0 01-1.01-.09z"/>
      </svg>
    ),
  },
  medium: {
    label: 'Medium',
    color: '#E2E8F0',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
        <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
      </svg>
    ),
  },
};

function PlatformBadge({ name }: { name: string }) {
  const key = name.toLowerCase().replace(/\s+/g, '');
  const meta = PLATFORM_META[key];
  const color = meta?.color ?? 'rgba(192,132,252,0.8)';
  return (
    <span
      className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}40`,
        color,
      }}
    >
      {meta && <span style={{ color }}>{meta.icon}</span>}
      {name}
    </span>
  );
}

interface ContentItem {
  id: string;
  title: string;
  status: Status;
  platform?: string;
  pillar?: string;
}

const ALL_PLATFORMS = Object.entries(PLATFORM_META).map(([key, v]) => ({ key, label: v.label, color: v.color, icon: v.icon }));

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

function DroppableColumn({ id, children, style, className }: {
  id: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={className}
      style={{
        ...style,
        outline: isOver ? '1.5px solid rgba(147,51,234,0.5)' : undefined,
        transition: 'outline 0.15s',
      }}
    >
      {children}
    </div>
  );
}

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
          {item.platform && <PlatformBadge name={item.platform} />}
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
  const [addingTo, setAddingTo] = useState<Status | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPlatformKey, setNewPlatformKey] = useState(ALL_PLATFORMS[0]?.key ?? '');
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Sync when parent data loads
  useEffect(() => { if (initialItems.length > 0) setItems(initialItems); }, [initialItems]);

  function resolveStatus(overId: string, fallback: Status): Status {
    if (COLUMNS.some(c => c.key === overId)) return overId as Status;
    return items.find(i => i.id === overId)?.status ?? fallback;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const dragged = items.find(i => i.id === active.id);
    if (!dragged) return;
    const newStatus = resolveStatus(String(over.id), dragged.status);
    if (newStatus !== dragged.status) {
      setItems(prev => prev.map(i => i.id === dragged.id ? { ...i, status: newStatus } : i));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const dragged = items.find(i => i.id === active.id);
    if (!dragged) return;
    const finalStatus = over ? resolveStatus(String(over.id), dragged.status) : dragged.status;
    fetch(`/api/proxy/content/queue/${dragged.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: finalStatus }),
    }).catch(() => {});
  }

  async function addItem() {
    if (!newTitle.trim()) return;
    setSaving(true);
    const platformLabel = PLATFORM_META[newPlatformKey]?.label ?? newPlatformKey;
    try {
      const res = await fetch('/api/proxy/content/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          platform_name: platformLabel,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems(prev => [...prev, {
          id: created.id,
          title: created.title,
          status: 'idea' as Status,
          platform: created.platform_name ?? created.platformName ?? platformLabel,
        }]);
        setAddingTo(null);
        setNewTitle('');
      }
    } finally { setSaving(false); }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60vh]">
        {COLUMNS.map(col => {
          const colItems = items.filter(i => i.status === col.key);
          const isAdding = addingTo === col.key;
          return (
            <DroppableColumn
              key={col.key}
              id={col.key}
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
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_PLATFORMS.map(p => {
                        const active = newPlatformKey === p.key;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => setNewPlatformKey(p.key)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all"
                            style={{
                              background: active ? `${p.color}22` : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${active ? p.color + '60' : 'rgba(255,255,255,0.08)'}`,
                              color: active ? p.color : 'rgba(226,232,240,0.35)',
                            }}
                          >
                            <span style={{ color: active ? p.color : 'rgba(226,232,240,0.25)' }}>{p.icon}</span>
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
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
            </DroppableColumn>
          );
        })}
      </div>
    </DndContext>
  );
}
