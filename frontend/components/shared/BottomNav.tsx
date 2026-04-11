'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Star, Activity, Heart, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const items = [
  { href: '/',           label: 'Home',     icon: LayoutDashboard },
  { href: '/levels',     label: 'XP',       icon: Star },
  { href: '/habits',     label: 'Habits',   icon: Activity },
  { href: '/gratitude',  label: 'Gratitude',icon: Heart },
  { href: '/claude',     label: 'Claude',   icon: Bot },
];

const ACCENT: Record<string, string> = {
  '/gratitude': '#FCD34D',
  '/levels': '#C9A84C',
};

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'rgba(10, 4, 21, 0.9)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const accent = ACCENT[href] ?? '#C9A84C';
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-2 min-w-[44px] text-[10px] font-inter font-semibold transition-all duration-200',
                active ? 'text-white' : 'text-white/35',
              )}
            >
              {active && (
                <motion.div
                  layoutId="bottomNavPill"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `${accent}12`,
                    border: `1px solid ${accent}25`,
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                <Icon
                  size={22}
                  style={active ? {
                    color: accent,
                    filter: `drop-shadow(0 0 7px ${accent}cc)`,
                  } : {}}
                />
              </span>
              <span className="relative z-10" style={active ? { color: accent } : {}}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
