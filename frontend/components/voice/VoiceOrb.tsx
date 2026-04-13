'use client';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { useVoiceAssistantStore } from '@/lib/store';
import { VoiceAssistant } from './VoiceAssistant';

const PHASE_GLOW: Record<string, string> = {
  idle:       'rgba(147,51,234,0.5)',
  listening:  'rgba(201,168,76,0.8)',
  thinking:   'rgba(192,132,252,0.6)',
  speaking:   'rgba(134,239,172,0.6)',
  proactive:  'rgba(103,232,249,0.6)',
  confirming: 'rgba(240,201,110,0.6)',
};

export function VoiceOrb() {
  const { isOpen, phase, openVoice } = useVoiceAssistantStore();

  const glow = PHASE_GLOW[phase] ?? PHASE_GLOW.idle;
  const isActive = phase !== 'idle';

  return (
    <>
      {/* Floating action button */}
      {!isOpen && (
        <motion.button
          onClick={openVoice}
          className="fixed bottom-20 right-5 lg:bottom-6 lg:right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #3B0D7A, #9333EA)',
            border: '1px solid rgba(147,51,234,0.5)',
          }}
          animate={{
            boxShadow: isActive
              ? [`0 0 24px ${glow}`, `0 0 56px ${glow}`, `0 0 24px ${glow}`]
              : [`0 0 24px rgba(147,51,234,0.4)`, `0 0 36px rgba(147,51,234,0.65)`, `0 0 24px rgba(147,51,234,0.4)`],
            scale: isActive ? [1, 1.08, 1] : [1, 1.03, 1],
          }}
          transition={{ duration: isActive ? 1.2 : 3, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
        >
          <Mic size={22} color="#fff" />
        </motion.button>
      )}

      {/* Full-screen assistant overlay */}
      <VoiceAssistant />
    </>
  );
}
