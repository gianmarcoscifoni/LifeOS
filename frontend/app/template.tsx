'use client';
import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, filter: 'blur(8px)', scale: 0.99 }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        opacity: { duration: 0.35 },
        filter: { duration: 0.3 },
        scale: { duration: 0.4 },
      }}
    >
      {children}
    </motion.div>
  );
}
