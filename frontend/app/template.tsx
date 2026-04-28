'use client';
import { useRef } from 'react';
import { motion } from 'framer-motion';

type BezierTuple = [number, number, number, number];
const EXPO_OUT: BezierTuple = [0.22, 1, 0.36, 1];
const SPRING_OUT: BezierTuple = [0.34, 1.56, 0.64, 1];

const VARIANTS = [
  // 0: Lift + blur (cinematic)
  {
    initial: { opacity: 0, y: 22, filter: 'blur(8px)', scale: 0.99 },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 },
    transition: {
      duration: 0.5, ease: EXPO_OUT,
      opacity: { duration: 0.35 },
      filter: { duration: 0.3 },
      scale: { duration: 0.45 },
    },
  },
  // 1: Slide in from left + fade
  {
    initial: { opacity: 0, x: -28, filter: 'blur(5px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
    transition: {
      duration: 0.48, ease: EXPO_OUT,
      opacity: { duration: 0.32 },
      filter: { duration: 0.28 },
    },
  },
  // 2: Scale up from center + bloom fade
  {
    initial: { opacity: 0, scale: 0.96, filter: 'blur(6px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    transition: {
      duration: 0.52, ease: EXPO_OUT,
      opacity: { duration: 0.38 },
      filter: { duration: 0.32 },
      scale: { duration: 0.5, ease: SPRING_OUT },
    },
  },
] as const;

export default function Template({ children }: { children: React.ReactNode }) {
  const v = useRef(VARIANTS[Math.floor(Math.random() * VARIANTS.length)]);
  const { initial, animate, transition } = v.current;

  return (
    <motion.div initial={initial} animate={animate} transition={transition}>
      {children}
    </motion.div>
  );
}
