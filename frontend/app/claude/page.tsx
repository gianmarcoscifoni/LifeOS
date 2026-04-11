import { ClaudeChat } from '@/components/claude/ClaudeChat';
import { motion } from 'framer-motion';

// This page is a Client Component because ClaudeChat uses hooks
export default function ClaudePage() {
  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] lg:h-screen p-6 gap-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-2">
        <span
          className="text-2xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #9333EA 0%, #C9A84C 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 200%',
            animation: 'gradientShift 5s ease infinite',
          }}
        >
          Ask Claude
        </span>
        <span className="text-sm" style={{ color: 'rgba(226,232,240,0.35)' }}>
          — Il tuo consigliere AI 🤌
        </span>
      </div>
      <ClaudeChat />
    </div>
  );
}
