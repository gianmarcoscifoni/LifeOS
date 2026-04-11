'use client';
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { GripVertical } from 'lucide-react';

type Status = 'idea' | 'drafting' | 'ready' | 'scheduled' | 'published' | 'archived';

interface ContentItem {
  id: string;
  title: string;
  status: Status;
  platform?: string;
  pillar?: string;
}

interface KanbanBoardProps {
  initialItems: ContentItem[];
}

const COLUMNS: {
  key: Status;
  label: string;
  accent: string;
  bg: string;
}[] = [
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

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        ...style,
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60vh]">
        {COLUMNS.map(col => {
          const colItems = items.filter(i => i.status === col.key);
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
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(226,232,240,0.5)' }}
                >
                  {colItems.length}
                </span>
              </div>
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
