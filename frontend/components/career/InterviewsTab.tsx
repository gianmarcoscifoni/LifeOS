'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Upload, Trash2, ChevronDown, ChevronUp,
  Building2, Calendar, Star, Loader2, X, FileText,
  CheckCircle2, AlertCircle, Clock, TrendingUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Types ─────────────────────────────────────────────────────────────────

interface QAPair {
  id: string;
  question: string;
  answer: string;
  topic: string | null;
  quality_score: number | null;
  ai_feedback: string | null;
  sort_order: number;
}

interface Interview {
  id: string;
  company: string;
  role: string;
  date: string;   // "YYYY-MM-DD"
  status: string;
  notes: string | null;
  created_at: string;
  qa_pairs: QAPair[];
}

// ── Constants ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled: { label: 'Scheduled', color: '#C084FC', icon: <Clock size={10} /> },
  done:      { label: 'Done',      color: '#34D399', icon: <CheckCircle2 size={10} /> },
  offer:     { label: 'Offer',     color: '#FCD34D', icon: <Star size={10} /> },
  rejected:  { label: 'Rejected',  color: '#EF4444', icon: <AlertCircle size={10} /> },
  ghosted:   { label: 'Ghosted',   color: '#64748B', icon: <X size={10} /> },
};

const TOPIC_COLOR: Record<string, string> = {
  Technical:     '#60A5FA',
  Behavioral:    '#A78BFA',
  Process:       '#34D399',
  Security:      '#F87171',
  Architecture:  '#FBBF24',
  'Soft Skills': '#FB923C',
  Other:         '#94A3B8',
};

function qualityColor(s: number | null) {
  if (!s) return '#64748B';
  if (s >= 4) return '#34D399';
  if (s >= 3) return '#FBBF24';
  return '#EF4444';
}

// ── File reading ──────────────────────────────────────────────────────────

async function readFileAsText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer();
    const wb  = XLSX.read(buf, { type: 'array' });
    return wb.SheetNames.map(n => {
      const ws  = wb.Sheets[n];
      const csv = XLSX.utils.sheet_to_csv(ws);
      return `[Sheet: ${n}]\n${csv}`;
    }).join('\n\n');
  }

  return file.text();
}

// ── Sub-components ────────────────────────────────────────────────────────

function QACard({ qa, index }: { qa: QAPair; index: number }) {
  const [open, setOpen] = useState(false);
  const topicColor = TOPIC_COLOR[qa.topic ?? 'Other'] ?? TOPIC_COLOR.Other;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <span
          className="text-[10px] font-bold font-syne mt-0.5 px-1.5 py-0.5 rounded-md flex-shrink-0"
          style={{ background: `${topicColor}15`, color: topicColor, border: `1px solid ${topicColor}30` }}
        >
          {qa.topic ?? 'Other'}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-inter font-medium leading-snug" style={{ color: '#E2E8F0' }}>
            {qa.question}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          {qa.quality_score !== null && (
            <span
              className="text-[11px] font-bold font-syne"
              style={{ color: qualityColor(qa.quality_score) }}
            >
              {qa.quality_score}/5
            </span>
          )}
          {open ? <ChevronUp size={13} style={{ color: 'rgba(226,232,240,0.3)' }} />
                : <ChevronDown size={13} style={{ color: 'rgba(226,232,240,0.3)' }} />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 space-y-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-sm font-inter leading-relaxed pt-3" style={{ color: 'rgba(226,232,240,0.65)' }}>
              {qa.answer || '—'}
            </p>
            {qa.ai_feedback && (
              <div
                className="flex items-start gap-2 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.15)' }}
              >
                <TrendingUp size={12} className="mt-0.5 flex-shrink-0" style={{ color: '#C084FC' }} />
                <p className="text-[11px] font-inter" style={{ color: '#C084FC' }}>{qa.ai_feedback}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InterviewCard({ iv, onDelete, onImport }: {
  iv: Interview;
  onDelete: (id: string) => void;
  onImport: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CFG[iv.status] ?? STATUS_CFG.scheduled;

  const avgScore = iv.qa_pairs.length > 0
    ? iv.qa_pairs.reduce((s, q) => s + (q.quality_score ?? 0), 0) / iv.qa_pairs.filter(q => q.quality_score).length
    : null;

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header row */}
      <div className="px-5 py-4 flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${cfg.color}15`, border: `1.5px solid ${cfg.color}30` }}
        >
          <Building2 size={16} style={{ color: cfg.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-syne font-bold text-sm" style={{ color: '#E2E8F0' }}>{iv.company}</p>
            <span
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}25` }}
            >
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <p className="text-xs font-inter mt-0.5" style={{ color: 'rgba(226,232,240,0.45)' }}>{iv.role}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] font-inter" style={{ color: 'rgba(226,232,240,0.3)' }}>
              <Calendar size={10} /> {iv.date}
            </span>
            {iv.qa_pairs.length > 0 && (
              <span className="text-[10px] font-inter" style={{ color: 'rgba(226,232,240,0.3)' }}>
                {iv.qa_pairs.length} Q&As
              </span>
            )}
            {avgScore && (
              <span className="text-[10px] font-bold" style={{ color: qualityColor(Math.round(avgScore)) }}>
                avg {avgScore.toFixed(1)}/5
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onImport(iv.id)}
            className="p-2 rounded-xl transition-all active:scale-90"
            style={{ background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.2)' }}
            title="Import transcript"
          >
            <Upload size={13} style={{ color: '#C084FC' }} />
          </button>
          {iv.qa_pairs.length > 0 && (
            <button
              onClick={() => setOpen(v => !v)}
              className="p-2 rounded-xl transition-all active:scale-90"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {open
                ? <ChevronUp size={13} style={{ color: 'rgba(226,232,240,0.5)' }} />
                : <ChevronDown size={13} style={{ color: 'rgba(226,232,240,0.5)' }} />}
            </button>
          )}
          <button
            onClick={() => onDelete(iv.id)}
            className="p-2 rounded-xl transition-all active:scale-90"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <Trash2 size={13} style={{ color: '#EF4444' }} />
          </button>
        </div>
      </div>

      {/* Q&A accordion */}
      <AnimatePresence>
        {open && iv.qa_pairs.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 space-y-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="pt-3 space-y-2">
              {iv.qa_pairs.map((qa, i) => <QACard key={qa.id} qa={qa} index={i} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── New Interview Modal ───────────────────────────────────────────────────

function NewInterviewModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (iv: Interview) => void;
}) {
  const [company, setCompany] = useState('');
  const [role, setRole]       = useState('');
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus]   = useState('scheduled');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!company.trim() || !role.trim()) return;
    setLoading(true);
    const res = await fetch('/api/proxy/career/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: company.trim(), role: role.trim(), date, status }),
    });
    if (res.ok) {
      const iv = await res.json() as Interview;
      onCreate(iv);
      onClose();
    }
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm p-6 rounded-3xl space-y-4"
        style={{ background: '#0F0720', border: '1px solid rgba(192,132,252,0.25)' }}
      >
        <h2 className="font-syne font-bold text-lg" style={{ color: '#E2E8F0' }}>New Interview</h2>

        {[
          { label: 'Company', value: company, set: setCompany, placeholder: 'e.g. Google' },
          { label: 'Role',    value: role,    set: setRole,    placeholder: 'e.g. Senior Engineer' },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label}>
            <label className="text-[10px] font-syne font-bold tracking-widest uppercase mb-1 block" style={{ color: 'rgba(226,232,240,0.4)' }}>
              {label}
            </label>
            <input
              value={value}
              onChange={e => set(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-inter outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#E2E8F0',
              }}
            />
          </div>
        ))}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] font-syne font-bold tracking-widest uppercase mb-1 block" style={{ color: 'rgba(226,232,240,0.4)' }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-inter outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0', colorScheme: 'dark' }}
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-syne font-bold tracking-widest uppercase mb-1 block" style={{ color: 'rgba(226,232,240,0.4)' }}>
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-inter outline-none"
              style={{ background: '#0F0720', border: '1px solid rgba(255,255,255,0.1)', color: '#E2E8F0' }}
            >
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={loading || !company.trim() || !role.trim()}
          className="w-full py-3 rounded-2xl font-syne font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
          style={{ background: 'rgba(192,132,252,0.2)', border: '1.5px solid rgba(192,132,252,0.4)', color: '#C084FC' }}
        >
          {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Create Interview'}
        </button>
      </motion.div>
    </div>
  );
}

// ── Import Modal ──────────────────────────────────────────────────────────

function ImportModal({ interviewId, onClose, onDone }: {
  interviewId: string;
  onClose: () => void;
  onDone: (iv: Interview) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState<File | null>(null);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const inputRef                = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    setFile(f);
    setError('');
    const t = await readFileAsText(f);
    setText(t);
  }

  async function doImport() {
    const raw = text.trim();
    if (!raw) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/proxy/career/interviews/${interviewId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_transcript: raw }),
      });
      if (!res.ok) { setError('Import failed — check API key'); return; }
      const iv = await res.json() as Interview;
      onDone(iv);
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md p-6 rounded-3xl space-y-4"
        style={{ background: '#0F0720', border: '1px solid rgba(192,132,252,0.25)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-syne font-bold text-lg" style={{ color: '#E2E8F0' }}>Import Transcript</h2>
          <button onClick={onClose}><X size={16} style={{ color: 'rgba(226,232,240,0.4)' }} /></button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={async e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-2 py-8 rounded-2xl cursor-pointer transition-all"
          style={{
            background: dragging ? 'rgba(192,132,252,0.1)' : 'rgba(255,255,255,0.03)',
            border: `2px dashed ${dragging ? 'rgba(192,132,252,0.5)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <FileText size={28} style={{ color: file ? '#C084FC' : 'rgba(226,232,240,0.2)' }} />
          <p className="text-sm font-inter" style={{ color: file ? '#C084FC' : 'rgba(226,232,240,0.35)' }}>
            {file ? file.name : 'Drop or click to upload'}
          </p>
          <p className="text-[10px] font-inter" style={{ color: 'rgba(226,232,240,0.2)' }}>
            .txt · .csv · .xlsx · .xls
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.csv,.xlsx,.xls"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {/* Or paste */}
        <div>
          <label className="text-[10px] font-syne font-bold tracking-widest uppercase mb-1 block" style={{ color: 'rgba(226,232,240,0.3)' }}>
            Or paste transcript
          </label>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setFile(null); }}
            rows={5}
            placeholder="Paste raw transcript here…"
            className="w-full px-3 py-2.5 rounded-xl text-sm font-inter outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#E2E8F0' }}
          />
        </div>

        {error && (
          <p className="text-xs font-inter" style={{ color: '#EF4444' }}>{error}</p>
        )}

        <button
          onClick={doImport}
          disabled={loading || !text.trim()}
          className="w-full py-3 rounded-2xl font-syne font-bold text-sm transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'rgba(192,132,252,0.2)', border: '1.5px solid rgba(192,132,252,0.4)', color: '#C084FC' }}
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Analyzing with Claude…</>
            : <><Upload size={14} /> Extract Q&As</>}
        </button>
      </motion.div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function InterviewsTab() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showNew, setShowNew]       = useState(false);
  const [importId, setImportId]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/proxy/career/interviews');
    if (res.ok) setInterviews(await res.json() as Interview[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    await fetch(`/api/proxy/career/interviews/${id}`, { method: 'DELETE' });
    setInterviews(prev => prev.filter(i => i.id !== id));
  }

  function handleCreate(iv: Interview) {
    setInterviews(prev => [iv, ...prev]);
  }

  function handleImportDone(updated: Interview) {
    setInterviews(prev => prev.map(i => i.id === updated.id ? updated : i));
  }

  const byStatus = (s: string) => interviews.filter(i => i.status === s).length;

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <div
            key={k}
            className="px-3 py-2.5 rounded-xl text-center"
            style={{ background: `${v.color}0D`, border: `1px solid ${v.color}20` }}
          >
            <p className="text-lg font-bold font-syne" style={{ color: v.color }}>{byStatus(k)}</p>
            <p className="text-[9px] font-inter tracking-wide uppercase" style={{ color: `${v.color}90` }}>{v.label}</p>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-syne font-semibold" style={{ color: 'rgba(226,232,240,0.5)' }}>
          {interviews.length} interview{interviews.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold font-syne transition-all active:scale-95"
          style={{ background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.35)', color: '#C084FC' }}
        >
          <Plus size={13} /> New Interview
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : interviews.length === 0 ? (
        <div className="text-center py-14">
          <p className="text-3xl mb-2">🎤</p>
          <p className="text-sm font-inter" style={{ color: 'rgba(226,232,240,0.3)' }}>
            No interviews yet — add one and import the transcript
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map(iv => (
            <InterviewCard
              key={iv.id}
              iv={iv}
              onDelete={handleDelete}
              onImport={id => setImportId(id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showNew && (
        <NewInterviewModal onClose={() => setShowNew(false)} onCreate={handleCreate} />
      )}
      {importId && (
        <ImportModal
          interviewId={importId}
          onClose={() => setImportId(null)}
          onDone={updated => { handleImportDone(updated); setImportId(null); }}
        />
      )}
    </div>
  );
}
