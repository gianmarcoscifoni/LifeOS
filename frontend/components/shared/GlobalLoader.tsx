'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, type Transition } from 'framer-motion';

type B4 = [number, number, number, number];
const EXPO_OUT: B4  = [0.22, 1, 0.36, 1];
const EXPO_IN: B4   = [0.4, 0, 1, 1];
const WARP_EASE: B4 = [0.76, 0, 0.24, 1];

// ─── Effect A: Cosmic (particles + orbit rings) ────────────────────────────
const PARTICLES = [
  { x: -90, y: -60,  delay: 0.2,  size: 3 },
  { x:  80, y: -80,  delay: 0.35, size: 2 },
  { x: 110, y:  20,  delay: 0.15, size: 4 },
  { x: -70, y:  70,  delay: 0.45, size: 2 },
  { x:  50, y:  90,  delay: 0.3,  size: 3 },
  { x: -110, y: -10, delay: 0.5,  size: 2 },
  { x:  30, y: -110, delay: 0.25, size: 3 },
  { x: -40, y: 110,  delay: 0.4,  size: 2 },
];

function CosmicEffect({ exiting }: { exiting: boolean }) {
  return (
    <>
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: exiting ? 0 : 1 }}
        transition={{ duration: 0.8 }}
      >
        <div style={{
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(147,51,234,0.28) 0%, rgba(201,168,76,0.07) 45%, transparent 70%)',
          filter: 'blur(70px)',
        }} />
      </motion.div>
      {[200, 320].map((size, i) => (
        <motion.div
          key={size}
          className="absolute pointer-events-none"
          style={{
            width: size, height: size, borderRadius: '50%',
            border: `1px solid ${i === 0 ? 'rgba(147,51,234,0.18)' : 'rgba(201,168,76,0.09)'}`,
          }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={exiting ? { scale: 2.5, opacity: 0 } : { scale: 1, opacity: 1 }}
          transition={(exiting
            ? { duration: 0.45 }
            : { type: 'spring', stiffness: 70 - i * 10, damping: 18, delay: 0.2 + i * 0.1 }
          ) as Transition}
        />
      ))}
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.size, height: p.size,
            background: i % 2 === 0 ? 'rgba(147,51,234,0.85)' : 'rgba(201,168,76,0.75)',
            left: `calc(50% + ${p.x}px)`, top: `calc(50% + ${p.y}px)`,
            boxShadow: i % 2 === 0 ? '0 0 8px rgba(147,51,234,0.9)' : '0 0 8px rgba(201,168,76,0.9)',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={exiting ? { opacity: 0, scale: 0 } : { opacity: [0, 1, 0.6, 1], scale: 1 }}
          transition={{
            delay: p.delay, duration: 0.5,
            opacity: { repeat: Infinity, repeatType: 'reverse', duration: 1.8 + i * 0.3 },
          }}
        />
      ))}
    </>
  );
}

// ─── Effect B: Glitch (chromatic aberration + scanlines) ──────────────────
function GlitchEffect({ exiting }: { exiting: boolean }) {
  return (
    <>
      {/* Scanline sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(147,51,234,0.03) 3px, rgba(147,51,234,0.03) 4px)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: exiting ? 0 : 0.6 }}
        transition={{ duration: 0.3 }}
      />
      {/* Horizontal glitch bar */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          height: 2, left: 0, right: 0,
          background: 'linear-gradient(90deg, transparent 10%, rgba(192,132,252,0.8) 40%, rgba(201,168,76,0.6) 60%, transparent 90%)',
          filter: 'blur(1px)',
        }}
        initial={{ top: '30%', opacity: 0 }}
        animate={exiting ? { opacity: 0 } : { top: ['30%', '72%', '18%', '55%'], opacity: [0, 0.9, 0.5, 0] }}
        transition={{ duration: 1.4, delay: 0.2, ease: 'easeInOut' }}
      />
      {/* Second glitch bar */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          height: 1, left: 0, right: 0,
          background: 'rgba(147,51,234,0.5)',
        }}
        initial={{ top: '60%', opacity: 0 }}
        animate={exiting ? { opacity: 0 } : { top: ['60%', '25%', '80%'], opacity: [0, 0.7, 0] }}
        transition={{ duration: 0.9, delay: 0.5, ease: 'easeInOut' }}
      />
      {/* Ambient pulse */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: exiting ? 0 : 1 }}
        transition={{ duration: 0.6 }}
      >
        <div style={{
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(192,132,252,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
      </motion.div>
    </>
  );
}

// Logo glitch text overlay for Effect B
function GlitchLogo({ exiting }: { exiting: boolean }) {
  const baseStyle = {
    fontSize: 'clamp(3.5rem, 10vw, 5.5rem)',
    fontFamily: 'Syne, sans-serif',
    fontWeight: 900,
    letterSpacing: '-0.02em',
    position: 'absolute' as const,
    top: 0, left: 0, width: '100%',
    WebkitTextFillColor: 'transparent',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    userSelect: 'none' as const,
  };
  return (
    <div style={{ position: 'relative' }}>
      {/* Chromatic red ghost */}
      <motion.span
        aria-hidden
        style={{
          ...baseStyle,
          background: 'linear-gradient(135deg, rgba(239,68,68,0.7), rgba(239,68,68,0.4))',
        }}
        initial={{ x: 0, opacity: 0 }}
        animate={exiting ? { opacity: 0 } : { x: [-4, 4, -2, 0], opacity: [0, 0.8, 0.4, 0] }}
        transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
      >
        LifeOS
      </motion.span>
      {/* Chromatic blue ghost */}
      <motion.span
        aria-hidden
        style={{
          ...baseStyle,
          background: 'linear-gradient(135deg, rgba(96,165,250,0.7), rgba(96,165,250,0.4))',
        }}
        initial={{ x: 0, opacity: 0 }}
        animate={exiting ? { opacity: 0 } : { x: [4, -4, 2, 0], opacity: [0, 0.8, 0.4, 0] }}
        transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
      >
        LifeOS
      </motion.span>
    </div>
  );
}

// ─── Effect C: Warp (portal rings + speed lines) ──────────────────────────
const WARP_LINES = Array.from({ length: 16 }, (_, i) => ({
  angle: (i / 16) * 360,
  delay: 0.1 + i * 0.02,
  length: 40 + Math.sin(i * 0.8) * 20,
}));

function WarpEffect({ exiting }: { exiting: boolean }) {
  return (
    <>
      {/* Portal glow core */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: exiting ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(147,51,234,0.9) 0%, rgba(201,168,76,0.3) 60%, transparent 80%)',
            filter: 'blur(18px)',
          }}
          initial={{ scale: 0 }}
          animate={exiting ? { scale: 8, opacity: 0 } : { scale: [0, 1.4, 1] }}
          transition={exiting
            ? { duration: 0.5, ease: WARP_EASE }
            : { duration: 0.6, delay: 0.1, ease: EXPO_OUT }
          }
        />
      </motion.div>
      {/* Expanding portal rings */}
      {[90, 160, 240].map((size, i) => (
        <motion.div
          key={size}
          className="absolute pointer-events-none"
          style={{
            width: size, height: size, borderRadius: '50%',
            border: `${2 - i * 0.5}px solid rgba(147,51,234,${0.6 - i * 0.15})`,
            boxShadow: `0 0 ${12 - i * 3}px rgba(147,51,234,0.4)`,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={exiting
            ? { scale: 4, opacity: 0 }
            : { scale: [0, 1.15, 1], opacity: [0, 1, 0.6] }
          }
          transition={exiting
            ? { duration: 0.4 + i * 0.05 }
            : { duration: 0.55, delay: 0.08 + i * 0.09, ease: EXPO_OUT }
          }
        />
      ))}
      {/* Speed lines */}
      {WARP_LINES.map((line, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: 1.5,
            height: line.length,
            background: 'linear-gradient(to bottom, rgba(147,51,234,0.8), transparent)',
            left: '50%',
            top: '50%',
            transformOrigin: 'top center',
            transform: `rotate(${line.angle}deg) translateX(-50%)`,
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={exiting ? { scaleY: 0, opacity: 0 } : { scaleY: [0, 1, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.5, delay: line.delay, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

// ─── Logo (shared) ─────────────────────────────────────────────────────────
function LogoBlock({ exiting, variant }: { exiting: boolean; variant: number }) {
  const springIn: Transition = { type: 'spring', stiffness: 160, damping: 22, delay: variant === 2 ? 0.35 : 0.18 };
  return (
    <motion.div
      className="relative flex flex-col items-center gap-3"
      initial={variant === 1
        ? { x: -18, opacity: 0, skewX: 4 }
        : { scale: 0.82, opacity: 0, y: 12 }
      }
      animate={exiting
        ? { opacity: 0, scale: 1.06, y: -8 }
        : variant === 1
          ? { x: 0, opacity: 1, skewX: 0 }
          : { scale: 1, opacity: 1, y: 0 }
      }
      transition={exiting
        ? { duration: 0.35, ease: EXPO_IN }
        : variant === 1 ? { duration: 0.55, delay: 0.25, ease: EXPO_OUT } : springIn
      }
    >
      <div style={{ position: 'relative' }}>
        {variant === 1 && <GlitchLogo exiting={exiting} />}
        <h1
          className="font-syne font-extrabold tracking-tight select-none"
          style={{
            fontSize: 'clamp(3.5rem, 10vw, 5.5rem)',
            background: 'linear-gradient(135deg, #9333EA 0%, #C084FC 40%, #C9A84C 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 32px rgba(147,51,234,0.55))',
          }}
        >
          LifeOS
        </h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6, letterSpacing: '0.2em' }}
        animate={exiting ? { opacity: 0 } : { opacity: 1, y: 0, letterSpacing: '0.32em' }}
        transition={{ delay: variant === 2 ? 0.65 : 0.5, duration: 0.5 }}
        className="font-inter text-[10px] uppercase tracking-[0.32em]"
        style={{ color: 'rgba(226,232,240,0.3)' }}
      >
        Personal OS
      </motion.div>

      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={exiting ? { scaleX: 0, opacity: 0 } : { scaleX: 1, opacity: 1 }}
        transition={{ delay: variant === 2 ? 0.7 : 0.55, duration: 0.5, ease: 'easeOut' }}
        style={{
          height: 1, width: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(147,51,234,0.6), rgba(201,168,76,0.4), transparent)',
          transformOrigin: 'center', marginTop: 4,
        }}
      />
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export function GlobalLoader() {
  const [phase, setPhase] = useState<'idle' | 'in' | 'exit' | 'done'>('idle');
  const variant = useRef(Math.floor(Math.random() * 3)); // 0=cosmic 1=glitch 2=warp

  useEffect(() => {
    setPhase('in');
    const t1 = setTimeout(() => setPhase('exit'), 1900);
    const t2 = setTimeout(() => setPhase('done'), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === 'idle' || phase === 'done') return null;
  const exiting = phase === 'exit';
  const v = variant.current;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#0A0415' }}
      initial={{ y: 0 }}
      animate={exiting ? { y: '-100%' } : { y: 0 }}
      transition={exiting
        ? { duration: 0.75, ease: WARP_EASE, delay: 0.12 }
        : { duration: 0 }
      }
    >
      {v === 0 && <CosmicEffect exiting={exiting} />}
      {v === 1 && <GlitchEffect exiting={exiting} />}
      {v === 2 && <WarpEffect exiting={exiting} />}

      <LogoBlock exiting={exiting} variant={v} />

      <motion.p
        initial={{ opacity: 0 }}
        animate={exiting ? { opacity: 0 } : { opacity: 1 }}
        transition={{ delay: 0.85, duration: 0.4 }}
        className="absolute bottom-12 font-inter text-[9px] tracking-[0.2em] uppercase"
        style={{ color: 'rgba(226,232,240,0.15)' }}
      >
        {v === 0 ? 'Loading your universe' : v === 1 ? 'Initializing systems' : 'Entering the portal'}
      </motion.p>
    </motion.div>
  );
}
