'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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

export function GlobalLoader() {
  const [phase, setPhase] = useState<'idle' | 'in' | 'exit' | 'done'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('lo_boot')) return;
    sessionStorage.setItem('lo_boot', '1');

    setPhase('in');
    const t1 = setTimeout(() => setPhase('exit'), 1900);
    const t2 = setTimeout(() => setPhase('done'), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === 'idle' || phase === 'done') return null;

  const exiting = phase === 'exit';

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#0A0415' }}
      initial={{ y: 0 }}
      animate={exiting ? { y: '-100%' } : { y: 0 }}
      transition={exiting
        ? { duration: 0.75, ease: [0.76, 0, 0.24, 1], delay: 0.12 }
        : { duration: 0 }
      }
    >
      {/* Deep ambient glow */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: exiting ? 0 : 1 }}
        transition={{ duration: 0.8 }}
      >
        <div
          style={{
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(147,51,234,0.22) 0%, rgba(201,168,76,0.06) 45%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </motion.div>

      {/* Orbit ring */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          border: '1px solid rgba(147,51,234,0.15)',
        }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={exiting
          ? { scale: 2.5, opacity: 0 }
          : { scale: 1, opacity: 1 }
        }
        transition={exiting
          ? { duration: 0.5 }
          : { type: 'spring', stiffness: 80, damping: 18, delay: 0.2 }
        }
      />
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: 300,
          height: 300,
          borderRadius: '50%',
          border: '1px solid rgba(201,168,76,0.08)',
        }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={exiting ? { scale: 2, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={exiting
          ? { duration: 0.5 }
          : { type: 'spring', stiffness: 60, damping: 18, delay: 0.3 }
        }
      />

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            background: i % 2 === 0 ? 'rgba(147,51,234,0.8)' : 'rgba(201,168,76,0.7)',
            left: `calc(50% + ${p.x}px)`,
            top: `calc(50% + ${p.y}px)`,
            boxShadow: i % 2 === 0
              ? '0 0 8px rgba(147,51,234,0.9)'
              : '0 0 8px rgba(201,168,76,0.9)',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={exiting
            ? { opacity: 0, scale: 0 }
            : { opacity: [0, 1, 0.6, 1], scale: 1 }
          }
          transition={{
            delay: p.delay,
            duration: 0.5,
            opacity: { repeat: Infinity, repeatType: 'reverse', duration: 1.8 + i * 0.3 },
          }}
        />
      ))}

      {/* Logo */}
      <motion.div
        className="relative flex flex-col items-center gap-3"
        initial={{ scale: 0.82, opacity: 0, y: 12 }}
        animate={exiting
          ? { opacity: 0, scale: 1.06, y: -8 }
          : { scale: 1, opacity: 1, y: 0 }
        }
        transition={exiting
          ? { duration: 0.35, ease: [0.4, 0, 1, 1] }
          : { type: 'spring', stiffness: 160, damping: 22, delay: 0.18 }
        }
      >
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

        <motion.div
          initial={{ opacity: 0, y: 6, letterSpacing: '0.2em' }}
          animate={exiting ? { opacity: 0 } : { opacity: 1, y: 0, letterSpacing: '0.32em' }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="font-inter text-[10px] uppercase tracking-[0.32em]"
          style={{ color: 'rgba(226,232,240,0.3)' }}
        >
          Personal OS
        </motion.div>

        {/* Underline glow */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={exiting ? { scaleX: 0, opacity: 0 } : { scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5, ease: 'easeOut' }}
          style={{
            height: 1,
            width: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(147,51,234,0.6), rgba(201,168,76,0.4), transparent)',
            transformOrigin: 'center',
            marginTop: 4,
          }}
        />
      </motion.div>

      {/* Version hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={exiting ? { opacity: 0 } : { opacity: 1 }}
        transition={{ delay: 0.85, duration: 0.4 }}
        className="absolute bottom-12 font-inter text-[9px] tracking-[0.2em] uppercase"
        style={{ color: 'rgba(226,232,240,0.15)' }}
      >
        Loading your universe
      </motion.p>
    </motion.div>
  );
}
