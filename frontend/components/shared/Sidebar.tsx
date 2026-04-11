'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, Activity, DollarSign,
  Zap, FileText, BookOpen, Bot, Heart, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-col w-64 h-screen py-5 px-3 gap-0.5"
      style={{
        background: 'rgba(10, 4, 21, 0.8)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="px-3 mb-6 pt-1">
        <h1
          className="font-syne font-extrabold text-2xl tracking-hero"
          style={{
            background: 'linear-gradient(135deg, #9333EA 0%, #C9A84C 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 200%',
            animation: 'gradientShift 5s ease infinite',
          }}
        >
          LifeOS
        </h1>
        <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(226,232,240,0.3)', letterSpacing: '0.1em' }}>
          DIGITAL AURA
        </p>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
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
                    background: 'rgba(147, 51, 234, 0.18)',
                    border: '1px solid rgba(147, 51, 234, 0.3)',
                    boxShadow: '0 0 16px rgba(147, 51, 234, 0.2)',
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10 transition-transform duration-150 group-hover:scale-110">
                <Icon
                  size={16}
                  style={active ? {
                    color: href === '/gratitude' ? '#FCD34D' : href === '/levels' ? '#C9A84C' : '#9333EA',
                    filter: `drop-shadow(0 0 5px ${href === '/gratitude' ? 'rgba(252,211,77,0.7)' : href === '/levels' ? 'rgba(201,168,76,0.7)' : 'rgba(147,51,234,0.7)'})`,
                  } : {}}
                />
              </span>
              <span
                className="relative z-10 font-inter text-sm font-medium"
                style={active ? { letterSpacing: '-0.01em' } : {}}
              >
                {label}
              </span>
              {active && (
                <motion.div
                  layoutId="navDot"
                  className="absolute right-3 w-1 h-1 rounded-full z-10"
                  style={{
                    background: href === '/gratitude' ? '#FCD34D' : '#C9A84C',
                    boxShadow: `0 0 6px ${href === '/gratitude' ? 'rgba(252,211,77,0.8)' : 'rgba(201,168,76,0.8)'}`,
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom hint */}
      <div className="px-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="font-inter text-[10px] text-center" style={{ color: 'rgba(226,232,240,0.2)', letterSpacing: '0.08em' }}>
          HOLD SPACE → VOICE MODE
        </p>
      </div>
    </nav>
  );
}
