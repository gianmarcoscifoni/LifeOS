'use client';
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useVoiceAssistantStore, DOMAIN_COLORS } from '@/lib/store';

// Page-specific ambient particle configs
const PAGE_CONFIG: Record<string, { color: string; particleStyle: 'drift' | 'edge' | 'stars'; count: number }> = {
  '/finance':   { color: '#C9A84C', particleStyle: 'edge',  count: 8 },
  '/habits':    { color: '#86EFAC', particleStyle: 'drift', count: 14 },
  '/career':    { color: '#9333EA', particleStyle: 'stars', count: 10 },
  '/brand':     { color: '#C084FC', particleStyle: 'drift', count: 12 },
  '/journal':   { color: '#94A3B8', particleStyle: 'drift', count: 8 },
  '/gratitude': { color: '#FCD34D', particleStyle: 'drift', count: 10 },
  '/content':   { color: '#67E8F9', particleStyle: 'stars', count: 8 },
  '/levels':    { color: '#F0C96E', particleStyle: 'edge',  count: 10 },
};

function DriftParticles({ color, count }: { color: string; count: number }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 5 + Math.random() * 90,
      y: 10 + Math.random() * 80,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 6,
      duration: 5 + Math.random() * 5,
      drift: (Math.random() - 0.5) * 40,
    }))
  , [count]);

  return (
    <>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: color }}
          animate={{ y: [0, -50, 0], x: [0, p.drift, 0], opacity: [0.05, 0.3, 0.05] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </>
  );
}

function EdgeParticles({ color, count }: { color: string; count: number }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      side: i % 2 === 0 ? 'left' : 'right',
      y: 10 + Math.random() * 80,
      size: 2 + Math.random() * 2.5,
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 4,
    }))
  , [count]);

  return (
    <>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            [p.side]: '1%',
            top: `${p.y}%`,
            width: p.size, height: p.size,
            background: color,
          }}
          animate={{ y: [0, -60, 0], opacity: [0.05, 0.25, 0.05] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </>
  );
}

function StarParticles({ color, count }: { color: string; count: number }) {
  const stars = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      startX: Math.random() * 100,
      endX: Math.random() * 100,
      size: 1.5 + Math.random() * 2,
      delay: Math.random() * 4,
      duration: 1.5 + Math.random() * 2,
    }))
  , [count]);

  return (
    <>
      {stars.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{ left: `${p.startX}%`, top: '-2%', width: p.size, height: p.size * 3, background: color, borderRadius: 1 }}
          animate={{ y: ['0vh', '102vh'], x: [`${p.startX}%`, `${p.endX}%`], opacity: [0, 0.5, 0.5, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </>
  );
}

export function VoiceAmbientGlow() {
  const { isOpen, activeDomain } = useVoiceAssistantStore();
  const pathname = usePathname();

  const pageConf = PAGE_CONFIG[pathname ?? ''] ?? null;
  const glowColor = activeDomain
    ? (DOMAIN_COLORS[activeDomain] ?? '#9333EA')
    : (pageConf?.color ?? '#9333EA');

  const show = isOpen && (activeDomain !== null || pageConf !== null);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="fixed inset-0 pointer-events-none z-30 overflow-hidden"
        >
          {/* Soft radial glow at top */}
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2"
            style={{
              width: 500, height: 300,
              background: `radial-gradient(ellipse at 50% 0%, ${glowColor}18 0%, transparent 70%)`,
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Page-specific particles */}
          {pageConf?.particleStyle === 'drift'  && <DriftParticles color={glowColor} count={pageConf.count} />}
          {pageConf?.particleStyle === 'edge'   && <EdgeParticles  color={glowColor} count={pageConf.count} />}
          {pageConf?.particleStyle === 'stars'  && <StarParticles  color={glowColor} count={pageConf.count} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
