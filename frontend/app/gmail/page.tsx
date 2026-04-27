'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signIn } from 'next-auth/react';
import { Mail, RefreshCw, Zap, AlertCircle, Star, Inbox, Loader2 } from 'lucide-react';
import type { GmailMessage } from '@/app/api/gmail/route';

// ── helpers ───────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

// Deterministic hue from string
function colorFromStr(s: string) {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 55%)`;
}

function categorize(msgs: GmailMessage[]) {
  const action: GmailMessage[]  = [];
  const inbox: GmailMessage[]   = [];
  const updates: GmailMessage[] = [];

  for (const m of msgs) {
    const isUpdate =
      m.labelIds.some(l => ['CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_SOCIAL', 'CATEGORY_FORUMS'].includes(l));
    const isAction =
      m.isImportant && m.isUnread &&
      !isUpdate &&
      /reply|action required|confirm|approve|deadline|urgent|asap|follow.?up|invitation/i.test(
        m.subject + ' ' + m.snippet,
      );

    if (isAction)       action.push(m);
    else if (isUpdate)  updates.push(m);
    else                inbox.push(m);
  }

  return { action, inbox, updates };
}

// ── sub-components ────────────────────────────────────────────────────────

function Avatar({ name, email }: { name: string; email: string }) {
  const color = colorFromStr(email);
  return (
    <div
      className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-syne"
      style={{ background: `${color}30`, border: `1.5px solid ${color}50`, color }}
    >
      {initials(name) || '?'}
    </div>
  );
}

function MessageCard({ msg, index }: { msg: GmailMessage; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => setOpen(v => !v)}
      className="cursor-pointer px-4 py-3 rounded-2xl transition-colors"
      style={{
        background: open
          ? 'rgba(147,51,234,0.08)'
          : msg.isUnread
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.025)',
        border: `1px solid ${open ? 'rgba(147,51,234,0.25)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <div className="flex items-start gap-3">
        <Avatar name={msg.fromName} email={msg.from} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span
              className="text-sm font-inter truncate"
              style={{ color: msg.isUnread ? '#E2E8F0' : 'rgba(226,232,240,0.55)', fontWeight: msg.isUnread ? 600 : 400 }}
            >
              {msg.fromName || msg.from}
            </span>
            <span className="text-[10px] font-inter flex-shrink-0" style={{ color: 'rgba(226,232,240,0.3)' }}>
              {timeAgo(msg.date)}
            </span>
          </div>

          <p
            className="text-xs font-inter truncate mb-1"
            style={{ color: msg.isUnread ? 'rgba(226,232,240,0.85)' : 'rgba(226,232,240,0.4)', fontWeight: msg.isUnread ? 500 : 400 }}
          >
            {msg.subject}
          </p>

          <AnimatePresence>
            {!open && (
              <motion.p
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[11px] font-inter truncate"
                style={{ color: 'rgba(226,232,240,0.3)' }}
              >
                {msg.snippet}
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {open && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-[11px] font-inter leading-relaxed mt-1"
                style={{ color: 'rgba(226,232,240,0.45)' }}
              >
                {msg.snippet}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {msg.isUnread && (
            <span className="w-2 h-2 rounded-full" style={{ background: '#9333EA', boxShadow: '0 0 6px rgba(147,51,234,0.8)' }} />
          )}
          {msg.isImportant && (
            <Star size={10} style={{ color: '#C9A84C', fill: '#C9A84C' }} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Section({
  title,
  icon: Icon,
  color,
  messages,
  emptyLabel,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  messages: GmailMessage[];
  emptyLabel: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center gap-2 mb-2 w-full text-left"
      >
        <Icon size={13} style={{ color }} />
        <span className="text-[11px] font-syne font-bold tracking-widest uppercase" style={{ color }}>
          {title}
        </span>
        <span
          className="text-[10px] font-inter px-1.5 py-0.5 rounded-full ml-1"
          style={{ background: `${color}18`, color }}
        >
          {messages.length}
        </span>
        <span className="ml-auto text-[10px] font-inter" style={{ color: 'rgba(226,232,240,0.25)' }}>
          {collapsed ? 'show' : 'hide'}
        </span>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {messages.length === 0 ? (
              <p className="text-[11px] font-inter px-3 py-2" style={{ color: 'rgba(226,232,240,0.2)' }}>
                {emptyLabel}
              </p>
            ) : (
              messages.map((m, i) => <MessageCard key={m.id} msg={m} index={i} />)
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function GmailPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages]   = useState<GmailMessage[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchMail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gmail');
      if (res.status === 401) { setError('not_auth'); return; }
      if (!res.ok) { setError('fetch_failed'); return; }
      const data = await res.json() as { messages: GmailMessage[] };
      setMessages(data.messages ?? []);
      setLastFetch(new Date());
    } catch {
      setError('network');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchMail();
  }, [status, fetchMail]);

  const { action, inbox, updates } = categorize(messages);

  // ── Not signed in ─────────────────────────────────────────────────────
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center"
            style={{ background: 'rgba(147,51,234,0.15)', border: '1.5px solid rgba(147,51,234,0.3)' }}
          >
            <Mail size={36} style={{ color: '#9333EA' }} />
          </div>

          <h1 className="font-syne font-black text-2xl mb-2" style={{ color: '#E2E8F0' }}>
            Connect Gmail
          </h1>
          <p className="font-inter text-sm mb-8" style={{ color: 'rgba(226,232,240,0.45)' }}>
            Sign in with Google so FRIDAY can read your inbox, extract action items, and keep your LifeOS in sync.
          </p>

          <button
            onClick={() => signIn('google')}
            className="flex items-center gap-3 mx-auto px-6 py-3.5 rounded-2xl font-inter font-semibold text-sm transition-all active:scale-95"
            style={{
              background: 'rgba(147,51,234,0.2)',
              border: '1.5px solid rgba(147,51,234,0.4)',
              color: '#E2E8F0',
              boxShadow: '0 0 24px rgba(147,51,234,0.2)',
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="font-inter text-[10px] mt-5" style={{ color: 'rgba(226,232,240,0.2)' }}>
            Read-only access · No emails stored on our servers
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Loading session ────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: '#9333EA' }} />
      </div>
    );
  }

  // ── Authenticated ──────────────────────────────────────────────────────
  return (
    <div className="p-5 max-w-2xl mx-auto pb-24 space-y-5">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-black font-syne tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #C084FC 0%, #E2E8F0 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Inbox Intel
          </h1>
          {lastFetch && (
            <p className="text-[10px] font-inter mt-0.5" style={{ color: 'rgba(226,232,240,0.25)' }}>
              Synced {timeAgo(lastFetch.toISOString())} · {messages.length} messages
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* User avatar */}
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name ?? ''}
              className="w-8 h-8 rounded-full"
              style={{ border: '1.5px solid rgba(147,51,234,0.4)' }}
            />
          ) : null}

          <button
            onClick={fetchMail}
            disabled={loading}
            className="p-2 rounded-xl transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} style={{ color: 'rgba(226,232,240,0.5)' }} />
          </button>
        </div>
      </motion.div>

      {/* Error state */}
      {error && error !== 'not_auth' && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <AlertCircle size={14} style={{ color: '#EF4444' }} />
          <p className="text-xs font-inter" style={{ color: '#EF4444' }}>
            {error === 'network' ? 'Network error — check connection' : 'Failed to load Gmail. Try refreshing.'}
          </p>
        </div>
      )}

      {error === 'not_auth' && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
        >
          <AlertCircle size={14} style={{ color: '#C9A84C' }} />
          <div>
            <p className="text-xs font-inter font-semibold" style={{ color: '#C9A84C' }}>Gmail access expired</p>
            <button onClick={() => signIn('google')} className="text-[11px] font-inter underline" style={{ color: '#C9A84C' }}>
              Re-connect Google account
            </button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && messages.length === 0 && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-2xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.04)', animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && messages.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-inter text-sm" style={{ color: 'rgba(226,232,240,0.35)' }}>All clear — no unread or important mail in the last 3 days</p>
        </div>
      )}

      {/* Email sections */}
      {messages.length > 0 && (
        <div className="space-y-6">
          <Section
            title="Action Required"
            icon={Zap}
            color="#EF4444"
            messages={action}
            emptyLabel="No urgent action items"
          />
          <Section
            title="Inbox"
            icon={Inbox}
            color="#C084FC"
            messages={inbox}
            emptyLabel="No new messages"
          />
          <Section
            title="Updates"
            icon={Mail}
            color="#64748B"
            messages={updates}
            emptyLabel="No updates"
          />
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.705A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.705V4.963H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.037l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.963L3.964 7.295C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
