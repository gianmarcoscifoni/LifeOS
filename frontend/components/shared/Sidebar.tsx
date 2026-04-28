'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, Activity, DollarSign,
  Zap, FileText, BookOpen, Bot, Heart, Star, Mail,
  LogIn, LogOut, X, Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { usePathname as usePN } from 'next/navigation';

const navItems = [
  { href: '/',           label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/levels',     label: 'XP & Levels',    icon: Star },
  { href: '/brand',      label: 'Brand RPG',      icon: Zap },
  { href: '/content',    label: 'Content Studio', icon: FileText },
  { href: '/habits',     label: 'Habits',         icon: Activity },
  { href: '/gratitude',  label: 'Gratitude',      icon: Heart },
  { href: '/finance',    label: 'Finance',        icon: DollarSign },
  { href: '/career',     label: 'Career',         icon: Briefcase },
  { href: '/journal',    label: 'Journal',        icon: BookOpen },
  { href: '/claude',     label: 'Ask Claude',     icon: Bot },
  { href: '/gmail',      label: 'Inbox Intel',    icon: Mail },
];

const ACCENT: Record<string, string> = {
  '/gratitude': '#FCD34D',
  '/levels':    '#C9A84C',
};

function UserRow() {
  const { data: session, status } = useSession();
  if (status === 'loading') return null;
  if (!session) {
    return (
      <button
        onClick={() => signIn('google')}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl transition-colors hover:bg-white/5"
        style={{ color: 'rgba(226,232,240,0.35)' }}
      >
        <LogIn size={14} />
        <span className="font-inter text-xs">Sign in with Google</span>
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5">
      {session.user?.image ? (
        <img src={session.user.image} alt="" className="w-7 h-7 rounded-full flex-shrink-0"
          style={{ border: '1.5px solid rgba(147,51,234,0.4)' }} />
      ) : (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ background: 'rgba(147,51,234,0.2)', color: '#9333EA' }}>
          {session.user?.name?.[0]?.toUpperCase() ?? 'G'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-inter text-[11px] font-medium truncate" style={{ color: 'rgba(226,232,240,0.7)' }}>
          {session.user?.name ?? 'User'}
        </p>
        <p className="font-inter text-[10px] truncate" style={{ color: 'rgba(226,232,240,0.25)' }}>Gmail connected</p>
      </div>
      <button onClick={() => signOut()} className="p-1 rounded-lg transition-colors hover:bg-white/5" title="Sign out">
        <LogOut size={12} style={{ color: 'rgba(226,232,240,0.25)' }} />
      </button>
    </div>
  );
}

// ── Drawer content ────────────────────────────────────────────────────────

function DrawerContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-col w-72 h-full py-5 px-3 gap-0.5"
      style={{
        background: 'rgba(10, 4, 21, 0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo + close */}
      <div className="px-3 mb-6 pt-1 flex items-center justify-between">
        <div>
          <h1
            className="font-syne font-extrabold text-2xl tracking-hero"
            style={{
              background: 'linear-gradient(135deg, #9333EA 0%, #C9A84C 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            LifeOS
          </h1>
          <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(226,232,240,0.3)', letterSpacing: '0.1em' }}>
            PERSONAL OS
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl transition-colors hover:bg-white/5"
          style={{ color: 'rgba(226,232,240,0.4)' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const accent = ACCENT[href] ?? '#9333EA';
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-150 group',
                active ? 'text-white' : 'text-white/45 hover:text-white/75',
              )}
            >
              {active && (
                <motion.div
                  layoutId="navPill"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `${accent}18`,
                    border: `1px solid ${accent}30`,
                    boxShadow: `0 0 16px ${accent}20`,
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10 transition-transform duration-150 group-hover:scale-110">
                <Icon size={16} style={active ? { color: accent, filter: `drop-shadow(0 0 5px ${accent}99)` } : {}} />
              </span>
              <span className="relative z-10 font-inter text-sm font-medium">{label}</span>
              {active && (
                <motion.div
                  layoutId="navDot"
                  className="absolute right-3 w-1 h-1 rounded-full z-10"
                  style={{ background: accent, boxShadow: `0 0 6px ${accent}cc` }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="px-3 pt-3 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <UserRow />
        <p className="font-inter text-[10px] text-center" style={{ color: 'rgba(226,232,240,0.2)', letterSpacing: '0.08em' }}>
          HOLD SPACE → VOICE MODE
        </p>
      </div>
    </nav>
  );
}

// ── Hamburger button ──────────────────────────────────────────────────────

export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-90"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(226,232,240,0.6)',
      }}
      aria-label="Open menu"
    >
      <Menu size={16} />
    </button>
  );
}

// ── Drawer (overlay + panel) ──────────────────────────────────────────────

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePN();

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      {/* Hamburger trigger — fixed top-left */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-40 flex items-center justify-center w-9 h-9 rounded-xl transition-all active:scale-90"
        style={{
          background: 'rgba(10,4,21,0.8)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
          color: 'rgba(226,232,240,0.7)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
        whileTap={{ scale: 0.88 }}
        aria-label="Open menu"
      >
        <Menu size={16} />
      </motion.button>

      {/* Drawer overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 left-0 h-full z-50"
            >
              <DrawerContent onClose={() => setOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
