'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const EASE_WARP = [0.76, 0, 0.24, 1] as const;
const EASE_OUT  = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  { target: 28,  at: 0   },
  { target: 55,  at: 350 },
  { target: 78,  at: 750 },
  { target: 91,  at: 1150 },
  { target: 100, at: 1550 },
];
const EXIT_AT  = 1700;
const DONE_AT  = 2400;

export function GlobalLoader() {
  const [phase, setPhase]       = useState<'in' | 'exit' | 'done'>('in');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timers = STEPS.map(({ target, at }) =>
      setTimeout(() => setProgress(target), at)
    );
    const tExit = setTimeout(() => setPhase('exit'), EXIT_AT);
    const tDone = setTimeout(() => setPhase('done'), DONE_AT);
    return () => { [...timers, tExit, tDone].forEach(clearTimeout); };
  }, []);

  if (phase === 'done') return null;
  const exiting = phase === 'exit';

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
      style={{ background: '#060010' }}
      animate={exiting ? { y: '-100%' } : { y: 0 }}
      transition={exiting ? { duration: 0.72, ease: EASE_WARP } : { duration: 0 }}
    >
      {/* Ambient radial glow */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: 700, height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(147,51,234,0.14) 0%, transparent 68%)',
          filter: 'blur(72px)',
        }}
      />

      {/* Core block */}
      <motion.div
        className="relative flex flex-col items-center gap-8"
        initial={{ opacity: 0, y: 20 }}
        animate={exiting ? { opacity: 0, y: -12 } : { opacity: 1, y: 0 }}
        transition={exiting
          ? { duration: 0.28, ease: 'easeIn' }
          : { duration: 0.65, ease: EASE_OUT }
        }
      >
        {/* Wordmark */}
        <h1
          className="font-syne font-black tracking-tight"
          style={{
            fontSize: 'clamp(4.5rem, 14vw, 8rem)',
            letterSpacing: '-0.035em',
            lineHeight: 1,
            background: 'linear-gradient(135deg, #9333EA 0%, #C084FC 45%, #C9A84C 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 48px rgba(147,51,234,0.5))',
          }}
        >
          LifeOS
        </h1>

        {/* Progress section */}
        <div className="flex flex-col items-center gap-3" style={{ width: 'clamp(200px, 32vw, 340px)' }}>
          {/* Track */}
          <div
            className="w-full relative overflow-hidden"
            style={{
              height: 2,
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 2,
            }}
          >
            {/* Fill */}
            <motion.div
              className="absolute left-0 top-0 h-full"
              style={{
                borderRadius: 2,
                background: 'linear-gradient(90deg, #7E22CE, #A855F7, #C084FC, #C9A84C)',
                boxShadow: '0 0 14px rgba(192,132,252,0.9)',
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            />
            {/* Shimmer sweep */}
            {!exiting && (
              <motion.div
                className="absolute top-0 h-full"
                style={{
                  width: 60,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                  borderRadius: 2,
                  pointerEvents: 'none',
                }}
                animate={{ left: ['-20%', '120%'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.4 }}
              />
            )}
          </div>

          {/* Labels row */}
          <div className="flex items-center justify-between w-full px-px">
            <motion.span
              className="font-inter uppercase"
              style={{
                fontSize: 9,
                letterSpacing: '0.28em',
                color: progress === 100 ? 'rgba(192,132,252,0.55)' : 'rgba(226,232,240,0.2)',
                transition: 'color 0.4s',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {progress === 100 ? 'Ready' : 'Loading'}
            </motion.span>
            <motion.span
              className="font-inter tabular-nums"
              style={{
                fontSize: 9,
                letterSpacing: '0.05em',
                color: 'rgba(226,232,240,0.18)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {progress}%
            </motion.span>
          </div>
        </div>
      </motion.div>

      {/* Bottom tag */}
      <motion.p
        className="absolute bottom-10 font-inter uppercase"
        style={{ fontSize: 8, letterSpacing: '0.26em', color: 'rgba(226,232,240,0.09)' }}
        initial={{ opacity: 0 }}
        animate={exiting ? { opacity: 0 } : { opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        Personal OS
      </motion.p>
    </motion.div>
  );
}
