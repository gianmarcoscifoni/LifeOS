'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Check, X } from 'lucide-react';
import { loadTop10Goals, saveTop10Goals, addTop10Goal, type Top10Goal } from '@/lib/goalSession';

const AREA_COLOR: Record<string, string> = {
  career:        '#9333EA',
  habits:        '#86EFAC',
  finance:       '#C9A84C',
  health:        '#F0C96E',
  brand:         '#C084FC',
  relationships: '#67E8F9',
};

const AREAS = Object.keys(AREA_COLOR);

function areaColor(area: string) {
  return AREA_COLOR[area?.toLowerCase()] ?? '#94A3B8';
}

interface SortableItemProps {
  goal: Top10Goal;
  rank: number;
  onUpdateProgress: (id: string, pct: number) => void;
  onDelete: (id: string) => void;
}

function SortableItem({ goal, rank, onUpdateProgress, onDelete }: SortableItemProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: goal.id });

  const color = areaColor(goal.area);

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: rank * 0.04 }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.7 : 1,
        background: isDragging ? `${color}14` : `${color}08`,
        border: `1px solid ${isDragging ? color + '40' : color + '18'}`,
        boxShadow: isDragging ? `0 8px 24px rgba(0,0,0,0.4)` : undefined,
      }}
      className="flex items-center gap-3 px-3 py-3 rounded-xl"
    >
      {/* Rank */}
      <span
        className="text-xl font-black font-syne shrink-0 w-7 text-center"
        style={{ color: rank <= 3 ? color : 'rgba(226,232,240,0.25)' }}
      >
        {rank}
      </span>

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0 touch-none"
        style={{ color: 'rgba(226,232,240,0.2)' }}
      >
        <GripVertical size={16} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-medium truncate" style={{ color: 'rgba(226,232,240,0.9)' }}>
          {goal.title}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase"
            style={{ background: `${color}15`, color }}>
            {goal.area}
          </span>
          {/* Progress slider */}
          <input
            type="range"
            min={0}
            max={100}
            value={goal.progressPct}
            onChange={e => onUpdateProgress(goal.id, Number(e.target.value))}
            className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: color }}
          />
          <span className="text-[10px] font-bold shrink-0" style={{ color, minWidth: 28, textAlign: 'right' }}>
            {goal.progressPct}%
          </span>
        </div>
        {/* Progress bar visual */}
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${goal.progressPct}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
          />
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(goal.id)}
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-opacity opacity-40 hover:opacity-100"
        style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}
      >
        <X size={11} />
      </button>
    </motion.div>
  );
}

interface AddGoalFormProps {
  onAdd: (title: string, area: string) => void;
  onCancel: () => void;
}

function AddGoalForm({ onAdd, onCancel }: AddGoalFormProps) {
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('career');

  function submit() {
    if (!title.trim()) return;
    onAdd(title.trim(), area);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-3 px-4 py-4 rounded-xl"
      style={{ background: 'rgba(147,51,234,0.08)', border: '1px solid rgba(147,51,234,0.25)' }}
    >
      <input
        type="text"
        placeholder="Titolo del goal…"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
        autoFocus
        className="w-full bg-transparent text-sm outline-none"
        style={{ color: 'rgba(226,232,240,0.9)' }}
      />
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap gap-1.5 flex-1">
          {AREAS.map(a => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className="text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wide"
              style={{
                background: area === a ? `${areaColor(a)}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${area === a ? areaColor(a) + '60' : 'rgba(255,255,255,0.08)'}`,
                color: area === a ? areaColor(a) : 'rgba(226,232,240,0.4)',
              }}
            >
              {a}
            </button>
          ))}
        </div>
        <button
          onClick={submit}
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(147,51,234,0.3)', color: '#C084FC' }}
        >
          <Check size={13} />
        </button>
        <button
          onClick={onCancel}
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.4)' }}
        >
          <X size={13} />
        </button>
      </div>
    </motion.div>
  );
}

interface Top10GoalsProps {
  year: number;
}

export function Top10Goals({ year }: Top10GoalsProps) {
  const [goals, setGoals] = useState<Top10Goal[]>([]);
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setGoals(loadTop10Goals(year));
  }, [year]);

  function persist(updated: Top10Goal[]) {
    setGoals(updated);
    saveTop10Goals(year, updated);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = goals.findIndex(g => g.id === active.id);
    const newIdx = goals.findIndex(g => g.id === over.id);
    const reordered = arrayMove(goals, oldIdx, newIdx).map((g, i) => ({ ...g, order: i }));
    persist(reordered);
  }

  function handleUpdateProgress(id: string, pct: number) {
    persist(goals.map(g => g.id === id ? { ...g, progressPct: pct } : g));
  }

  function handleDelete(id: string) {
    persist(goals.filter(g => g.id !== id).map((g, i) => ({ ...g, order: i })));
  }

  function handleAdd(title: string, area: string) {
    if (goals.length >= 10) return;
    const updated = addTop10Goal(year, title, area);
    setGoals(loadTop10Goals(year));
    setAdding(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: 'rgba(226,232,240,0.3)' }}>
          Top 10 · {year}
        </p>
        {goals.length < 10 && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: 'rgba(147,51,234,0.12)',
              border: '1px solid rgba(147,51,234,0.3)',
              color: '#C084FC',
            }}
          >
            <Plus size={12} />
            Aggiungi
          </button>
        )}
      </div>

      <AnimatePresence>
        {adding && (
          <AddGoalForm
            onAdd={handleAdd}
            onCancel={() => setAdding(false)}
          />
        )}
      </AnimatePresence>

      {goals.length === 0 && !adding ? (
        <div className="py-12 text-center rounded-2xl space-y-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <p className="text-2xl">🎯</p>
          <p className="text-sm" style={{ color: 'rgba(226,232,240,0.3)' }}>
            Nessun goal annuale impostato
          </p>
          <button
            onClick={() => setAdding(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold"
            style={{
              background: 'rgba(147,51,234,0.15)',
              border: '1px solid rgba(147,51,234,0.3)',
              color: '#C084FC',
            }}
          >
            Imposta il tuo primo goal
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={goals.map(g => g.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence>
              {goals.map((goal, i) => (
                <SortableItem
                  key={goal.id}
                  goal={goal}
                  rank={i + 1}
                  onUpdateProgress={handleUpdateProgress}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
      )}

      {goals.length > 0 && goals.length < 10 && !adding && (
        <div
          className="flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer transition-all hover:opacity-80"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.08)',
            color: 'rgba(226,232,240,0.25)',
          }}
          onClick={() => setAdding(true)}
        >
          <Plus size={13} />
          <span className="text-xs">Slot {goals.length + 1}–10 disponibili</span>
        </div>
      )}
    </div>
  );
}
